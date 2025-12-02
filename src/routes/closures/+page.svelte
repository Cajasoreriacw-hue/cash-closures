<script lang="ts">
	import { onMount } from 'svelte';
	import { getCashiers, getStores, updateClosure, type ClosureData } from '$lib/services/closures';
	import Pagination from '$lib/components/Pagination.svelte';
	import { Alert } from 'flowbite-svelte';
	import { Logger } from '$lib/utils/logger';

	const AlertAny = Alert as any;

	let { data } = $props();
	let { supabase } = $derived(data);

	type Channel = {
		name: string;
		system: number;
		real: number;
	};

	type CashClosure = {
		id: string;
		date: string;
		note: string;
		cashier: string;
		store: string;
		channels: {
			dataphone: Channel;
			rappi: Channel;
			justo: Channel;
			appartaPay: Channel;
			nequi: Channel;
			bancolombia: Channel;
		};
		efectivo: {
			base: number;
			ventas: number;
			gastos: number;
			ingresos: number;
			egresos: number;
			pos: number;
			real: number;
			diferencia: number;
			porcentaje: number;
		};
		createdAt: string;
	};

	let closures = $state<CashClosure[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let filterCashier = $state('');
	let filterStore = $state('');
	let filterFrom = $state('');
	let filterTo = $state('');
	let resultLimit = $state(50);

	let cashierOptions = $state<string[]>([]);
	let storeOptions = $state<string[]>([]);

	let selectedClosure = $state<CashClosure | null>(null);
	let showModal = $state(false);
	let editMode = $state(false);
	let saving = $state(false);
	let saveError = $state('');
	let saveSuccess = $state('');

	// Pagination state
	let currentPage = $state(1);
	let itemsPerPage = $state(20);

	const loadClosures = async () => {
		loading = true;
		error = null;

		try {
			if (!supabase) throw new Error('Supabase client not initialized');

			// Load filter options
			const [cashiers, stores] = await Promise.all([getCashiers(supabase), getStores(supabase)]);
			cashierOptions = cashiers;
			storeOptions = stores;

			// Fetch closures with related data
			const { data, error: fetchError } = await supabase
				.from('cash_closures')
				.select(
					`
          id,
          date,
          note,
          created_at,
          ef_base,
          ef_ventas,
          ef_gastos,
          ef_ingresos,
          ef_egresos,
          ef_pos,
          ef_real,
          ef_diferencia,
          ef_percent,
          cashiers (name),
          stores (name),
          cash_closure_channels (
            channel_name,
            system_amount,
            real_amount
          )
        `
				)
				.order('date', { ascending: false })
				.limit(resultLimit);

			if (fetchError) throw fetchError;

			// Transform data
			closures = (data || []).map((c: any) => {
				const channels = c.cash_closure_channels || [];
				const dataphone = channels.find((ch: any) => ch.channel_name === 'dataphone') || {
					system_amount: 0,
					real_amount: 0
				};
				const rappi = channels.find((ch: any) => ch.channel_name === 'rappi') || {
					system_amount: 0,
					real_amount: 0
				};
				const justo = channels.find((ch: any) => ch.channel_name === 'justo') || {
					system_amount: 0,
					real_amount: 0
				};
				const appartaPay = channels.find((ch: any) => ch.channel_name === 'apparta_pay') || {
					system_amount: 0,
					real_amount: 0
				};
				const nequi = channels.find((ch: any) => ch.channel_name === 'transferencia_nequi') || {
					system_amount: 0,
					real_amount: 0
				};
				const bancolombia = channels.find(
					(ch: any) => ch.channel_name === 'transferencia_bancolombia'
				) || {
					system_amount: 0,
					real_amount: 0
				};

				return {
					id: c.id,
					date: c.date,
					note: c.note || '',
					cashier: c.cashiers?.name || '',
					store: c.stores?.name || '',
					channels: {
						dataphone: {
							name: 'Datáfono',
							system: dataphone.system_amount,
							real: dataphone.real_amount
						},
						rappi: { name: 'Rappi', system: rappi.system_amount, real: rappi.real_amount },
						justo: { name: 'Justo', system: justo.system_amount, real: justo.real_amount },
						appartaPay: {
							name: 'AppartaPay',
							system: appartaPay.system_amount,
							real: appartaPay.real_amount
						},
						nequi: { name: 'Nequi', system: nequi.system_amount, real: nequi.real_amount },
						bancolombia: {
							name: 'Bancolombia',
							system: bancolombia.system_amount,
							real: bancolombia.real_amount
						}
					},
					efectivo: {
						base: c.ef_base,
						ventas: c.ef_ventas,
						gastos: c.ef_gastos,
						ingresos: c.ef_ingresos,
						egresos: c.ef_egresos,
						pos: c.ef_pos,
						real: c.ef_real,
						diferencia: c.ef_diferencia,
						porcentaje: c.ef_percent || 0
					},
					createdAt: c.created_at
				};
			});
		} catch (err: any) {
			Logger.error(err);
			error = err.message || 'No se pudieron cargar los cierres';
		} finally {
			loading = false;
		}
	};

	const inDateRange = (dateStr: string) => {
		if (!filterFrom && !filterTo) return true;
		const d = new Date(dateStr).toISOString().slice(0, 10);
		if (filterFrom && d < filterFrom) return false;
		if (filterTo && d > filterTo) return false;
		return true;
	};

	let filteredClosures = $derived(
		closures.filter((c) => {
			if (filterCashier && c.cashier !== filterCashier) return false;
			if (filterStore && c.store !== filterStore) return false;
			if (!inDateRange(c.date)) return false;
			return true;
		})
	);

	// Pagination calculations
	let totalPages = $derived(Math.ceil(filteredClosures.length / itemsPerPage));
	let paginatedClosures = $derived(
		filteredClosures.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
	);

	const handlePageChange = (page: number) => {
		currentPage = page;
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	const viewClosure = (closure: CashClosure) => {
		selectedClosure = closure;
		editMode = false;
		showModal = true;
		saveError = '';
		saveSuccess = '';
	};

	const enableEditMode = () => {
		editMode = true;
		saveError = '';
		saveSuccess = '';
	};

	const closeModal = () => {
		showModal = false;
		selectedClosure = null;
		editMode = false;
		saveError = '';
		saveSuccess = '';
	};

	const handleSave = async () => {
		if (!selectedClosure || !supabase) return;

		saving = true;
		saveError = '';
		saveSuccess = '';

		try {
			// Prepare closure data
			const closureData: ClosureData = {
				date: selectedClosure.date,
				note: selectedClosure.note,
				cashierName: selectedClosure.cashier,
				storeName: selectedClosure.store,
				channels: [
					{
						name: 'dataphone',
						system: selectedClosure.channels.dataphone.system,
						real: selectedClosure.channels.dataphone.real
					},
					{
						name: 'rappi',
						system: selectedClosure.channels.rappi.system,
						real: selectedClosure.channels.rappi.real
					},
					{
						name: 'justo',
						system: selectedClosure.channels.justo.system,
						real: selectedClosure.channels.justo.real
					},
					{
						name: 'apparta_pay',
						system: selectedClosure.channels.appartaPay.system,
						real: selectedClosure.channels.appartaPay.real
					},
					{
						name: 'transferencia_nequi',
						system: selectedClosure.channels.nequi.system,
						real: selectedClosure.channels.nequi.real
					},
					{
						name: 'transferencia_bancolombia',
						system: selectedClosure.channels.bancolombia.system,
						real: selectedClosure.channels.bancolombia.real
					}
				],
				envelopes: [
					{
						number: selectedClosure.efectivo.real - selectedClosure.efectivo.base > 0 ? 'AUTOMATICO' : 'SIN SOBRE',
						amount: Math.max(0, selectedClosure.efectivo.real - selectedClosure.efectivo.base)
					}
				],
				efectivo: {
					...selectedClosure.efectivo,
					pos:
						selectedClosure.efectivo.base +
						selectedClosure.efectivo.ventas +
						selectedClosure.efectivo.ingresos -
						selectedClosure.efectivo.gastos -
						selectedClosure.efectivo.egresos,
					diferencia:
						selectedClosure.efectivo.real -
						(selectedClosure.efectivo.base +
							selectedClosure.efectivo.ventas +
							selectedClosure.efectivo.ingresos -
							selectedClosure.efectivo.gastos -
							selectedClosure.efectivo.egresos)
				}
			};

			await updateClosure(supabase, selectedClosure.id, closureData);

			saveSuccess = 'Cierre actualizado exitosamente';
			editMode = false;

			// Reload closures
			await loadClosures();

		// Update selected closure with new data
		const currentClosure = selectedClosure;
		if (currentClosure) {
			const updated = closures.find((c) => c.id === currentClosure.id);
			if (updated) {
				selectedClosure = updated;
			}
		}
			setTimeout(() => {
				saveSuccess = '';
			}, 3000);
		} catch (err: any) {
			Logger.error(err);
			saveError = err.message || 'Error al actualizar el cierre';
		} finally {
			saving = false;
		}
	};

	onMount(loadClosures);
</script>

<h1 class="text-xl font-semibold mb-4">Cierres de caja registrados</h1>

<section class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4 text-sm">
	<h2 class="text-xs font-semibold text-slate-700 mb-3">Filtros</h2>
	<div class="grid gap-3 md:grid-cols-5">
		<label class="flex flex-col gap-1">
			<span class="text-slate-600">Cajero</span>
			<select
				bind:value={filterCashier}
				class="h-8 rounded-md border border-slate-200 px-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
			>
				<option value="">Todos</option>
				{#each cashierOptions as c}
					<option value={c}>{c}</option>
				{/each}
			</select>
		</label>
		<label class="flex flex-col gap-1">
			<span class="text-slate-600">Tienda / sede</span>
			<select
				bind:value={filterStore}
				class="h-8 rounded-md border border-slate-200 px-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
			>
				<option value="">Todas</option>
				{#each storeOptions as s}
					<option value={s}>{s}</option>
				{/each}
			</select>
		</label>
		<label class="flex flex-col gap-1">
			<span class="text-slate-600">Desde</span>
			<input
				type="date"
				bind:value={filterFrom}
				class="h-8 rounded-md border border-slate-200 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
			/>
		</label>
		<label class="flex flex-col gap-1">
			<span class="text-slate-600">Hasta</span>
			<input
				type="date"
				bind:value={filterTo}
				class="h-8 rounded-md border border-slate-200 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
			/>
		</label>
		<label class="flex flex-col gap-1">
			<span class="text-slate-600">Límite de resultados</span>
			<select
				bind:value={resultLimit}
				onchange={loadClosures}
				class="h-8 rounded-md border border-slate-200 px-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
			>
				<option value={10}>10</option>
				<option value={50}>50</option>
				<option value={100}>100</option>
				<option value={1000}>1000</option>
			</select>
		</label>
	</div>
</section>

{#if loading}
	<p class="text-sm text-slate-500">Cargando cierres...</p>
{:else if error}
	<p class="text-sm text-red-600">{error}</p>
{:else if !filteredClosures.length}
	<p class="text-sm text-slate-500">No hay cierres para los filtros seleccionados.</p>
{:else}
	<!-- Desktop Table View -->
	<div class="hidden md:block overflow-x-auto">
		<table class="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
			<thead>
				<tr class="bg-slate-100">
					<th class="px-3 py-2 text-left">Fecha</th>
					<th class="px-3 py-2 text-left">Cajero</th>
					<th class="px-3 py-2 text-left">Tienda</th>
					<th class="px-3 py-2 text-left">Venta Total</th>
					<th class="px-3 py-2 text-center">Acciones</th>
				</tr>
			</thead>
			<tbody>
				{#each paginatedClosures as c}
					<tr class="odd:bg-white even:bg-slate-50 hover:bg-blue-50 transition-colors">
						<td class="px-3 py-2">{c.date}</td>
						<td class="px-3 py-2">{c.cashier}</td>
						<td class="px-3 py-2">{c.store}</td>
						<td class="px-3 py-2 font-semibold text-blue-700">
							${(
								c.efectivo.ventas +
								c.channels.dataphone.real +
								c.channels.rappi.real +
								c.channels.justo.real +
								c.channels.appartaPay.real +
								c.channels.nequi.real +
								c.channels.bancolombia.real
							).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
						</td>
						<td class="px-3 py-2 text-center">
							<button
								type="button"
								onclick={() => viewClosure(c)}
								class="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
							>
								Ver cierre
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Mobile Card View -->
	<div class="md:hidden space-y-3">
		{#each paginatedClosures as c}
			<div class="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
				<div class="p-4 space-y-3">
					<!-- Header -->
					<div class="flex items-start justify-between">
						<div>
							<p class="text-xs text-slate-500">Fecha</p>
							<p class="text-sm font-semibold text-slate-900">{c.date}</p>
						</div>
						<div class="text-right">
							<p class="text-xs text-slate-500">Venta Total</p>
							<p class="text-sm font-bold text-blue-600">
								${(
									c.efectivo.ventas +
									c.channels.dataphone.real +
									c.channels.rappi.real +
									c.channels.justo.real +
									c.channels.appartaPay.real +
									c.channels.nequi.real +
									c.channels.bancolombia.real
								).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
							</p>
						</div>
					</div>

					<!-- Details -->
					<div class="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
						<div>
							<p class="text-xs text-slate-500">Cajero</p>
							<p class="text-sm font-medium text-slate-900">{c.cashier}</p>
						</div>
						<div>
							<p class="text-xs text-slate-500">Tienda</p>
							<p class="text-sm font-medium text-slate-900">{c.store}</p>
						</div>
					</div>

					<!-- Action Button -->
					<button
						type="button"
						onclick={() => viewClosure(c)}
						class="w-full px-4 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors"
					>
						Ver detalles del cierre
					</button>
				</div>
			</div>
		{/each}
	</div>

	<!-- Pagination -->
	{#if totalPages > 1}
		<Pagination bind:currentPage {totalPages} onPageChange={handlePageChange} />
	{/if}
{/if}

<button
	type="button"
	onclick={loadClosures}
	class="mt-3 inline-flex items-center px-3 py-1.5 rounded-md bg-slate-900 text-white text-xs font-medium hover:bg-slate-800"
>
	Recargar
</button>

<!-- Modal -->
{#if showModal && selectedClosure}
	<div
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
		onclick={closeModal}
		onkeydown={(e) => e.key === 'Escape' && closeModal()}
		role="button"
		tabindex="0"
		aria-label="Close modal"
	>
		<div
			class="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto m-4"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
			tabindex="-1"
		>
			<div
			class="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-10"
		>
			<h2 class="text-lg font-semibold">
				{editMode ? 'Editar Cierre' : 'Detalle del Cierre'}
			</h2>
			<div class="flex items-center gap-2">
				{#if !editMode}
					<button
						type="button"
						onclick={enableEditMode}
						class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
					>
						✏️ Editar
					</button>
				{:else}
					<button
						type="button"
						onclick={handleSave}
						disabled={saving}
						class="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
					>
						{saving ? 'Guardando...' : '💾 Guardar'}
					</button>
					<button
						type="button"
						onclick={() => (editMode = false)}
						disabled={saving}
						class="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
					>
						❌ Cancelar
					</button>
				{/if}
				<button
					type="button"
					onclick={closeModal}
					class="text-slate-400 hover:text-slate-600 text-2xl">&times;</button
				>
			</div>
		</div>

		<div class="p-6 space-y-4">
			<!-- Success/Error Alerts -->
			{#if saveSuccess}
				<AlertAny color="green" dismissable>
					<svelte:fragment slot="icon">
						<svg
							class="w-5 h-5"
							fill="currentColor"
							viewBox="0 0 20 20"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
								clip-rule="evenodd"
							/>
						</svg>
					</svelte:fragment>
					<span class="font-medium">Éxito:</span>
					{saveSuccess}
				</AlertAny>
			{/if}

			{#if saveError}
				<AlertAny color="red" dismissable>
					<svelte:fragment slot="icon">
						<svg
							class="w-5 h-5"
							fill="currentColor"
							viewBox="0 0 20 20"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
								clip-rule="evenodd"
							/>
						</svg>
					</svelte:fragment>
					<span class="font-medium">Error:</span>
					{saveError}
				</AlertAny>
			{/if}

			<!-- Datos Generales -->
			<section>
				<h3 class="text-sm font-semibold text-slate-700 mb-2">Datos Generales</h3>
				<div class="grid grid-cols-2 gap-3 text-sm">
					<div>
						<span class="text-slate-600">Fecha:</span>
						{#if editMode}
							<input
								type="date"
								bind:value={selectedClosure.date}
								class="ml-2 px-2 py-1 border border-slate-300 rounded text-sm"
							/>
						{:else}
							<span class="font-medium">{selectedClosure.date}</span>
						{/if}
					</div>
					<div>
						<span class="text-slate-600">Cajero:</span>
						{#if editMode}
							<select
								bind:value={selectedClosure.cashier}
								class="ml-2 px-2 py-1 border border-slate-300 rounded text-sm"
							>
								{#each cashierOptions as cashier}
									<option value={cashier}>{cashier}</option>
								{/each}
							</select>
						{:else}
							<span class="font-medium">{selectedClosure.cashier}</span>
						{/if}
					</div>
					<div>
						<span class="text-slate-600">Tienda:</span>
						{#if editMode}
							<select
								bind:value={selectedClosure.store}
								class="ml-2 px-2 py-1 border border-slate-300 rounded text-sm"
							>
								{#each storeOptions as store}
									<option value={store}>{store}</option>
								{/each}
							</select>
						{:else}
							<span class="font-medium">{selectedClosure.store}</span>
						{/if}
					</div>
					<div>
						<span class="text-slate-600">Nota:</span>
						{#if editMode}
							<input
								type="text"
								bind:value={selectedClosure.note}
								class="ml-2 px-2 py-1 border border-slate-300 rounded text-sm w-full"
							/>
						{:else}
							<span class="font-medium">{selectedClosure.note || 'N/A'}</span>
						{/if}
					</div>
				</div>
			</section>

				<!-- Venta Total -->
				<section>
					<h3 class="text-sm font-semibold text-slate-700 mb-2">Venta Total</h3>
					<div class="p-3 bg-blue-50 border border-blue-200 rounded">
						<div class="flex justify-between items-center text-sm">
							<div>
								<span class="text-slate-600">Total De Venta Del Día:</span>
								<span class="ml-2 text-xl font-bold text-blue-700">
									{(
										selectedClosure.channels.dataphone.real +
										selectedClosure.channels.rappi.real +
										selectedClosure.channels.justo.real +
										selectedClosure.channels.appartaPay.real +
										selectedClosure.channels.nequi.real +
										selectedClosure.channels.bancolombia.real +
										selectedClosure.efectivo.ventas
									).toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
								</span>
							</div>
							<div class="text-right">
								<span class="text-slate-600 block text-xs">Porcentaje Efectivo</span>
								<span class="text-lg font-bold text-slate-700">
									{selectedClosure.efectivo.porcentaje.toFixed(2)}%
								</span>
							</div>
						</div>
					</div>
				</section>

				<!-- Medios Electrónicos -->
				<section>
					<h3 class="text-sm font-semibold text-slate-700 mb-2">Medios Electrónicos</h3>
					<table class="w-full text-xs border border-slate-200 rounded">
						<thead>
							<tr class="bg-slate-50">
								<th class="px-2 py-1">Medio</th>
								<th class="px-2 py-1">Sistema</th>
								<th class="px-2 py-1">Real</th>
								<th class="px-2 py-1">Diferencia</th>
							</tr>
						</thead>
						<tbody>
							{#each [selectedClosure.channels.dataphone, selectedClosure.channels.rappi, selectedClosure.channels.justo, selectedClosure.channels.appartaPay, selectedClosure.channels.nequi, selectedClosure.channels.bancolombia] as ch}
								<tr>
									<td class="px-2 py-1">{ch.name}</td>
									<td class="px-2 py-1">
										{#if editMode}
											<input
												type="number"
												bind:value={ch.system}
												class="w-full px-1 py-0.5 border border-slate-300 rounded text-xs"
											/>
										{:else}
											${ch.system.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
										{/if}
									</td>
									<td class="px-2 py-1">
										{#if editMode}
											<input
												type="number"
												bind:value={ch.real}
												class="w-full px-1 py-0.5 border border-slate-300 rounded text-xs"
											/>
										{:else}
											${ch.real.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
										{/if}
									</td>
									<td
										class="px-2 py-1 font-semibold"
										class:text-emerald-700={ch.real - ch.system >= 0}
										class:text-red-700={ch.real - ch.system < 0}
									>
										${(ch.real - ch.system).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</section>

				<!-- Efectivo -->
				<section>
					<h3 class="text-sm font-semibold text-slate-700 mb-2">Efectivo</h3>
					<div class="grid grid-cols-2 gap-2 text-xs">
						<div>
							<span class="text-slate-600">Base:</span>
							{#if editMode}
								<input
									type="number"
									bind:value={selectedClosure.efectivo.base}
									class="w-full px-1 py-0.5 border border-slate-300 rounded text-xs"
								/>
							{:else}
								<span class="font-medium"
									>${selectedClosure.efectivo.base.toLocaleString('es-CO', {
										maximumFractionDigits: 0
									})}</span
								>
							{/if}
						</div>
						<div>
							<span class="text-slate-600">Ventas:</span>
							{#if editMode}
								<input
									type="number"
									bind:value={selectedClosure.efectivo.ventas}
									class="w-full px-1 py-0.5 border border-slate-300 rounded text-xs"
								/>
							{:else}
								<span class="font-medium"
									>${selectedClosure.efectivo.ventas.toLocaleString('es-CO', {
										maximumFractionDigits: 0
									})}</span
								>
							{/if}
						</div>
						<div>
							<span class="text-slate-600">Gastos:</span>
							{#if editMode}
								<input
									type="number"
									bind:value={selectedClosure.efectivo.gastos}
									class="w-full px-1 py-0.5 border border-slate-300 rounded text-xs"
								/>
							{:else}
								<span class="font-medium"
									>${selectedClosure.efectivo.gastos.toLocaleString('es-CO', {
										maximumFractionDigits: 0
									})}</span
								>
							{/if}
						</div>
						<div>
							<span class="text-slate-600">Ingresos:</span>
							{#if editMode}
								<input
									type="number"
									bind:value={selectedClosure.efectivo.ingresos}
									class="w-full px-1 py-0.5 border border-slate-300 rounded text-xs"
								/>
							{:else}
								<span class="font-medium"
									>${selectedClosure.efectivo.ingresos.toLocaleString('es-CO', {
										maximumFractionDigits: 0
									})}</span
								>
							{/if}
						</div>
						<div>
							<span class="text-slate-600">Egresos:</span>
							{#if editMode}
								<input
									type="number"
									bind:value={selectedClosure.efectivo.egresos}
									class="w-full px-1 py-0.5 border border-slate-300 rounded text-xs"
								/>
							{:else}
								<span class="font-medium"
									>${selectedClosure.efectivo.egresos.toLocaleString('es-CO', {
										maximumFractionDigits: 0
									})}</span
								>
							{/if}
						</div>
						<div>
							<span class="text-slate-600">Real:</span>
							{#if editMode}
								<input
									type="number"
									bind:value={selectedClosure.efectivo.real}
									class="w-full px-1 py-0.5 border border-slate-300 rounded text-xs"
								/>
							{:else}
								<span class="font-medium"
									>${selectedClosure.efectivo.real.toLocaleString('es-CO', {
										maximumFractionDigits: 0
									})}</span
								>
							{/if}
						</div>
						<div class="col-span-2 pt-2 border-t">
							<span class="text-slate-600">POS (Calculado):</span>
							<span class="font-semibold"
								>${(
									selectedClosure.efectivo.base +
									selectedClosure.efectivo.ventas +
									selectedClosure.efectivo.ingresos -
									selectedClosure.efectivo.gastos -
									selectedClosure.efectivo.egresos
								).toLocaleString('es-CO', {
									maximumFractionDigits: 0
								})}</span
							>
						</div>
						<div class="col-span-2">
							<span class="text-slate-600">Diferencia:</span>
							<span
								class="font-semibold"
								class:text-emerald-700={selectedClosure.efectivo.real -
									(selectedClosure.efectivo.base +
										selectedClosure.efectivo.ventas +
										selectedClosure.efectivo.ingresos -
										selectedClosure.efectivo.gastos -
										selectedClosure.efectivo.egresos) >=
									0}
								class:text-red-700={selectedClosure.efectivo.real -
									(selectedClosure.efectivo.base +
										selectedClosure.efectivo.ventas +
										selectedClosure.efectivo.ingresos -
										selectedClosure.efectivo.gastos -
										selectedClosure.efectivo.egresos) <
									0}
								>${(
									selectedClosure.efectivo.real -
									(selectedClosure.efectivo.base +
										selectedClosure.efectivo.ventas +
										selectedClosure.efectivo.ingresos -
										selectedClosure.efectivo.gastos -
										selectedClosure.efectivo.egresos)
								).toLocaleString('es-CO', {
									maximumFractionDigits: 0
								})}</span
							>
						</div>
					</div>
				</section>
			</div>
		</div>
	</div>
{/if}
