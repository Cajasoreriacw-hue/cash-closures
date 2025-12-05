<script lang="ts">
	import { onMount } from 'svelte';
	import { Alert } from 'flowbite-svelte';
	import { getStores } from '$lib/services/closures';
	import { Logger } from '$lib/utils/logger';
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
		if (value === 0) return 'text-gray-500';
		return 'bg-red-50 text-red-600 font-bold rounded-lg';
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

<h1 class="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Informe Diario por Sedes</h1>

{#if validationError}
	<Alert color="yellow" dismissable class="mb-4">
		<span class="font-medium">Atención:</span>
		{validationError}
	</Alert>
{/if}

<!-- Selector de fecha y controles -->
<section class="bg-white rounded-2xl shadow-soft border border-gray-100 p-5 md:p-6 mb-6">
	<div class="flex flex-col md:flex-row items-end md:items-center gap-4 flex-wrap">
		<label class="flex flex-col gap-2 w-full md:w-auto md:min-w-[200px]">
			<span class="text-xs font-semibold text-gray-500 uppercase">Seleccionar Fecha</span>
			<input
				type="date"
				bind:value={selectedDate}
				class="h-11 rounded-xl border border-gray-200 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-dark-orange-500/20 focus:border-dark-orange-500 transition-all font-medium text-gray-700"
			/>
		</label>
		<div class="flex gap-3 w-full md:w-auto">
			<button
				type="button"
				onclick={loadInformeData}
				disabled={loading || !selectedDate}
				class="flex-1 md:flex-none h-11 px-6 rounded-xl bg-linear-to-r from-gray-900 to-gray-800 text-white text-sm font-semibold shadow-soft hover:shadow-soft-lg hover:from-black hover:to-gray-900 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{loading ? 'Cargando...' : 'Cargar Datos'}
			</button>
			<button
				type="button"
				onclick={() => (showColumnToggle = !showColumnToggle)}
				class="h-11 px-4 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors"
			>
				{showColumnToggle ? 'Ocultar' : 'Mostrar'} Columnas
			</button>
		</div>
	</div>

	{#if selectedDate}
		<div
			class="mt-4 flex items-center gap-2 text-sm text-gray-600 bg-gray-50/50 p-3 rounded-xl border border-gray-100"
		>
			<svg
				class="w-4 h-4 text-dark-orange-500"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				><path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
				></path></svg
			>
			<span
				>Mostrando datos para: <strong class="text-gray-900"
					>{formatDateDisplay(selectedDate)}</strong
				></span
			>
		</div>
	{/if}

	<!-- Panel de control de columnas -->
	{#if showColumnToggle}
		<div class="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
			<div class="flex items-center justify-between mb-3">
				<span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Sedes Visibles</span>
				<div class="flex gap-2">
					<button
						type="button"
						onclick={() => toggleAllStores(true)}
						class="text-xs px-2.5 py-1 rounded-md bg-white border border-gray-200 text-gray-600 hover:text-dark-orange-600 hover:border-dark-orange-200 transition-colors font-medium"
					>
						Todas
					</button>
					<button
						type="button"
						onclick={() => toggleAllStores(false)}
						class="text-xs px-2.5 py-1 rounded-md bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors font-medium"
					>
						Ninguna
					</button>
				</div>
			</div>
			<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
				{#each stores as store}
					<label
						class="flex items-center gap-2 text-sm cursor-pointer hover:bg-white p-2 rounded-lg transition-colors border border-transparent hover:border-gray-200"
					>
						<input
							type="checkbox"
							checked={visibleStores[store]}
							onchange={() => toggleStoreVisibility(store)}
							class="w-4 h-4 rounded border-gray-300 text-dark-orange-600 focus:ring-dark-orange-500/20"
						/>
						<span class="text-gray-700 font-medium">{store}</span>
					</label>
				{/each}
			</div>
		</div>
	{/if}
</section>

{#if error}
	<div class="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
		<p class="text-sm text-red-700">{error}</p>
	</div>
{/if}

<!-- Tabla de informe -->
<!-- Tabla de informe -->
<section class="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
	<div class="overflow-x-auto">
		<table class="w-full text-xs border-collapse table-fixed">
			<colgroup>
				<col style="width: 180px;" />
				{#each filteredStores as _}
					<col style="width: auto;" />
				{/each}
			</colgroup>
			<thead>
				<tr class="bg-gray-900">
					<th
						class="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider first:rounded-tl-xl"
					>
						Método de Pago
					</th>
					{#each filteredStores as store}
						<th class="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-tight">
							{store}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody class="text-xs">
				<!-- DATÁFONO -->
				<tr class="hover:bg-dark-orange-50/30 transition-colors border-b border-gray-100">
					<td class="px-4 py-3 font-medium text-gray-700 bg-gray-50/50">Datáfono</td>
					{#each filteredStores as store}
						<td class="px-4 py-3 text-center {getCellClass(informeData.datáfono[store])}">
							{formatCurrency(informeData.datáfono[store])}
						</td>
					{/each}
				</tr>

				<!-- EFECTIVO -->
				<tr class="hover:bg-dark-orange-50/30 transition-colors border-b border-gray-100">
					<td class="px-4 py-3 font-medium text-gray-700 bg-gray-50/50">Efectivo</td>
					{#each filteredStores as store}
						<td class="px-4 py-3 text-center {getCellClass(informeData.efectivo[store])}">
							{formatCurrency(informeData.efectivo[store])}
						</td>
					{/each}
				</tr>

				<!-- APPARTA -->
				<tr class="hover:bg-dark-orange-50/30 transition-colors border-b border-gray-100">
					<td class="px-4 py-3 font-medium text-gray-700 bg-gray-50/50">Apparta</td>
					{#each filteredStores as store}
						<td class="px-4 py-3 text-center {getCellClass(informeData.apparta[store])}">
							{formatCurrency(informeData.apparta[store])}
						</td>
					{/each}
				</tr>

				<!-- TRANSFERENCIAS BANCARIAS -->
				<tr class="hover:bg-dark-orange-50/30 transition-colors border-b border-gray-100">
					<td class="px-4 py-3 font-medium text-gray-700 bg-gray-50/50">Transferencias Bancarias</td
					>
					{#each filteredStores as store}
						<td
							class="px-4 py-3 text-center {getCellClass(
								informeData.transferencias_bancarias[store]
							)}"
						>
							{formatCurrency(informeData.transferencias_bancarias[store])}
						</td>
					{/each}
				</tr>

				<!-- Separador -->
				<tr class="bg-dark-orange-50/50">
					<td
						colspan={filteredStores.length + 1}
						class="px-4 py-2 text-center text-xs font-bold text-dark-orange-800 uppercase tracking-widest"
					>
						Plataformas Domicilio
					</td>
				</tr>

				<!-- TRANSFERENCIA RAPPI -->
				<tr class="hover:bg-dark-orange-50/30 transition-colors border-b border-gray-100">
					<td class="px-4 py-3 font-medium text-gray-700 bg-gray-50/50">Transferencia Rappi</td>
					{#each filteredStores as store}
						<td
							class="px-4 py-3 text-center {getCellClass(informeData.transferencia_rappi[store])}"
						>
							{formatCurrency(informeData.transferencia_rappi[store])}
						</td>
					{/each}
				</tr>

				<!-- TRANSFERENCIA JUSTO -->
				<tr class="hover:bg-dark-orange-50/30 transition-colors border-b border-gray-200">
					<td class="px-4 py-3 font-medium text-gray-700 bg-gray-50/50">Transferencia Justo</td>
					{#each filteredStores as store}
						<td
							class="px-4 py-3 text-center {getCellClass(informeData.transferencia_justo[store])}"
						>
							{formatCurrency(informeData.transferencia_justo[store])}
						</td>
					{/each}
				</tr>

				<!-- TOTAL DESCUADRE -->
				<tr class="bg-gray-900 hover:bg-gray-800 transition-colors shadow-sm">
					<td class="px-4 py-3 font-bold text-white">Total Descuadre</td>
					{#each filteredStores as store}
						<td class="px-4 py-3 text-center font-bold text-white">
							{formatCurrency(informeData.total_descuadre[store])}
						</td>
					{/each}
				</tr>

				<!-- DESCUENTOS (Editable) -->
				<tr class="hover:bg-dark-orange-50/30 transition-colors border-b border-gray-100">
					<td class="px-4 py-3 font-medium text-gray-700 bg-gray-50/50">Descuentos</td>
					{#each filteredStores as store}
						<td
							class="p-0 text-center bg-white border-b border-gray-100 last:border-0 relative group"
						>
							<input
								type="number"
								bind:value={informeData.descuentos[store]}
								class="w-full h-full absolute inset-0 text-center border-0 focus:outline-none focus:bg-dark-orange-50/30 text-sm font-medium text-gray-700"
								placeholder="0"
							/>
							<div class="h-10"></div>
							<!-- Spacer to give height -->
						</td>
					{/each}
				</tr>

				<!-- GASTOS DE CAJA (Editable) -->
				<tr class="hover:bg-dark-orange-50/30 transition-colors border-b border-gray-100">
					<td class="px-4 py-3 font-medium text-gray-700 bg-gray-50/50">Gastos de Caja</td>
					{#each filteredStores as store}
						<td
							class="p-0 text-center bg-white border-b border-gray-100 last:border-0 relative group"
						>
							<input
								type="number"
								bind:value={informeData.gastos_caja[store]}
								class="w-full h-full absolute inset-0 text-center border-0 focus:outline-none focus:bg-dark-orange-50/30 text-sm font-medium text-gray-700"
								placeholder="0"
							/>
							<div class="h-10"></div>
						</td>
					{/each}
				</tr>

				<!-- SOBRE DIARIO (Editable) -->
				<tr class="hover:bg-dark-orange-50/30 transition-colors border-b-2 border-gray-100">
					<td class="px-4 py-3 font-medium text-gray-700 bg-gray-50/50">Sobre Diario</td>
					{#each filteredStores as store}
						<td
							class="p-0 text-center bg-white border-b border-gray-100 last:border-0 relative group"
						>
							<input
								type="number"
								bind:value={informeData.sobre_diario[store]}
								class="w-full h-full absolute inset-0 text-center border-0 focus:outline-none focus:bg-dark-orange-50/30 text-sm font-medium text-gray-700"
								placeholder="0"
							/>
							<div class="h-10"></div>
						</td>
					{/each}
				</tr>

				<!-- RESPONSABLE -->
				<tr class="bg-gray-50/50 border-b border-gray-100">
					<td class="px-4 py-3 font-bold text-gray-700 bg-gray-100/50">Responsable</td>
					{#each filteredStores as store}
						<td
							class="px-4 py-3 text-center font-semibold text-xs text-gray-600 uppercase tracking-wide"
						>
							{responsables[store] || '-'}
						</td>
					{/each}
				</tr>

				<!-- OBSERVACIONES -->
				<tr class="bg-white">
					<td class="px-4 py-3 font-medium text-gray-700 bg-gray-50/50">Observaciones</td>
					{#each filteredStores as store}
						<td class="px-4 py-3 text-center text-xs text-gray-500 italic">
							{observaciones[store] || '-'}
						</td>
					{/each}
				</tr>
			</tbody>
		</table>
	</div>
</section>

<!-- Leyenda de colores -->
<section class="mt-6 bg-white rounded-2xl shadow-soft border border-gray-100 p-5">
	<h3 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Leyenda</h3>
	<div class="flex gap-6 text-sm flex-wrap">
		<div class="flex items-center gap-2">
			<div class="w-2 h-2 rounded-full bg-gray-300"></div>
			<span class="text-gray-600">Sin diferencia ($0)</span>
		</div>
		<div class="flex items-center gap-2">
			<div class="w-2 h-2 rounded-full bg-red-500"></div>
			<span class="text-red-700 font-medium">Diferencia (Sobrante o Faltante)</span>
		</div>
	</div>
</section>

<style>
	table {
		font-size: 0.75rem;
	}
</style>
