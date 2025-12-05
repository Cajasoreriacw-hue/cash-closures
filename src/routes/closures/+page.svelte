<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getCashiers,
		getStoresData,
		updateClosure,
		type ClosureData,
		type Store
	} from '$lib/services/closures';
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

	let cashierOptions = $state<string[]>([]);
	let storeOptions = $state<Store[]>([]);

	let selectedClosure = $state<CashClosure | null>(null);
	let showModal = $state(false);
	let editMode = $state(false);
	let saving = $state(false);
	let saveError = $state('');
	let saveSuccess = $state('');

	let selectedClosureTotalSales = $derived(
		selectedClosure
			? selectedClosure.channels.dataphone.real +
					selectedClosure.channels.rappi.real +
					selectedClosure.channels.justo.real +
					selectedClosure.channels.appartaPay.real +
					selectedClosure.channels.nequi.real +
					selectedClosure.channels.bancolombia.real +
					selectedClosure.efectivo.ventas
			: 0
	);

	let selectedClosureCashPercentage = $derived(
		selectedClosure && selectedClosureTotalSales > 0
			? (selectedClosure.efectivo.ventas / selectedClosureTotalSales) * 100
			: 0
	);

	// Pagination state
	let currentPage = $state(1);
	let itemsPerPage = $state(8);

	const loadClosures = async () => {
		loading = true;
		error = null;

		try {
			if (!supabase) throw new Error('Supabase client not initialized');

			// Load filter options
			const [cashiers, stores] = await Promise.all([
				getCashiers(supabase),
				getStoresData(supabase)
			]);
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
				.order('date', { ascending: false });

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
		const closureToSave = selectedClosure;
		if (!closureToSave || !supabase) return;

		saving = true;
		saveError = '';
		saveSuccess = '';

		try {
			// Calculate envelope amount using fixed base
			const selectedStoreObj = storeOptions.find((s) => s.name === closureToSave.store);
			const fixedBase = selectedStoreObj?.fixed_base || 0;
			const envelopeAmount = Math.max(0, closureToSave.efectivo.real - fixedBase);

			// Prepare closure data
			const closureData: ClosureData = {
				date: closureToSave.date,
				note: closureToSave.note,
				cashierName: closureToSave.cashier,
				storeName: closureToSave.store,
				channels: [
					{
						name: 'dataphone',
						system: closureToSave.channels.dataphone.system,
						real: closureToSave.channels.dataphone.real
					},
					{
						name: 'rappi',
						system: closureToSave.channels.rappi.system,
						real: closureToSave.channels.rappi.real
					},
					{
						name: 'justo',
						system: closureToSave.channels.justo.system,
						real: closureToSave.channels.justo.real
					},
					{
						name: 'apparta_pay',
						system: closureToSave.channels.appartaPay.system,
						real: closureToSave.channels.appartaPay.real
					},
					{
						name: 'transferencia_nequi',
						system: closureToSave.channels.nequi.system,
						real: closureToSave.channels.nequi.real
					},
					{
						name: 'transferencia_bancolombia',
						system: closureToSave.channels.bancolombia.system,
						real: closureToSave.channels.bancolombia.real
					}
				],
				envelopes: [
					{
						number: envelopeAmount > 0 ? 'AUTOMATICO' : 'SIN SOBRE',
						amount: envelopeAmount
					}
				],
				efectivo: {
					...closureToSave.efectivo,
					pos:
						closureToSave.efectivo.base +
						closureToSave.efectivo.ventas +
						closureToSave.efectivo.ingresos -
						closureToSave.efectivo.gastos -
						closureToSave.efectivo.egresos,
					diferencia:
						closureToSave.efectivo.real -
						(closureToSave.efectivo.base +
							closureToSave.efectivo.ventas +
							closureToSave.efectivo.ingresos -
							closureToSave.efectivo.gastos -
							closureToSave.efectivo.egresos)
				}
			};

			await updateClosure(supabase, closureToSave.id, closureData);

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

<div class="space-y-6">
	<h1 class="text-2xl md:text-3xl font-bold text-gray-900">Cierres de caja registrados</h1>

	<section class="bg-white rounded-2xl shadow-soft border border-gray-100 p-4 md:p-5">
		<h2 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Filtros</h2>
		<div class="grid gap-4 md:grid-cols-4">
			<label class="flex flex-col gap-2">
				<span class="text-sm font-medium text-gray-700">Cajero</span>
				<div class="relative">
					<select
						bind:value={filterCashier}
						class="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-dark-orange-500/20 focus:border-dark-orange-500 transition-all appearance-none"
					>
						<option value="">Todos</option>
						{#each cashierOptions as c}
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
			</label>
			<label class="flex flex-col gap-2">
				<span class="text-sm font-medium text-gray-700">Tienda / sede</span>
				<div class="relative">
					<select
						bind:value={filterStore}
						class="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-dark-orange-500/20 focus:border-dark-orange-500 transition-all appearance-none"
					>
						<option value="">Todas</option>
						{#each storeOptions as s}
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
			<label class="flex flex-col gap-2">
				<span class="text-sm font-medium text-gray-700">Desde</span>
				<input
					type="date"
					bind:value={filterFrom}
					class="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-dark-orange-500/20 focus:border-dark-orange-500 transition-all"
				/>
			</label>
			<label class="flex flex-col gap-2">
				<span class="text-sm font-medium text-gray-700">Hasta</span>
				<input
					type="date"
					bind:value={filterTo}
					class="w-full h-11 rounded-xl border border-gray-200 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-dark-orange-500/20 focus:border-dark-orange-500 transition-all"
				/>
			</label>
		</div>
	</section>
</div>

{#if loading}
	<p class="text-sm text-slate-500">Cargando cierres...</p>
{:else if error}
	<p class="text-sm text-red-600">{error}</p>
{:else if !filteredClosures.length}
	<p class="text-sm text-slate-500">No hay cierres para los filtros seleccionados.</p>
{:else}
	<!-- Desktop Table View -->
	<div class="hidden md:block overflow-hidden rounded-2xl border border-gray-100 shadow-soft">
		<table class="w-full text-sm">
			<thead>
				<tr class="bg-gray-50 border-b border-gray-100">
					<th class="px-6 py-4 text-left font-semibold text-gray-700">Fecha</th>
					<th class="px-6 py-4 text-left font-semibold text-gray-700">Cajero</th>
					<th class="px-6 py-4 text-left font-semibold text-gray-700">Tienda</th>
					<th class="px-6 py-4 text-left font-semibold text-gray-700">Venta Total</th>
					<th class="px-6 py-4 text-center font-semibold text-gray-700">Acciones</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-100 bg-white">
				{#each paginatedClosures as c}
					<tr class="hover:bg-dark-orange-50/30 transition-colors duration-150">
						<td class="px-6 py-4 text-gray-600">{c.date}</td>
						<td class="px-6 py-4 text-gray-600">{c.cashier}</td>
						<td class="px-6 py-4">
							<span
								class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
							>
								{c.store}
							</span>
						</td>
						<td class="px-6 py-4 font-bold text-dark-orange-600">
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
						<td class="px-6 py-4 text-center">
							<button
								type="button"
								onclick={() => viewClosure(c)}
								class="px-4 py-2 text-xs font-medium text-dark-orange-700 bg-dark-orange-100 hover:bg-dark-orange-200 rounded-lg transition-colors"
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
	<div class="md:hidden space-y-4">
		{#each paginatedClosures as c}
			<div class="bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden">
				<div class="p-5 space-y-4">
					<!-- Header -->
					<div class="flex items-start justify-between">
						<div>
							<p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha</p>
							<p class="text-base font-bold text-gray-900">{c.date}</p>
						</div>
						<div class="text-right">
							<p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Venta Total</p>
							<p class="text-base font-bold text-dark-orange-600">
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
					<div class="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
						<div>
							<p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Cajero</p>
							<p class="text-sm font-medium text-gray-900">{c.cashier}</p>
						</div>
						<div>
							<p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Tienda</p>
							<span
								class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mt-1"
							>
								{c.store}
							</span>
						</div>
					</div>

					<!-- Action Button -->
					<button
						type="button"
						onclick={() => viewClosure(c)}
						class="w-full px-4 py-3 text-sm font-semibold bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors"
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
	class="mt-6 inline-flex items-center px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 shadow-soft hover:shadow-soft-lg transition-all"
>
	↻ Recargar datos
</button>

<!-- Modal -->
{#if showModal && selectedClosure}
	<div
		class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
		onclick={closeModal}
		onkeydown={(e) => e.key === 'Escape' && closeModal()}
		role="button"
		tabindex="0"
		aria-label="Close modal"
	>
		<div
			class="bg-white rounded-2xl shadow-soft-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
			tabindex="-1"
		>
			<div
				class="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-6 py-4 flex justify-between items-center z-10"
			>
				<h2 class="text-lg font-semibold">
					{editMode ? 'Editar Cierre' : 'Detalle del Cierre'}
				</h2>
				<div class="flex items-center gap-2">
					{#if !editMode}
						<button
							type="button"
							onclick={enableEditMode}
							class="px-4 py-2 text-sm bg-linear-to-r from-dark-orange-500 to-dark-orange-600 text-white font-medium rounded-xl hover:shadow-soft-lg active:scale-95 transition-all"
						>
							✏️ Editar
						</button>
					{:else}
						<button
							type="button"
							onclick={handleSave}
							disabled={saving}
							class="px-4 py-2 text-sm bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 shadow-soft hover:shadow-soft-lg transition-all disabled:opacity-50"
						>
							{saving ? 'Guardando...' : '💾 Guardar'}
						</button>
						<button
							type="button"
							onclick={() => (editMode = false)}
							disabled={saving}
							class="px-4 py-2 text-sm bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50"
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
										<option value={store.name}>{store.name}</option>
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
				<!-- Venta Total -->
				<section>
					<h3 class="text-sm font-semibold text-slate-700 mb-2">Venta Total</h3>
					<div class="p-3 bg-blue-50 border border-blue-200 rounded">
						<div class="flex justify-between items-center text-sm">
							<div>
								<span class="text-slate-600">Total De Venta Del Día:</span>
								<span class="ml-2 text-xl font-bold text-blue-700">
									{selectedClosureTotalSales.toLocaleString('es-CO', {
										style: 'currency',
										currency: 'COP'
									})}
								</span>
							</div>
							<div class="text-right">
								<span class="text-slate-600 block text-xs">Porcentaje Efectivo</span>
								<span class="text-lg font-bold text-slate-700">
									{selectedClosureCashPercentage.toFixed(2)}%
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
