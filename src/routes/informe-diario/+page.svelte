<script lang="ts">
	import { onMount } from 'svelte';
	import { Alert } from 'flowbite-svelte';
	import { getStores } from '$lib/services/closures';
	import { Logger } from '$lib/utils/logger';
	import html2canvas from 'html2canvas';
	import type { PageData } from './$types';

	// Declarar correctamente las props con tipo
	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let supabase = $derived(data.supabase);

	// Estado
	let selectedDate = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let validationError = $state('');
	let stores = $state<string[]>([]);
	let visibleStores = $state<{ [storeName: string]: boolean }>({});
	let showColumnToggle = $state(false);

	// Estructura de datos para el informe
	type PaymentMethodData = {
		[storeName: string]: number;
	};

	type InformeData = {
		datáfono: PaymentMethodData;
		efectivo: PaymentMethodData;
		apparta: PaymentMethodData;
		transferencias_bancarias: PaymentMethodData;
		transferencia_rappi: PaymentMethodData;
		transferencia_justo: PaymentMethodData;
		total_descuadre: PaymentMethodData;
		descuentos: PaymentMethodData;
		gastos_caja: PaymentMethodData;
		sobre_diario: PaymentMethodData;
	};

	let informeData = $state<InformeData>({
		datáfono: {},
		efectivo: {},
		apparta: {},
		transferencias_bancarias: {},
		transferencia_rappi: {},
		transferencia_justo: {},
		total_descuadre: {},
		descuentos: {},
		gastos_caja: {},
		sobre_diario: {}
	});

	let responsables = $state<{ [storeName: string]: string }>({});
	let observaciones = $state<{ [storeName: string]: string }>({});

	// Tiendas visibles filtradas
	let filteredStores = $derived(stores.filter((store) => visibleStores[store]));

	// Cargar tiendas al montar
	onMount(async () => {
		try {
			if (!supabase) throw new Error('Supabase client not initialized');
			stores = await getStores(supabase);

			// Inicializar datos para cada tienda
			stores.forEach((store) => {
				informeData.datáfono[store] = 0;
				informeData.efectivo[store] = 0;
				informeData.apparta[store] = 0;
				informeData.transferencias_bancarias[store] = 0;
				informeData.transferencia_rappi[store] = 0;
				informeData.transferencia_justo[store] = 0;
				informeData.total_descuadre[store] = 0;
				informeData.descuentos[store] = 0;
				informeData.gastos_caja[store] = 0;
				informeData.sobre_diario[store] = 0;
				responsables[store] = '';
				observaciones[store] = '';
				visibleStores[store] = true;
			});

			const today = new Date().toISOString().split('T')[0];
			selectedDate = today;
		} catch (err: any) {
			Logger.error(err);
			error = err.message;
		}
	});

	// Cargar datos del informe para la fecha seleccionada
	const loadInformeData = async () => {
		if (!selectedDate) {
			validationError = 'Por favor selecciona una fecha';
			return;
		}
		validationError = '';

		loading = true;
		error = null;

		try {
			if (!supabase) throw new Error('Supabase client not initialized');

			const { data: closures, error: fetchError } = await supabase
				.from('cash_closures')
				.select(
					`
					id,
					ef_diferencia,
					note,
					stores (name),
					cashiers (name),
					cash_closure_channels (
						channel_name,
						system_amount,
						real_amount
					)
				`
				)
				.eq('date', selectedDate);

			if (fetchError) throw fetchError;

			// Resetear datos
			stores.forEach((store) => {
				informeData.datáfono[store] = 0;
				informeData.efectivo[store] = 0;
				informeData.apparta[store] = 0;
				informeData.transferencias_bancarias[store] = 0;
				informeData.transferencia_rappi[store] = 0;
				informeData.transferencia_justo[store] = 0;
				informeData.total_descuadre[store] = 0;
				informeData.descuentos[store] = 0;
				informeData.gastos_caja[store] = 0;
				informeData.sobre_diario[store] = 0;
				responsables[store] = '';
				observaciones[store] = '';
			});

			if (closures && closures.length > 0) {
				closures.forEach((closure: any) => {
					const storeName = closure.stores?.name;
					if (!storeName) return;

					if (closure.cashiers?.name) {
						responsables[storeName] = closure.cashiers.name.toUpperCase();
					}

					if (closure.note) {
						observaciones[storeName] = closure.note;
					}

					let nequiPos = 0;
					let nequiReal = 0;
					let bancolombiaPos = 0;
					let bancolombiaReal = 0;

					if (closure.cash_closure_channels) {
						closure.cash_closure_channels.forEach((channel: any) => {
							const diff = (channel.real_amount || 0) - (channel.system_amount || 0);
							switch (channel.channel_name) {
								case 'dataphone':
									informeData.datáfono[storeName] = diff;
									break;
								case 'rappi':
									informeData.transferencia_rappi[storeName] = diff;
									break;
								case 'justo':
									informeData.transferencia_justo[storeName] = diff;
									break;
								case 'apparta_pay':
									informeData.apparta[storeName] = diff;
									break;
								case 'transferencia_nequi':
									nequiPos = channel.system_amount || 0;
									nequiReal = channel.real_amount || 0;
									break;
								case 'transferencia_bancolombia':
									bancolombiaPos = channel.system_amount || 0;
									bancolombiaReal = channel.real_amount || 0;
									break;
							}
						});
					}

					informeData.efectivo[storeName] = closure.ef_diferencia || 0;

					const totalTransferenciasReal = nequiReal + bancolombiaReal;
					const totalTransferenciasPos = nequiPos + bancolombiaPos;
					informeData.transferencias_bancarias[storeName] =
						totalTransferenciasReal - totalTransferenciasPos;

					informeData.total_descuadre[storeName] =
						(informeData.datáfono[storeName] || 0) +
						(informeData.efectivo[storeName] || 0) +
						(informeData.apparta[storeName] || 0) +
						(informeData.transferencias_bancarias[storeName] || 0);
				});
			}
		} catch (err: any) {
			Logger.error(err);
			error = err.message || 'Error al cargar los datos del informe';
		} finally {
			loading = false;
		}
	};

	const formatCurrency = (value: number) => {
		if (value === 0) return '$0';
		return `$${value.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
	};

	const getCellClass = (value: number) => {
		if (value === 0) return 'text-gray-500 dark:text-gray-400';
		return 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 font-semibold';
	};

	let downloadingPNG = $state(false);

	const downloadTableAsPNG = async () => {
		const tableElement = document.getElementById('informe-table');
		if (!tableElement) {
			alert('No se encontró la tabla para descargar');
			return;
		}

		if (!selectedDate) {
			alert('Por favor selecciona una fecha primero');
			return;
		}

		downloadingPNG = true;

		try {
			const canvas = await html2canvas(tableElement, {
				scale: 3,
				backgroundColor: '#ffffff',
				logging: false,
				useCORS: true,
				allowTaint: true,
				imageTimeout: 0,
				removeContainer: true
			});

			const link = document.createElement('a');
			const dateStr = selectedDate.replace(/-/g, '');
			link.download = `informe_diario_${dateStr}.png`;
			link.href = canvas.toDataURL('image/png', 1.0);
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			// Show success message
			setTimeout(() => {
				alert('✅ Tabla descargada exitosamente');
			}, 100);
		} catch (err) {
			Logger.error('Error downloading table as PNG:', err);
			alert('❌ Error al descargar la tabla. Por favor intenta de nuevo.');
		} finally {
			downloadingPNG = false;
		}
	};

	const formatDateDisplay = (dateStr: string) => {
		if (!dateStr) return '';
		const date = new Date(dateStr + 'T00:00:00');
		const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
		const months = [
			'enero',
			'febrero',
			'marzo',
			'abril',
			'mayo',
			'junio',
			'julio',
			'agosto',
			'septiembre',
			'octubre',
			'noviembre',
			'diciembre'
		];

		const dayName = days[date.getDay()];
		const day = date.getDate();
		const month = months[date.getMonth()];

		return `${dayName} ${day} de ${month}`;
	};

	const toggleStoreVisibility = (store: string) => {
		visibleStores[store] = !visibleStores[store];
	};

	const toggleAllStores = (visible: boolean) => {
		stores.forEach((store) => {
			visibleStores[store] = visible;
		});
	};
</script>

<h1 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">
	Informe Diario por Sedes
</h1>

{#if validationError}
	<Alert color="yellow" dismissable class="mb-4">
		<span class="font-medium">Atención:</span>
		{validationError}
	</Alert>
{/if}

<!-- Selector de fecha y controles -->
<section
	class="bg-white dark:bg-slate-800 rounded-2xl shadow-soft dark:shadow-none dark:border dark:border-slate-700 border border-gray-100 p-5 md:p-6 mb-6 transition-colors"
>
	<div class="flex flex-col md:flex-row items-end md:items-center gap-4 flex-wrap">
		<label class="flex flex-col gap-2 w-full md:w-auto md:min-w-[200px]">
			<span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase"
				>Seleccionar Fecha</span
			>
			<input
				type="date"
				bind:value={selectedDate}
				class="h-11 rounded-xl border border-gray-200 dark:border-slate-600 px-4 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-fresh-sky-500/20 focus:border-fresh-sky-500 transition-all font-medium text-gray-700 dark:text-white"
			/>
		</label>
		<div class="flex gap-3 w-full md:w-auto">
			<button
				type="button"
				onclick={loadInformeData}
				disabled={loading || !selectedDate}
				class="flex-1 md:flex-none h-11 px-6 rounded-xl bg-fresh-sky-600 hover:bg-fresh-sky-700 text-white text-sm font-semibold shadow-soft hover:shadow-soft-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{loading ? 'Cargando...' : 'Cargar Datos'}
			</button>
			<button
				type="button"
				onclick={() => (showColumnToggle = !showColumnToggle)}
				class="h-11 px-4 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
			>
				{showColumnToggle ? 'Ocultar' : 'Mostrar'} Columnas
			</button>
			<button
				type="button"
				onclick={downloadTableAsPNG}
				disabled={!selectedDate || filteredStores.length === 0 || downloadingPNG}
				class="h-11 px-4 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
			>
				{#if downloadingPNG}
					<div
						class="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"
					></div>
					Descargando...
				{:else}
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
						></path>
					</svg>
					Descargar PNG
				{/if}
			</button>
		</div>
	</div>

	{#if selectedDate}
		<div
			class="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50/50 dark:bg-slate-700/30 p-3 rounded-xl border border-gray-100 dark:border-slate-700"
		>
			<svg class="w-4 h-4 text-fresh-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"
				><path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
				></path></svg
			>
			<span
				>Mostrando datos para: <strong class="text-gray-900 dark:text-white"
					>{formatDateDisplay(selectedDate)}</strong
				></span
			>
		</div>
	{/if}

	<!-- Panel de control de columnas -->
	{#if showColumnToggle}
		<div
			class="mt-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-100 dark:border-slate-700"
		>
			<div class="flex items-center justify-between mb-3">
				<span class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
					>Sedes Visibles</span
				>
				<div class="flex gap-2">
					<button
						type="button"
						onclick={() => toggleAllStores(true)}
						class="text-xs px-2.5 py-1 rounded-md bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:text-fresh-sky-600 hover:border-fresh-sky-200 transition-colors font-medium"
					>
						Todas
					</button>
					<button
						type="button"
						onclick={() => toggleAllStores(false)}
						class="text-xs px-2.5 py-1 rounded-md bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 transition-colors font-medium"
					>
						Ninguna
					</button>
				</div>
			</div>
			<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
				{#each stores as store}
					<label
						class="flex items-center gap-2 text-sm cursor-pointer hover:bg-white dark:hover:bg-slate-600 p-2 rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-slate-500"
					>
						<input
							type="checkbox"
							checked={visibleStores[store]}
							onchange={() => toggleStoreVisibility(store)}
							class="w-4 h-4 rounded border-gray-300 dark:border-slate-500 text-fresh-sky-600 focus:ring-fresh-sky-500/20 bg-white dark:bg-slate-700"
						/>
						<span class="text-gray-700 dark:text-gray-200 font-medium">{store}</span>
					</label>
				{/each}
			</div>
		</div>
	{/if}
</section>

{#if error}
	<div
		class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4"
	>
		<p class="text-sm text-red-700 dark:text-red-400">{error}</p>
	</div>
{/if}

<!-- Tabla de informe -->
<section
	class="bg-white dark:bg-slate-800 rounded-2xl shadow-soft dark:shadow-none dark:border dark:border-slate-700 border border-gray-100 overflow-hidden"
>
	<div class="overflow-x-auto">
		<table id="informe-table" class="w-full text-xs border-collapse" style="min-width: 800px;">
			<colgroup>
				<col style="width: 180px; min-width: 180px;" />
				{#each filteredStores as _}
					<col style="min-width: 120px;" />
				{/each}
			</colgroup>
			<thead>
				<tr class="bg-gray-900 dark:bg-slate-950">
					<th
						class="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider first:rounded-tl-xl sticky left-0 bg-gray-900 dark:bg-slate-950 z-10"
					>
						Método de Pago
					</th>
					{#each filteredStores as store}
						<th
							class="px-3 py-3 text-center text-xs font-bold text-white uppercase tracking-tight whitespace-nowrap"
						>
							{store}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody class="text-xs">
				<!-- DATÁFONO -->
				<tr
					class="hover:bg-fresh-sky-50/30 dark:hover:bg-fresh-sky-900/10 transition-colors border-b border-gray-200 dark:border-slate-700"
				>
					<td
						class="px-4 py-3 font-medium text-gray-700 dark:text-gray-300 bg-gray-50/50 dark:bg-slate-700/30 border-r border-gray-200 dark:border-slate-700 sticky left-0 z-10"
						>Datáfono</td
					>
					{#each filteredStores as store}
						<td
							class="px-3 py-3 text-center border-r border-gray-200 dark:border-slate-700 whitespace-nowrap {getCellClass(
								informeData.datáfono[store]
							)}"
						>
							{formatCurrency(informeData.datáfono[store])}
						</td>
					{/each}
				</tr>

				<!-- EFECTIVO -->
				<tr
					class="hover:bg-fresh-sky-50/30 dark:hover:bg-fresh-sky-900/10 transition-colors border-b border-gray-200 dark:border-slate-700"
				>
					<td
						class="px-4 py-3 font-medium text-gray-700 dark:text-gray-300 bg-gray-50/50 dark:bg-slate-700/30 border-r border-gray-200 dark:border-slate-700 sticky left-0 z-10"
						>Efectivo</td
					>
					{#each filteredStores as store}
						<td
							class="px-3 py-3 text-center border-r border-gray-200 dark:border-slate-700 whitespace-nowrap {getCellClass(
								informeData.efectivo[store]
							)}"
						>
							{formatCurrency(informeData.efectivo[store])}
						</td>
					{/each}
				</tr>

				<!-- APPARTA -->
				<tr
					class="hover:bg-fresh-sky-50/30 dark:hover:bg-fresh-sky-900/10 transition-colors border-b border-gray-200 dark:border-slate-700"
				>
					<td
						class="px-4 py-3 font-medium text-gray-700 dark:text-gray-300 bg-gray-50/50 dark:bg-slate-700/30 border-r border-gray-200 dark:border-slate-700 sticky left-0 z-10"
						>Apparta</td
					>
					{#each filteredStores as store}
						<td
							class="px-3 py-3 text-center border-r border-gray-200 dark:border-slate-700 whitespace-nowrap {getCellClass(
								informeData.apparta[store]
							)}"
						>
							{formatCurrency(informeData.apparta[store])}
						</td>
					{/each}
				</tr>

				<!-- TRANSFERENCIAS BANCARIAS -->
				<tr
					class="hover:bg-fresh-sky-50/30 dark:hover:bg-fresh-sky-900/10 transition-colors border-b border-gray-200 dark:border-slate-700"
				>
					<td
						class="px-4 py-3 font-medium text-gray-700 dark:text-gray-300 bg-gray-50/50 dark:bg-slate-700/30 border-r border-gray-200 dark:border-slate-700 sticky left-0 z-10"
						>Transferencias Bancarias</td
					>
					{#each filteredStores as store}
						<td
							class="px-3 py-3 text-center border-r border-gray-200 dark:border-slate-700 whitespace-nowrap {getCellClass(
								informeData.transferencias_bancarias[store]
							)}"
						>
							{formatCurrency(informeData.transferencias_bancarias[store])}
						</td>
					{/each}
				</tr>

				<!-- Separador -->
				<tr class="bg-fresh-sky-50/50 dark:bg-fresh-sky-900/20">
					<td
						colspan={filteredStores.length + 1}
						class="px-4 py-2 text-center text-xs font-bold text-fresh-sky-800 dark:text-fresh-sky-300 uppercase tracking-widest"
					>
						Plataformas Domicilio
					</td>
				</tr>

				<!-- TRANSFERENCIA RAPPI -->
				<tr
					class="hover:bg-fresh-sky-50/30 dark:hover:bg-fresh-sky-900/10 transition-colors border-b border-gray-200 dark:border-slate-700"
				>
					<td
						class="px-4 py-3 font-medium text-gray-700 dark:text-gray-300 bg-gray-50/50 dark:bg-slate-700/30 border-r border-gray-200 dark:border-slate-700 sticky left-0 z-10"
						>Transferencia Rappi</td
					>
					{#each filteredStores as store}
						<td
							class="px-3 py-3 text-center border-r border-gray-200 dark:border-slate-700 whitespace-nowrap {getCellClass(
								informeData.transferencia_rappi[store]
							)}"
						>
							{formatCurrency(informeData.transferencia_rappi[store])}
						</td>
					{/each}
				</tr>

				<!-- TRANSFERENCIA JUSTO -->
				<tr
					class="hover:bg-fresh-sky-50/30 dark:hover:bg-fresh-sky-900/10 transition-colors border-b border-gray-200 dark:border-slate-700"
				>
					<td
						class="px-4 py-3 font-medium text-gray-700 dark:text-gray-300 bg-gray-50/50 dark:bg-slate-700/30 border-r border-gray-200 dark:border-slate-700 sticky left-0 z-10"
						>Transferencia Justo</td
					>
					{#each filteredStores as store}
						<td
							class="px-3 py-3 text-center border-r border-gray-200 dark:border-slate-700 whitespace-nowrap {getCellClass(
								informeData.transferencia_justo[store]
							)}"
						>
							{formatCurrency(informeData.transferencia_justo[store])}
						</td>
					{/each}
				</tr>

				<!-- TOTAL DESCUADRE -->
				<tr class="bg-gray-900 dark:bg-slate-950 transition-colors shadow-sm">
					<td class="px-4 py-3 font-bold text-white">Total Descuadre</td>
					{#each filteredStores as store}
						<td class="px-4 py-3 text-center font-bold text-white">
							{formatCurrency(informeData.total_descuadre[store])}
						</td>
					{/each}
				</tr>

				<!-- DESCUENTOS (Editable) -->
				<tr class="hover:bg-fresh-sky-50/30 dark:hover:bg-fresh-sky-900/10 transition-colors">
					<td
						class="px-4 py-3 font-medium text-gray-700 dark:text-gray-300 bg-gray-50/50 dark:bg-slate-700/30"
						>Descuentos</td
					>
					{#each filteredStores as store}
						<td class="p-0 text-center bg-white dark:bg-slate-800 relative group">
							<input
								type="number"
								bind:value={informeData.descuentos[store]}
								class="w-full h-full absolute inset-0 text-center border-0 focus:outline-none focus:bg-fresh-sky-50/30 dark:focus:bg-fresh-sky-900/20 text-sm font-medium text-gray-700 dark:text-gray-200 bg-transparent"
								placeholder="0"
							/>
							<div class="h-10"></div>
							<!-- Spacer to give height -->
						</td>
					{/each}
				</tr>

				<!-- GASTOS DE CAJA (Editable) -->
				<tr class="hover:bg-fresh-sky-50/30 dark:hover:bg-fresh-sky-900/10 transition-colors">
					<td
						class="px-4 py-3 font-medium text-gray-700 dark:text-gray-300 bg-gray-50/50 dark:bg-slate-700/30"
						>Gastos de Caja</td
					>
					{#each filteredStores as store}
						<td class="p-0 text-center bg-white dark:bg-slate-800 relative group">
							<input
								type="number"
								bind:value={informeData.gastos_caja[store]}
								class="w-full h-full absolute inset-0 text-center border-0 focus:outline-none focus:bg-fresh-sky-50/30 dark:focus:bg-fresh-sky-900/20 text-sm font-medium text-gray-700 dark:text-gray-200 bg-transparent"
								placeholder="0"
							/>
							<div class="h-10"></div>
						</td>
					{/each}
				</tr>

				<!-- SOBRE DIARIO (Editable) -->
				<tr
					class="hover:bg-fresh-sky-50/30 dark:hover:bg-fresh-sky-900/10 transition-colors border-b-2 border-gray-100 dark:border-slate-700"
				>
					<td
						class="px-4 py-3 font-medium text-gray-700 dark:text-gray-300 bg-gray-50/50 dark:bg-slate-700/30"
						>Sobre Diario</td
					>
					{#each filteredStores as store}
						<td class="p-0 text-center bg-white dark:bg-slate-800 relative group">
							<input
								type="number"
								bind:value={informeData.sobre_diario[store]}
								class="w-full h-full absolute inset-0 text-center border-0 focus:outline-none focus:bg-fresh-sky-50/30 dark:focus:bg-fresh-sky-900/20 text-sm font-medium text-gray-700 dark:text-gray-200 bg-transparent"
								placeholder="0"
							/>
							<div class="h-10"></div>
						</td>
					{/each}
				</tr>

				<!-- RESPONSABLE -->
				<tr class="bg-gray-50/50 dark:bg-slate-700/20">
					<td
						class="px-4 py-3 font-bold text-gray-700 dark:text-gray-200 bg-gray-100/50 dark:bg-slate-700/50"
						>Responsable</td
					>
					{#each filteredStores as store}
						<td
							class="px-4 py-3 text-center font-semibold text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide"
						>
							{responsables[store] || '-'}
						</td>
					{/each}
				</tr>

				<!-- OBSERVACIONES -->
				<tr class="bg-white dark:bg-slate-800">
					<td
						class="px-4 py-3 font-medium text-gray-700 dark:text-gray-300 bg-gray-50/50 dark:bg-slate-700/30"
						>Observaciones</td
					>
					{#each filteredStores as store}
						<td class="px-4 py-3 text-center text-xs text-gray-500 dark:text-gray-400 italic">
							{observaciones[store] || '-'}
						</td>
					{/each}
				</tr>
			</tbody>
		</table>
	</div>
</section>

<!-- Leyenda de colores -->
<section
	class="mt-6 bg-white dark:bg-slate-800 rounded-2xl shadow-soft dark:shadow-none dark:border dark:border-slate-700 border border-gray-100 p-5 transition-colors"
>
	<h3 class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
		Leyenda
	</h3>
	<div class="flex gap-6 text-sm flex-wrap">
		<div class="flex items-center gap-2">
			<div class="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></div>
			<span class="text-gray-600 dark:text-gray-400">Sin diferencia ($0)</span>
		</div>
		<div class="flex items-center gap-2">
			<div class="w-2 h-2 rounded-full bg-red-500 dark:bg-red-400"></div>
			<span class="text-red-700 dark:text-red-400 font-medium"
				>Diferencia (Sobrante o Faltante)</span
			>
		</div>
	</div>
</section>

<style>
	table {
		font-size: 0.75rem;
	}
</style>
