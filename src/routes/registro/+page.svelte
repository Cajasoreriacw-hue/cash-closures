<script lang="ts">
	import { onMount } from 'svelte';
	import { Toast } from 'flowbite-svelte';
	import { goto } from '$app/navigation';
	//const AlertAny = Alert as any;
	import {
		getCashiers,
		getStoresData,
		checkExistingClosure,
		createClosure,
		type ChannelData,
		type EnvelopeData,
		type Store
	} from '$lib/services/closures';
	import { Logger } from '$lib/utils/logger';

	let { data } = $props();
	let { supabase } = $derived(data);

	let date: string = $state(new Date().toISOString().slice(0, 10));
	let note = $state('');
	let cashier = $state('');
	let store = $state('');

	let cashiers: string[] = $state([]);
	let stores: Store[] = $state([]);
	let loadingOptions = $state(true);
	let optionsError: string | null = $state(null);

	let dataphone: ChannelData = $state({ name: 'dataphone', system: 0, real: 0 });
	let rappi: ChannelData = $state({ name: 'rappi', system: 0, real: 0 });
	let justo: ChannelData = $state({ name: 'justo', system: 0, real: 0 });
	let appartaPay: ChannelData = $state({ name: 'apparta_pay', system: 0, real: 0 });
	let nequi: ChannelData = $state({ name: 'transferencia_nequi', system: 0, real: 0 });
	let bancolombia: ChannelData = $state({ name: 'transferencia_bancolombia', system: 0, real: 0 });

	let showOtherMethods = $state(false);

	// Efectivo breakdown
	let efectivoBase = $state(0);
	let efectivoVentas = $state(0);
	let efectivoGastos = $state(0);
	let efectivoIngresos = $state(0);
	let efectivoEgresos = $state(0);
	let efectivoReal = $state(0);

	// Envelopes (Automatic)
	let selectedStoreObj = $derived(stores.find((s) => s.name === store));
	let fixedBase = $derived(selectedStoreObj?.fixed_base || 0);
	let envelopeAmount = $derived(efectivoReal - fixedBase);
	let envelopeStatus = $derived(envelopeAmount > 0 ? 'Generar Sobre' : 'Sin Sobre');

	let efectivoPos = $derived(
		efectivoBase + efectivoVentas - efectivoGastos + efectivoIngresos - efectivoEgresos
	);
	let efectivoDiff = $derived(efectivoReal - efectivoPos);

	// Calculate Total Sales and Cash Percentage
	let totalVentas = $derived(
		efectivoVentas +
			dataphone.real +
			rappi.real +
			justo.real +
			appartaPay.real +
			nequi.real +
			bancolombia.real
	);

	let efectivoPorcentaje = $derived(totalVentas > 0 ? (efectivoVentas / totalVentas) * 100 : 0);

	const parseNumber = (value: string) => {
		const n = Number(value.replace(',', '.'));
		return Number.isNaN(n) ? 0 : n;
	};

	let saving = $state(false);
	let saveError: string | null = $state(null);
	let saveOk = $state(false);
	let validationError = $state('');
	let successMessage = $state('');

	const loadOptions = async () => {
		loadingOptions = true;
		optionsError = null;

		try {
			const [c, s] = await Promise.all([getCashiers(supabase), getStoresData(supabase)]);
			cashiers = c;
			stores = s;
		} catch (err: any) {
			Logger.error(err);
			optionsError = `Error: ${err.message || 'No se pudieron cargar los cajeros y tiendas'}`;
		} finally {
			loadingOptions = false;
		}
	};

	onMount(loadOptions);

	const handleSubmit = async () => {
		saving = true;
		saveError = null;
		saveOk = false;
		validationError = '';
		successMessage = '';

		// Validación
		if (!cashier || !store) {
			validationError = 'Debes seleccionar un cajero y una tienda.';
			saving = false;
			return;
		}

		// Check for existing closure
		try {
			const exists = await checkExistingClosure(supabase, store, date);
			if (exists) {
				validationError = `Ya existe un cierre para la sede ${store} en la fecha ${date}.`;
				saving = false;
				return;
			}
		} catch (err) {
			Logger.error(err);
			saveError = 'Error al verificar cierres existentes.';
			saving = false;
			return;
		}

		// Logic for automatic envelope
		const envelopes: EnvelopeData[] = [];
		if (envelopeAmount > 0) {
			envelopes.push({
				number: 'AUTOMATICO',
				amount: envelopeAmount
			});
		} else {
			envelopes.push({
				number: 'SIN SOBRE',
				amount: 0
			});
		}

		const cierre = {
			date,
			note,
			cashierName: cashier,
			storeName: store,
			channels: [dataphone, rappi, justo, appartaPay, nequi, bancolombia],
			envelopes,
			efectivo: {
				base: efectivoBase,
				ventas: efectivoVentas,
				gastos: efectivoGastos,
				ingresos: efectivoIngresos,
				egresos: efectivoEgresos,
				pos: efectivoPos,
				real: efectivoReal,
				diferencia: efectivoDiff,
				porcentaje: efectivoPorcentaje
			}
		};

		try {
			await createClosure(supabase, cierre);
			saveOk = true;
			successMessage = 'Cierre guardado correctamente';

			// Redirección más robusta
			setTimeout(() => {
				goto('/closures'); // Usa goto de SvelteKit en lugar de window.location
			}, 1500);
		} catch (err) {
			// Manejo de error mejorado
			Logger.error(err);

			// Mensaje de error más específico si es posible
			if (err instanceof Error) {
				saveError = err.message.includes('network')
					? 'Error de conexión. Verifica tu internet e intenta nuevamente.'
					: 'No se pudo guardar el cierre. Por favor, intenta nuevamente.';
			} else {
				saveError = 'No se pudo guardar el cierre. Por favor, intenta nuevamente.';
			}
		} finally {
			saving = false;
		}
	};
</script>

<div class="fixed top-5 right-5 z-50 flex flex-col gap-3">
	<!-- Alerts -->
	{#if validationError}
		<Toast color="yellow">
			{#snippet icon()}
				<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
						clip-rule="evenodd"
					/>
				</svg>
			{/snippet}
			<span class="font-medium">Atención:</span>
			{validationError}
		</Toast>
	{/if}

	{#if saveError}
		<Toast color="red">
			{#snippet icon()}
				<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
						clip-rule="evenodd"
					/>
				</svg>
			{/snippet}
			<span class="font-medium">Error:</span>
			{saveError}
		</Toast>
	{/if}

	{#if successMessage}
		<Toast color="green">
			{#snippet icon()}
				<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
						clip-rule="evenodd"
					/>
				</svg>
			{/snippet}
			<span class="font-medium">¡Éxito!</span>
			{successMessage}
		</Toast>
	{/if}
</div>

<h1 class="text-2xl font-semibold mb-4">Registro de cierre de caja</h1>

<section class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4">
	<h2 class="text-sm font-semibold text-slate-700 mb-3">Datos generales</h2>
	<div class="grid gap-3 md:grid-cols-4 text-sm">
		<label class="flex flex-col gap-1">
			<span class="text-slate-600">Fecha</span>
			<input
				type="date"
				bind:value={date}
				class="h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
			/>
		</label>
		<label class="flex flex-col gap-1">
			<span class="text-slate-600">Cajero responsable</span>
			<select
				bind:value={cashier}
				class="h-9 rounded-md border border-slate-200 px-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
				disabled={loadingOptions || !!optionsError}
			>
				<option value="" disabled selected>
					{#if loadingOptions}
						Cargando datos...
					{:else if optionsError}
						Error al cargar
					{:else}
						Selecciona un cajero
					{/if}
				</option>
				{#each cashiers as c}
					<option value={c}>{c}</option>
				{/each}
			</select>
			{#if loadingOptions}
				<span class="text-[11px] text-blue-600 mt-0.5">Conectando a Supabase...</span>
			{/if}
			{#if optionsError}
				<div class="p-2 mt-1 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
					<strong>Error:</strong>
					{optionsError}
					<br />
					<span class="opacity-75">Verifica tu archivo .env y la consola del navegador.</span>
				</div>
			{/if}
		</label>
		<label class="flex flex-col gap-1">
			<span class="text-slate-600">Tienda / sede</span>
			<select
				bind:value={store}
				class="h-9 rounded-md border border-slate-200 px-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
				disabled={loadingOptions || !!optionsError}
			>
				<option value="" disabled selected
					>{loadingOptions ? 'Cargando...' : 'Selecciona una tienda'}</option
				>
				{#each stores as s}
					<option value={s.name}>{s.name}</option>
				{/each}
			</select>
		</label>
		<label class="flex flex-col gap-1 md:col-span-1 md:col-start-1 md:col-end-5">
			<span class="text-slate-600">Nota / Observaciones</span>
			<input
				type="text"
				bind:value={note}
				placeholder="Opcional"
				class="h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
			/>
		</label>
	</div>
</section>

<section class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4">
	<h2 class="text-sm font-semibold text-slate-700 mb-3">Medios electrónicos</h2>
	<div class="flex flex-col gap-3">
		<div class="channel-row border border-slate-100 rounded-lg p-3 bg-slate-50">
			<h3 class="text-xs font-semibold text-slate-700 mb-2">Datáfono</h3>
			<div class="grid gap-3 md:grid-cols-2 text-sm">
				<label class="flex flex-col gap-1">
					<span class="text-slate-600">Datáfono sistema / POS</span>
					<input
						type="number"
						inputmode="decimal"
						bind:value={dataphone.system}
						oninput={(e) => (dataphone.system = parseNumber((e.target as HTMLInputElement).value))}
						class="h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
					/>
				</label>
				<label class="flex flex-col gap-1">
					<span class="text-slate-600">Datáfono real</span>
					<input
						type="number"
						inputmode="decimal"
						bind:value={dataphone.real}
						oninput={(e) => (dataphone.real = parseNumber((e.target as HTMLInputElement).value))}
						class="h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
					/>
				</label>
			</div>
		</div>

		<div class="channel-row border border-slate-100 rounded-lg p-3 bg-slate-50">
			<h3 class="text-xs font-semibold text-slate-700 mb-2">Rappi</h3>
			<div class="grid gap-3 md:grid-cols-2 text-sm">
				<label class="flex flex-col gap-1">
					<span class="text-slate-600">Rappi sistema / POS</span>
					<input
						type="number"
						inputmode="decimal"
						bind:value={rappi.system}
						oninput={(e) => (rappi.system = parseNumber((e.target as HTMLInputElement).value))}
						class="h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
					/>
				</label>
				<label class="flex flex-col gap-1">
					<span class="text-slate-600">Rappi real</span>
					<input
						type="number"
						inputmode="decimal"
						bind:value={rappi.real}
						oninput={(e) => (rappi.real = parseNumber((e.target as HTMLInputElement).value))}
						class="h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
					/>
				</label>
			</div>
		</div>

		<div class="channel-row border border-slate-100 rounded-lg p-3 bg-slate-50">
			<h3 class="text-xs font-semibold text-slate-700 mb-2">Justo</h3>
			<div class="grid gap-3 md:grid-cols-2 text-sm">
				<label class="flex flex-col gap-1">
					<span class="text-slate-600">Justo sistema / POS</span>
					<input
						type="number"
						inputmode="decimal"
						bind:value={justo.system}
						oninput={(e) => (justo.system = parseNumber((e.target as HTMLInputElement).value))}
						class="h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
					/>
				</label>
				<label class="flex flex-col gap-1">
					<span class="text-slate-600">Justo real</span>
					<input
						type="number"
						inputmode="decimal"
						bind:value={justo.real}
						oninput={(e) => (justo.real = parseNumber((e.target as HTMLInputElement).value))}
						class="h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
					/>
				</label>
			</div>
		</div>
	</div>

	<div class="mt-4">
		<button
			type="button"
			class="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
			onclick={() => (showOtherMethods = !showOtherMethods)}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="transition-transform duration-200"
				class:rotate-180={showOtherMethods}
			>
				<polyline points="6 9 12 15 18 9"></polyline>
			</svg>
			Otros medios de pago (AppartaPay, Transferencias)
		</button>

		{#if showOtherMethods}
			<div class="flex flex-col gap-3 mt-3 animate-in slide-in-from-top-2 duration-200">
				<div class="channel-row border border-slate-100 rounded-lg p-3 bg-slate-50">
					<h3 class="text-xs font-semibold text-slate-700 mb-2">AppartaPay</h3>
					<div class="grid gap-3 md:grid-cols-2 text-sm">
						<label class="flex flex-col gap-1">
							<span class="text-slate-600">AppartaPay sistema / POS</span>
							<input
								type="number"
								inputmode="decimal"
								bind:value={appartaPay.system}
								oninput={(e) =>
									(appartaPay.system = parseNumber((e.target as HTMLInputElement).value))}
								class="h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
							/>
						</label>
						<label class="flex flex-col gap-1">
							<span class="text-slate-600">AppartaPay real</span>
							<input
								type="number"
								inputmode="decimal"
								bind:value={appartaPay.real}
								oninput={(e) =>
									(appartaPay.real = parseNumber((e.target as HTMLInputElement).value))}
								class="h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
							/>
						</label>
					</div>
				</div>

				<div class="channel-row border border-slate-100 rounded-lg p-3 bg-slate-50">
					<h3 class="text-xs font-semibold text-slate-700 mb-2">Transferencia NEQUI</h3>
					<div class="grid gap-3 md:grid-cols-2 text-sm">
						<label class="flex flex-col gap-1">
							<span class="text-slate-600">Nequi sistema / POS</span>
							<input
								type="number"
								inputmode="decimal"
								bind:value={nequi.system}
								oninput={(e) => (nequi.system = parseNumber((e.target as HTMLInputElement).value))}
								class="h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
							/>
						</label>
						<label class="flex flex-col gap-1">
							<span class="text-slate-600">Nequi real</span>
							<input
								type="number"
								inputmode="decimal"
								bind:value={nequi.real}
								oninput={(e) => (nequi.real = parseNumber((e.target as HTMLInputElement).value))}
								class="h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
							/>
						</label>
					</div>
				</div>

				<div class="channel-row border border-slate-100 rounded-lg p-3 bg-slate-50">
					<h3 class="text-xs font-semibold text-slate-700 mb-2">Transferencia Bancolombia</h3>
					<div class="grid gap-3 md:grid-cols-2 text-sm">
						<label class="flex flex-col gap-1">
							<span class="text-slate-600">Bancolombia sistema / POS</span>
							<input
								type="number"
								inputmode="decimal"
								bind:value={bancolombia.system}
								oninput={(e) =>
									(bancolombia.system = parseNumber((e.target as HTMLInputElement).value))}
								class="h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
							/>
						</label>
						<label class="flex flex-col gap-1">
							<span class="text-slate-600">Bancolombia real</span>
							<input
								type="number"
								inputmode="decimal"
								bind:value={bancolombia.real}
								oninput={(e) =>
									(bancolombia.real = parseNumber((e.target as HTMLInputElement).value))}
								class="h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
							/>
						</label>
					</div>
				</div>
			</div>
		{/if}
	</div>
</section>

<section class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4">
	<h2 class="text-sm font-semibold text-slate-700 mb-3">Efectivo</h2>
	<div class="grid gap-3 md:grid-cols-3 text-sm">
		<label class="flex flex-col gap-1">
			<span class="text-slate-600">Base inicial</span>
			<input
				type="number"
				inputmode="decimal"
				bind:value={efectivoBase}
				oninput={(e) => (efectivoBase = parseNumber((e.target as HTMLInputElement).value))}
				class="h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
			/>
		</label>
		<label class="flex flex-col gap-1">
			<span class="text-slate-600">Ventas en efectivo</span>
			<input
				type="number"
				inputmode="decimal"
				bind:value={efectivoVentas}
				oninput={(e) => (efectivoVentas = parseNumber((e.target as HTMLInputElement).value))}
				class="h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
			/>
		</label>
		<label class="flex flex-col gap-1">
			<span class="text-slate-600">Gastos en efectivo</span>
			<input
				type="number"
				inputmode="decimal"
				bind:value={efectivoGastos}
				oninput={(e) => (efectivoGastos = parseNumber((e.target as HTMLInputElement).value))}
				class="h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
			/>
		</label>
		<label class="flex flex-col gap-1">
			<span class="text-slate-600">Ingresos (entradas de caja)</span>
			<input
				type="number"
				inputmode="decimal"
				bind:value={efectivoIngresos}
				oninput={(e) => (efectivoIngresos = parseNumber((e.target as HTMLInputElement).value))}
				class="h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
			/>
		</label>
		<label class="flex flex-col gap-1">
			<span class="text-slate-600">Egresos (salidas de caja)</span>
			<input
				type="number"
				inputmode="decimal"
				bind:value={efectivoEgresos}
				oninput={(e) => (efectivoEgresos = parseNumber((e.target as HTMLInputElement).value))}
				class="h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
			/>
		</label>
		<label class="flex flex-col gap-1">
			<span class="text-slate-600">Efectivo real (conteo físico)</span>
			<input
				type="number"
				inputmode="decimal"
				bind:value={efectivoReal}
				oninput={(e) => (efectivoReal = parseNumber((e.target as HTMLInputElement).value))}
				class="h-9 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
			/>
		</label>
	</div>

	<div class="mt-3 text-xs text-slate-700 space-y-1">
		<p>
			<span class="font-semibold">Efectivo POS (base + ventas - gastos + ingresos - egresos):</span>
			<span class="ml-1">${efectivoPos.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
		</p>
		<p>
			<span class="font-semibold">Diferencia efectivo (real - pos):</span>
			<span
				class="ml-1 font-semibold"
				class:diferencia-pos={efectivoDiff >= 0}
				class:diferencia-neg={efectivoDiff < 0}
			>
				${efectivoDiff.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
			</span>
		</p>
	</div>
</section>

<section class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4">
	<h2 class="text-sm font-semibold text-slate-700 mb-3">Sobre Automático</h2>
	<div class="p-3 bg-slate-50 border border-slate-100 rounded-lg">
		<div class="flex items-center justify-between text-sm">
			<span class="text-slate-600">Estado:</span>
			<span
				class="font-medium"
				class:text-emerald-600={envelopeAmount > 0}
				class:text-slate-500={envelopeAmount <= 0}
			>
				{envelopeStatus}
			</span>
		</div>
		<div class="flex items-center justify-between text-sm mt-2">
			<span class="text-slate-600"
				>Valor a guardar (Real - Base Fija {fixedBase > 0
					? `$${fixedBase.toLocaleString('es-CO')}`
					: ''}):</span
			>
			<span class="font-bold text-lg">
				${envelopeAmount > 0
					? envelopeAmount.toLocaleString('es-CO', { maximumFractionDigits: 0 })
					: '0'}
			</span>
		</div>
		{#if envelopeAmount <= 0}
			<p class="text-[10px] text-slate-500 mt-2 italic">
				El efectivo real no supera la base, se registrará como "SIN SOBRE".
			</p>
		{/if}
	</div>
</section>

<section class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4">
	<h2 class="text-sm font-semibold text-slate-700 mb-3">Resumen de diferencias</h2>
	<table class="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
		<thead>
			<tr>
				<th>Medio</th>
				<th>Sistema / POS</th>
				<th>Real</th>
				<th>Diferencia (real - sistema)</th>
			</tr>
		</thead>
		<tbody>
			{#each [{ label: 'Datáfono', ch: dataphone }, { label: 'Rappi', ch: rappi }, { label: 'Justo', ch: justo }, { label: 'AppartaPay', ch: appartaPay }, { label: 'Nequi', ch: nequi }, { label: 'Bancolombia', ch: bancolombia }] as row}
				{#key row.label}
					<tr>
						<td>{row.label}</td>
						<td>${row.ch.system.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
						<td>${row.ch.real.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
						<td
							class:diferencia-pos={row.ch.real - row.ch.system >= 0}
							class:diferencia-neg={row.ch.real - row.ch.system < 0}
						>
							${(row.ch.real - row.ch.system).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
						</td>
					</tr>
				{/key}
			{/each}
			<tr>
				<td>Efectivo</td>
				<td>${efectivoPos.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
				<td>${efectivoReal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
				<td class:diferencia-pos={efectivoDiff >= 0} class:diferencia-neg={efectivoDiff < 0}>
					${efectivoDiff.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
				</td>
			</tr>
		</tbody>
	</table>

	<div class="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-lg">
		<div class="flex items-center justify-between text-sm">
			<span class="text-slate-600 font-medium">Porcentaje de efectivo (sobre venta total):</span>
			<span class="font-bold text-slate-800">
				{efectivoPorcentaje.toFixed(2)}%
			</span>
		</div>
		<p class="text-[10px] text-slate-500 mt-1">
			Venta Total: {totalVentas.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
		</p>
	</div>
</section>

<div class="mt-4 flex items-center gap-3">
	<button
		type="button"
		onclick={handleSubmit}
		disabled={saving}
		class="inline-flex items-center px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium disabled:opacity-60 disabled:cursor-default hover:bg-slate-800"
	>
		{#if saving}
			Guardando...
		{:else}
			Guardar cierre
		{/if}
	</button>

	{#if saveOk}
		<span class="text-xs font-medium text-emerald-700">Cierre guardado correctamente</span>
	{/if}
	{#if saveError}
		<span class="text-xs font-medium text-red-600">{saveError}</span>
	{/if}
</div>

<style>
	.diferencia-pos {
		color: #047857; /* verde */
		font-weight: 600;
	}

	.diferencia-neg {
		color: #b91c1c; /* rojo */
		font-weight: 600;
	}
</style>
