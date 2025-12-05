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

<div class="space-y-6">
	<h1 class="text-2xl md:text-3xl font-bold text-gray-900">Registro de cierre de caja</h1>

	<section class="bg-white rounded-2xl shadow-soft border border-gray-100 p-5 md:p-6">
		<h2 class="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Datos generales</h2>
		<div class="grid gap-5 md:grid-cols-4 text-sm">
			<label class="flex flex-col gap-2">
				<span class="text-sm font-medium text-gray-700">Fecha</span>
				<input
					type="date"
					bind:value={date}
					class="h-11 rounded-xl border border-gray-200 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-dark-orange-500/20 focus:border-dark-orange-500 transition-all font-medium text-gray-900"
				/>
			</label>
			<label class="flex flex-col gap-2">
				<span class="text-sm font-medium text-gray-700">Cajero responsable</span>
				<div class="relative">
					<select
						bind:value={cashier}
						class="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-dark-orange-500/20 focus:border-dark-orange-500 transition-all appearance-none"
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
					<div
						class="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 9l-7 7-7-7"
							/>
						</svg>
					</div>
				</div>
				{#if loadingOptions}
					<span class="text-[11px] text-dark-orange-600 mt-0.5">Conectando a Supabase...</span>
				{/if}
				{#if optionsError}
					<div class="p-2 mt-1 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
						<strong>Error:</strong>
						{optionsError}
					</div>
				{/if}
			</label>
			<label class="flex flex-col gap-2">
				<span class="text-sm font-medium text-gray-700">Tienda / sede</span>
				<div class="relative">
					<select
						bind:value={store}
						class="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-dark-orange-500/20 focus:border-dark-orange-500 transition-all appearance-none"
						disabled={loadingOptions || !!optionsError}
					>
						<option value="" disabled selected
							>{loadingOptions ? 'Cargando...' : 'Selecciona una tienda'}</option
						>
						{#each stores as s}
							<option value={s.name}>{s.name}</option>
						{/each}
					</select>
					<div
						class="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 9l-7 7-7-7"
							/>
						</svg>
					</div>
				</div>
			</label>
			<label class="flex flex-col gap-2 md:col-span-1 md:col-start-1 md:col-end-5">
				<span class="text-sm font-medium text-gray-700">Nota / Observaciones</span>
				<input
					type="text"
					bind:value={note}
					placeholder="Opcional"
					class="h-11 rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-dark-orange-500/20 focus:border-dark-orange-500 transition-all"
				/>
			</label>
		</div>
	</section>

	<section class="bg-white rounded-2xl shadow-soft border border-gray-100 p-5 md:p-6">
		<h2 class="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
			Medios electrónicos
		</h2>
		<div class="flex flex-col gap-4">
			<div
				class="channel-row border border-gray-100 rounded-xl p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors"
			>
				<h3 class="text-sm font-semibold text-gray-800 mb-3">Datáfono</h3>
				<div class="grid gap-4 md:grid-cols-2 text-sm">
					<label class="flex flex-col gap-2">
						<span class="text-xs text-gray-500 font-medium uppercase">Sistema / POS</span>
						<input
							type="number"
							inputmode="decimal"
							bind:value={dataphone.system}
							oninput={(e) =>
								(dataphone.system = parseNumber((e.target as HTMLInputElement).value))}
							class="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-dark-orange-500/20 focus:border-dark-orange-500 transition-all font-medium"
						/>
					</label>
					<label class="flex flex-col gap-2">
						<span class="text-xs text-gray-500 font-medium uppercase">Real (Cierre lote)</span>
						<input
							type="number"
							inputmode="decimal"
							bind:value={dataphone.real}
							oninput={(e) => (dataphone.real = parseNumber((e.target as HTMLInputElement).value))}
							class="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-dark-orange-500/20 focus:border-dark-orange-500 transition-all font-medium"
						/>
					</label>
				</div>
			</div>

			<div
				class="channel-row border border-gray-100 rounded-xl p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors"
			>
				<h3 class="text-sm font-semibold text-gray-800 mb-3">Rappi</h3>
				<div class="grid gap-4 md:grid-cols-2 text-sm">
					<label class="flex flex-col gap-2">
						<span class="text-xs text-gray-500 font-medium uppercase">Sistema / POS</span>
						<input
							type="number"
							inputmode="decimal"
							bind:value={rappi.system}
							oninput={(e) => (rappi.system = parseNumber((e.target as HTMLInputElement).value))}
							class="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-dark-orange-500/20 focus:border-dark-orange-500 transition-all font-medium"
						/>
					</label>
					<label class="flex flex-col gap-2">
						<span class="text-xs text-gray-500 font-medium uppercase">Real</span>
						<input
							type="number"
							inputmode="decimal"
							bind:value={rappi.real}
							oninput={(e) => (rappi.real = parseNumber((e.target as HTMLInputElement).value))}
							class="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-dark-orange-500/20 focus:border-dark-orange-500 transition-all font-medium"
						/>
					</label>
				</div>
			</div>

			<div
				class="channel-row border border-gray-100 rounded-xl p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors"
			>
				<h3 class="text-sm font-semibold text-gray-800 mb-3">Justo</h3>
				<div class="grid gap-4 md:grid-cols-2 text-sm">
					<label class="flex flex-col gap-2">
						<span class="text-xs text-gray-500 font-medium uppercase">Sistema / POS</span>
						<input
							type="number"
							inputmode="decimal"
							bind:value={justo.system}
							oninput={(e) => (justo.system = parseNumber((e.target as HTMLInputElement).value))}
							class="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-dark-orange-500/20 focus:border-dark-orange-500 transition-all font-medium"
						/>
					</label>
					<label class="flex flex-col gap-2">
						<span class="text-xs text-gray-500 font-medium uppercase">Real</span>
						<input
							type="number"
							inputmode="decimal"
							bind:value={justo.real}
							oninput={(e) => (justo.real = parseNumber((e.target as HTMLInputElement).value))}
							class="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-dark-orange-500/20 focus:border-dark-orange-500 transition-all font-medium"
						/>
					</label>
				</div>
			</div>
		</div>

		<div class="mt-4">
			<button
				type="button"
				class="flex items-center gap-2 text-sm font-semibold text-dark-orange-600 hover:text-dark-orange-700 transition-colors p-2 hover:bg-dark-orange-50/50 rounded-lg"
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
									oninput={(e) =>
										(nequi.system = parseNumber((e.target as HTMLInputElement).value))}
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

	<section class="bg-white rounded-2xl shadow-soft border border-gray-100 p-5 md:p-6">
		<h2 class="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Efectivo</h2>
		<div class="grid gap-5 md:grid-cols-3 text-sm">
			<label class="flex flex-col gap-2">
				<span class="text-xs text-gray-500 font-medium uppercase">Base inicial</span>
				<input
					type="number"
					inputmode="decimal"
					bind:value={efectivoBase}
					oninput={(e) => (efectivoBase = parseNumber((e.target as HTMLInputElement).value))}
					class="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-dark-orange-500/20 focus:border-dark-orange-500 transition-all font-medium"
				/>
			</label>
			<label class="flex flex-col gap-2">
				<span class="text-xs text-gray-500 font-medium uppercase">Ventas en efectivo</span>
				<input
					type="number"
					inputmode="decimal"
					bind:value={efectivoVentas}
					oninput={(e) => (efectivoVentas = parseNumber((e.target as HTMLInputElement).value))}
					class="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-dark-orange-500/20 focus:border-dark-orange-500 transition-all font-medium"
				/>
			</label>
			<label class="flex flex-col gap-2">
				<span class="text-xs text-gray-500 font-medium uppercase">Gastos en efectivo</span>
				<input
					type="number"
					inputmode="decimal"
					bind:value={efectivoGastos}
					oninput={(e) => (efectivoGastos = parseNumber((e.target as HTMLInputElement).value))}
					class="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-dark-orange-500/20 focus:border-dark-orange-500 transition-all font-medium"
				/>
			</label>
			<label class="flex flex-col gap-2">
				<span class="text-xs text-gray-500 font-medium uppercase">Ingresos (entradas)</span>
				<input
					type="number"
					inputmode="decimal"
					bind:value={efectivoIngresos}
					oninput={(e) => (efectivoIngresos = parseNumber((e.target as HTMLInputElement).value))}
					class="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-dark-orange-500/20 focus:border-dark-orange-500 transition-all font-medium"
				/>
			</label>
			<label class="flex flex-col gap-2">
				<span class="text-xs text-gray-500 font-medium uppercase">Egresos (salidas)</span>
				<input
					type="number"
					inputmode="decimal"
					bind:value={efectivoEgresos}
					oninput={(e) => (efectivoEgresos = parseNumber((e.target as HTMLInputElement).value))}
					class="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-dark-orange-500/20 focus:border-dark-orange-500 transition-all font-medium"
				/>
			</label>
			<label class="flex flex-col gap-2">
				<span class="text-xs text-gray-500 font-medium uppercase">Efectivo real (conteo)</span>
				<input
					type="number"
					inputmode="decimal"
					bind:value={efectivoReal}
					oninput={(e) => (efectivoReal = parseNumber((e.target as HTMLInputElement).value))}
					class="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-dark-orange-500/20 focus:border-dark-orange-500 transition-all font-medium"
				/>
			</label>
		</div>

		<div
			class="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-6"
		>
			<div>
				<span class="text-xs text-gray-500 font-medium uppercase block mb-1">Efectivo POS</span>
				<span class="text-xl font-bold text-gray-800"
					>${efectivoPos.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span
				>
				<p class="text-[10px] text-gray-400 mt-0.5">
					(base + ventas - gastos + ingresos - egresos)
				</p>
			</div>
			<div class="md:text-right">
				<span class="text-xs text-gray-500 font-medium uppercase block mb-1">Diferencia</span>
				<span
					class="text-xl font-bold"
					class:text-emerald-600={efectivoDiff >= 0}
					class:text-red-600={efectivoDiff < 0}
				>
					${efectivoDiff.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
				</span>
				<p class="text-[10px] text-gray-400 mt-0.5">(real - pos)</p>
			</div>
		</div>
	</section>

	<section class="bg-white rounded-2xl shadow-soft border border-gray-100 p-5 md:p-6 mb-6">
		<h2 class="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Sobre Automático</h2>
		<div
			class="p-5 bg-linear-to-br from-gray-50 to-white border border-gray-100 rounded-xl shadow-sm"
		>
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs text-gray-500 font-medium uppercase mb-1">Estado del sobre</p>
					<span
						class="px-3 py-1 rounded-full text-xs font-bold"
						class:bg-emerald-100={envelopeAmount > 0}
						class:text-emerald-800={envelopeAmount > 0}
						class:bg-gray-100={envelopeAmount <= 0}
						class:text-gray-600={envelopeAmount <= 0}
					>
						{envelopeStatus}
					</span>
				</div>
				<div class="text-right">
					<p class="text-xs text-gray-500 font-medium uppercase mb-1">Valor a guardar</p>
					<span class="text-2xl font-bold text-gray-900">
						${envelopeAmount > 0
							? envelopeAmount.toLocaleString('es-CO', { maximumFractionDigits: 0 })
							: '0'}
					</span>
				</div>
			</div>
			{#if fixedBase > 0}
				<div class="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
					Base fija de la tienda: <span class="font-medium text-gray-700"
						>${fixedBase.toLocaleString('es-CO')}</span
					>
				</div>
			{/if}
			{#if envelopeAmount <= 0}
				<p class="text-xs text-orange-600 mt-2 flex items-center gap-1">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						></path></svg
					>
					El efectivo real no supera la base, se registrará como "SIN SOBRE".
				</p>
			{/if}
		</div>
	</section>

	<section class="bg-white rounded-2xl shadow-soft border border-gray-100 p-5 md:p-6 mb-6">
		<h2 class="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
			Resumen de diferencias
		</h2>
		<div class="overflow-hidden rounded-xl border border-gray-100">
			<table class="w-full text-xs md:text-sm">
				<thead class="bg-gray-50 border-b border-gray-100">
					<tr>
						<th class="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider"
							>Medio</th
						>
						<th class="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider"
							>Sistema / POS</th
						>
						<th class="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider"
							>Real</th
						>
						<th class="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider"
							>Diferencia</th
						>
					</tr>
				</thead>
				<tbody>
					{#each [{ label: 'Datáfono', ch: dataphone }, { label: 'Rappi', ch: rappi }, { label: 'Justo', ch: justo }, { label: 'AppartaPay', ch: appartaPay }, { label: 'Nequi', ch: nequi }, { label: 'Bancolombia', ch: bancolombia }] as row}
						{#key row.label}
							<tr
								class="divide-x divide-gray-50/50 hover:bg-dark-orange-50/10 transition-colors border-b border-gray-50 last:border-0"
							>
								<td class="px-4 py-3 font-medium text-gray-700">{row.label}</td>
								<td class="px-4 py-3 text-gray-600"
									>${row.ch.system.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td
								>
								<td class="px-4 py-3 text-gray-600"
									>${row.ch.real.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td
								>
								<td
									class="px-4 py-3 font-bold"
									class:text-emerald-600={row.ch.real - row.ch.system >= 0}
									class:text-red-500={row.ch.real - row.ch.system < 0}
								>
									${(row.ch.real - row.ch.system).toLocaleString('es-CO', {
										maximumFractionDigits: 0
									})}
								</td>
							</tr>
						{/key}
					{/each}
					<tr>
						<td class="px-4 py-3 font-medium text-gray-700">Efectivo</td>
						<td class="px-4 py-3 text-gray-600"
							>${efectivoPos.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td
						>
						<td class="px-4 py-3 text-gray-600"
							>${efectivoReal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td
						>
						<td
							class="px-4 py-3 font-bold"
							class:text-emerald-600={efectivoDiff >= 0}
							class:text-red-500={efectivoDiff < 0}
						>
							${efectivoDiff.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<div class="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
			<div class="flex items-center justify-between text-sm">
				<span class="text-gray-600 font-medium">Porcentaje de efectivo (sobre venta total):</span>
				<span class="font-bold text-gray-900 text-lg">
					{efectivoPorcentaje.toFixed(2)}%
				</span>
			</div>
			<p class="text-xs text-gray-500 mt-1">
				Venta Total: {totalVentas.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
			</p>
		</div>
	</section>

	<div class="mt-6 flex items-center gap-4">
		<button
			type="button"
			onclick={handleSubmit}
			disabled={saving}
			class="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-linear-to-r from-gray-900 to-gray-800 text-white text-sm font-semibold shadow-lg hover:shadow-xl hover:from-black hover:to-gray-900 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 w-full md:w-auto"
		>
			{#if saving}
				<div
					class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"
				></div>
				Guardando...
			{:else}
				Guardar cierre de caja
			{/if}
		</button>
	</div>

	{#if saveOk}
		<span class="text-xs font-medium text-emerald-700">Cierre guardado correctamente</span>
	{/if}
	{#if saveError}
		<span class="text-xs font-medium text-red-600">{saveError}</span>
	{/if}
</div>

<style>
	/* Removed style block as we are using Tailwind utilities now */
</style>
