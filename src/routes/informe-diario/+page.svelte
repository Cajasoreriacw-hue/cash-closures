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
		if (value === 0) return 'bg-slate-50';
		return 'bg-pink-50 text-pink-700 font-medium';
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

<h1 class="text-xl font-semibold mb-4 text-slate-800">Informe Diario por Sedes</h1>

{#if validationError}
	<Alert color="yellow" dismissable class="mb-4">
		<span class="font-medium">Atención:</span>
		{validationError}
	</Alert>
{/if}

<!-- Selector de fecha -->
<section class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4">
	<div class="flex items-end gap-4 flex-wrap">
		<label class="flex flex-col gap-1.5 flex-1 min-w-[200px] max-w-xs">
			<span class="text-xs font-semibold text-slate-700">Seleccionar Fecha</span>
			<input
				type="date"
				bind:value={selectedDate}
				class="h-9 rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
			/>
		</label>
		<button
			type="button"
			onclick={loadInformeData}
			disabled={loading || !selectedDate}
			class="h-9 px-5 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
		>
			{loading ? 'Cargando...' : 'Cargar Datos'}
		</button>
		<button
			type="button"
			onclick={() => (showColumnToggle = !showColumnToggle)}
			class="h-9 px-5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
		>
			{showColumnToggle ? 'Ocultar' : 'Mostrar'} Columnas
		</button>
	</div>

	{#if selectedDate}
		<p class="mt-3 text-xs text-slate-600">
			Mostrando datos para: <strong class="text-slate-800">{formatDateDisplay(selectedDate)}</strong
			>
		</p>
	{/if}

	<!-- Panel de control de columnas -->
	{#if showColumnToggle}
		<div class="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
			<div class="flex items-center justify-between mb-2">
				<span class="text-xs font-semibold text-slate-700">Seleccionar Sedes Visibles</span>
				<div class="flex gap-2">
					<button
						type="button"
						onclick={() => toggleAllStores(true)}
						class="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700"
					>
						Todas
					</button>
					<button
						type="button"
						onclick={() => toggleAllStores(false)}
						class="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700"
					>
						Ninguna
					</button>
				</div>
			</div>
			<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
				{#each stores as store}
					<label
						class="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-100 p-1.5 rounded"
					>
						<input
							type="checkbox"
							checked={visibleStores[store]}
							onchange={() => toggleStoreVisibility(store)}
							class="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
						/>
						<span class="text-slate-700">{store}</span>
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
<section class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
	<div class="overflow-x-auto">
		<table class="w-full text-xs border-collapse table-fixed">
			<colgroup>
				<col style="width: 180px;" />
				{#each filteredStores as _}
					<col style="width: auto;" />
				{/each}
			</colgroup>
			<thead>
				<tr class="bg-slate-800">
					<th
						class="border border-slate-600 px-2 py-2 text-left text-xs font-bold text-white uppercase tracking-wide"
					>
						Método de Pago
					</th>
					{#each filteredStores as store}
						<th
							class="border border-slate-600 px-2 py-2 text-center text-xs font-bold text-white uppercase tracking-tight"
						>
							{store}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody class="text-xs">
				<!-- DATÁFONO -->
				<tr class="hover:bg-slate-50 transition-colors">
					<td class="border border-slate-200 px-2 py-1.5 font-medium text-slate-700 bg-slate-50"
						>Datáfono</td
					>
					{#each filteredStores as store}
						<td
							class="border border-slate-200 px-2 py-1.5 text-center {getCellClass(
								informeData.datáfono[store]
							)}"
						>
							{formatCurrency(informeData.datáfono[store])}
						</td>
					{/each}
				</tr>

				<!-- EFECTIVO -->
				<tr class="hover:bg-slate-50 transition-colors">
					<td class="border border-slate-200 px-2 py-1.5 font-medium text-slate-700 bg-slate-50"
						>Efectivo</td
					>
					{#each filteredStores as store}
						<td
							class="border border-slate-200 px-2 py-1.5 text-center {getCellClass(
								informeData.efectivo[store]
							)}"
						>
							{formatCurrency(informeData.efectivo[store])}
						</td>
					{/each}
				</tr>

				<!-- APPARTA -->
				<tr class="hover:bg-slate-50 transition-colors">
					<td class="border border-slate-200 px-2 py-1.5 font-medium text-slate-700 bg-slate-50"
						>Apparta</td
					>
					{#each filteredStores as store}
						<td
							class="border border-slate-200 px-2 py-1.5 text-center {getCellClass(
								informeData.apparta[store]
							)}"
						>
							{formatCurrency(informeData.apparta[store])}
						</td>
					{/each}
				</tr>

				<!-- TRANSFERENCIAS BANCARIAS -->
				<tr class="hover:bg-slate-50 transition-colors">
					<td class="border border-slate-200 px-2 py-1.5 font-medium text-slate-700 bg-slate-50"
						>Transferencias Bancarias</td
					>
					{#each filteredStores as store}
						<td
							class="border border-slate-200 px-2 py-1.5 text-center {getCellClass(
								informeData.transferencias_bancarias[store]
							)}"
						>
							{formatCurrency(informeData.transferencias_bancarias[store])}
						</td>
					{/each}
				</tr>

				<!-- Separador -->
				<tr class="bg-blue-50">
					<td
						colspan={filteredStores.length + 1}
						class="border border-slate-200 px-2 py-1.5 text-center text-xs font-bold text-blue-900 uppercase tracking-wide"
					>
						Plataformas Domicilio
					</td>
				</tr>

				<!-- TRANSFERENCIA RAPPI -->
				<tr class="hover:bg-slate-50 transition-colors">
					<td class="border border-slate-200 px-2 py-1.5 font-medium text-slate-700 bg-slate-50"
						>Transferencia Rappi</td
					>
					{#each filteredStores as store}
						<td
							class="border border-slate-200 px-2 py-1.5 text-center {getCellClass(
								informeData.transferencia_rappi[store]
							)}"
						>
							{formatCurrency(informeData.transferencia_rappi[store])}
						</td>
					{/each}
				</tr>

				<!-- TRANSFERENCIA JUSTO -->
				<tr class="hover:bg-slate-50 transition-colors">
					<td class="border border-slate-200 px-2 py-1.5 font-medium text-slate-700 bg-slate-50"
						>Transferencia Justo</td
					>
					{#each filteredStores as store}
						<td
							class="border border-slate-200 px-2 py-1.5 text-center {getCellClass(
								informeData.transferencia_justo[store]
							)}"
						>
							{formatCurrency(informeData.transferencia_justo[store])}
						</td>
					{/each}
				</tr>

				<!-- TOTAL DESCUADRE -->
				<tr class="bg-blue-600 hover:bg-blue-700 transition-colors">
					<td class="border border-blue-700 px-2 py-2 font-bold text-white bg-blue-600"
						>Total Descuadre</td
					>
					{#each filteredStores as store}
						<td class="border border-blue-700 px-2 py-2 text-center font-bold text-white">
							{formatCurrency(informeData.total_descuadre[store])}
						</td>
					{/each}
				</tr>

				<!-- DESCUENTOS (Editable) -->
				<tr class="hover:bg-slate-50 transition-colors">
					<td class="border border-slate-200 px-2 py-1.5 font-medium text-slate-700 bg-slate-50"
						>Descuentos</td
					>
					{#each filteredStores as store}
						<td class="border border-slate-200 p-0 text-center bg-white">
							<input
								type="number"
								bind:value={informeData.descuentos[store]}
								class="w-full h-full text-center border-0 focus:outline-none focus:bg-blue-50 text-xs py-1.5"
								placeholder="0"
							/>
						</td>
					{/each}
				</tr>

				<!-- GASTOS DE CAJA (Editable) -->
				<tr class="hover:bg-slate-50 transition-colors">
					<td class="border border-slate-200 px-2 py-1.5 font-medium text-slate-700 bg-slate-50"
						>Gastos de Caja</td
					>
					{#each filteredStores as store}
						<td class="border border-slate-200 p-0 text-center bg-white">
							<input
								type="number"
								bind:value={informeData.gastos_caja[store]}
								class="w-full h-full text-center border-0 focus:outline-none focus:bg-blue-50 text-xs py-1.5"
								placeholder="0"
							/>
						</td>
					{/each}
				</tr>

				<!-- SOBRE DIARIO (Editable) -->
				<tr class="hover:bg-slate-50 transition-colors">
					<td class="border border-slate-200 px-2 py-1.5 font-medium text-slate-700 bg-slate-50"
						>Sobre Diario</td
					>
					{#each filteredStores as store}
						<td class="border border-slate-200 p-0 text-center bg-white">
							<input
								type="number"
								bind:value={informeData.sobre_diario[store]}
								class="w-full h-full text-center border-0 focus:outline-none focus:bg-blue-50 text-xs py-1.5"
								placeholder="0"
							/>
						</td>
					{/each}
				</tr>

				<!-- RESPONSABLE -->
				<tr class="bg-slate-100">
					<td class="border border-slate-300 px-2 py-1.5 font-bold text-slate-700 bg-slate-100"
						>Responsable</td
					>
					{#each filteredStores as store}
						<td
							class="border border-slate-300 px-2 py-1.5 text-center font-medium text-xs text-slate-700"
						>
							{responsables[store] || '-'}
						</td>
					{/each}
				</tr>

				<!-- OBSERVACIONES -->
				<tr class="bg-slate-50">
					<td class="border border-slate-200 px-2 py-1.5 font-medium text-slate-700 bg-slate-50"
						>Observaciones</td
					>
					{#each filteredStores as store}
						<td class="border border-slate-200 px-2 py-1.5 text-center text-xs text-slate-600">
							{observaciones[store] || '-'}
						</td>
					{/each}
				</tr>
			</tbody>
		</table>
	</div>
</section>

<!-- Leyenda de colores -->
<section class="mt-4 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
	<h3 class="text-xs font-semibold text-slate-700 mb-2.5">Leyenda</h3>
	<div class="flex gap-4 text-xs flex-wrap">
		<div class="flex items-center gap-2">
			<div class="w-5 h-5 bg-slate-50 border border-slate-300 rounded"></div>
			<span class="text-slate-600">Sin diferencia ($0)</span>
		</div>
		<div class="flex items-center gap-2">
			<div class="w-5 h-5 bg-pink-50 border border-pink-200 rounded"></div>
			<span class="text-pink-700 font-medium">Diferencia (Sobrante o Faltante)</span>
		</div>
	</div>
</section>

<style>
	table {
		font-size: 0.75rem;
	}
</style>
