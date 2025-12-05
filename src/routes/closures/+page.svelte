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
				const getChannel = (name: string) => {
					const ch = channels.find((ch: any) => ch.channel_name === name);
					return ch ? { system: ch.system_amount, real: ch.real_amount } : { system: 0, real: 0 };
				};

				const dataphone = getChannel('dataphone');
				const rappi = getChannel('rappi');
				const justo = getChannel('justo');
				const appartaPay = getChannel('apparta_pay');
				const nequi = getChannel('transferencia_nequi');
				const bancolombia = getChannel('transferencia_bancolombia');

				return {
					id: c.id,
					date: c.date,
					note: c.note || '',
					cashier: c.cashiers?.name || '',
					store: c.stores?.name || '',
					channels: {
						dataphone: { name: 'Datáfono', ...dataphone },
						rappi: { name: 'Rappi', ...rappi },
						justo: { name: 'Justo', ...justo },
						appartaPay: { name: 'AppartaPay', ...appartaPay },
						nequi: { name: 'Nequi', ...nequi },
						bancolombia: { name: 'Bancolombia', ...bancolombia }
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
	<h1 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
		Cierres de caja registrados
	</h1>

	<section
		class="bg-white dark:bg-slate-800 rounded-2xl shadow-soft dark:shadow-none dark:border dark:border-slate-700 p-4 md:p-5 transition-colors"
	>
		<h2 class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
			Filtros
		</h2>
		<div class="grid gap-4 md:grid-cols-4">
			<label class="flex flex-col gap-2">
				<span class="text-sm font-medium text-gray-700 dark:text-gray-300">Cajero</span>
				<div class="relative">
					<select
						bind:value={filterCashier}
						class="w-full h-11 rounded-xl border border-gray-200 dark:border-slate-600 px-4 text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-fresh-sky-500/20 focus:border-fresh-sky-500 transition-all appearance-none"
					>
						<option value="">Todos</option>
						{#each cashierOptions as c}
							<option value={c}>{c}</option>
						{/each}
					</select>
					<div
						class="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500 dark:text-gray-400"
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
				<span class="text-sm font-medium text-gray-700 dark:text-gray-300">Tienda / sede</span>
				<div class="relative">
					<select
						bind:value={filterStore}
						class="w-full h-11 rounded-xl border border-gray-200 dark:border-slate-600 px-4 text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-fresh-sky-500/20 focus:border-fresh-sky-500 transition-all appearance-none"
					>
						<option value="">Todas</option>
						{#each storeOptions as s}
							<option value={s.name}>{s.name}</option>
						{/each}
					</select>
					<div
						class="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500 dark:text-gray-400"
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
				<span class="text-sm font-medium text-gray-700 dark:text-gray-300">Desde</span>
				<input
					type="date"
					bind:value={filterFrom}
					class="w-full h-11 rounded-xl border border-gray-200 dark:border-slate-600 px-4 text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-fresh-sky-500/20 focus:border-fresh-sky-500 transition-all"
				/>
			</label>
			<label class="flex flex-col gap-2">
				<span class="text-sm font-medium text-gray-700 dark:text-gray-300">Hasta</span>
				<input
					type="date"
					bind:value={filterTo}
					class="w-full h-11 rounded-xl border border-gray-200 dark:border-slate-600 px-4 text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-fresh-sky-500/20 focus:border-fresh-sky-500 transition-all"
				/>
			</label>
		</div>
	</section>
</div>

{#if loading}
	<p class="text-sm text-slate-500 dark:text-slate-400">Cargando cierres...</p>
{:else if error}
	<p class="text-sm text-red-600 dark:text-red-400">{error}</p>
{:else if !filteredClosures.length}
	<p class="text-sm text-slate-500 dark:text-slate-400">
		No hay cierres para los filtros seleccionados.
	</p>
{:else}
	<!-- Desktop Table View -->
	<div
		class="hidden md:block overflow-hidden rounded-2xl border border-gray-100 dark:border-slate-700 shadow-soft dark:shadow-none bg-white dark:bg-slate-800"
	>
		<table class="w-full text-sm">
			<thead>
				<tr class="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
					<th class="px-6 py-4 text-left font-semibold text-gray-700 dark:text-gray-200">Fecha</th>
					<th class="px-6 py-4 text-left font-semibold text-gray-700 dark:text-gray-200">Cajero</th>
					<th class="px-6 py-4 text-left font-semibold text-gray-700 dark:text-gray-200">Tienda</th>
					<th class="px-6 py-4 text-left font-semibold text-gray-700 dark:text-gray-200"
						>Venta Total</th
					>
					<th class="px-6 py-4 text-center font-semibold text-gray-700 dark:text-gray-200"
						>Acciones</th
					>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
				{#each paginatedClosures as c}
					<tr
						class="hover:bg-fresh-sky-50/30 dark:hover:bg-fresh-sky-900/10 transition-colors duration-150"
					>
						<td class="px-6 py-4 text-gray-600 dark:text-gray-300">{c.date}</td>
						<td class="px-6 py-4 text-gray-600 dark:text-gray-300">{c.cashier}</td>
						<td class="px-6 py-4">
							<span
								class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200"
							>
								{c.store}
							</span>
						</td>
						<td class="px-6 py-4 font-bold text-fresh-sky-600 dark:text-fresh-sky-400">
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
								class="px-4 py-2 text-xs font-medium text-fresh-sky-700 dark:text-fresh-sky-300 bg-fresh-sky-100 dark:bg-fresh-sky-900/30 hover:bg-fresh-sky-200 dark:hover:bg-fresh-sky-900/50 rounded-lg transition-colors"
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
			<div
				class="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-soft dark:shadow-none overflow-hidden"
			>
				<div class="p-5 space-y-4">
					<!-- Header -->
					<div class="flex items-start justify-between">
						<div>
							<p
								class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide"
							>
								Fecha
							</p>
							<p class="text-base font-bold text-gray-900 dark:text-white">{c.date}</p>
						</div>
						<div class="text-right">
							<p
								class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide"
							>
								Venta Total
							</p>
							<p class="text-base font-bold text-fresh-sky-600 dark:text-fresh-sky-400">
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
					<div class="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-slate-700">
						<div>
							<p
								class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide"
							>
								Cajero
							</p>
							<p class="text-sm font-medium text-gray-900 dark:text-white">{c.cashier}</p>
						</div>
						<div>
							<p
								class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide"
							>
								Tienda
							</p>
							<span
								class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 mt-1"
							>
								{c.store}
							</span>
						</div>
					</div>

					<!-- Action Button -->
					<button
						type="button"
						onclick={() => viewClosure(c)}
						class="w-full px-4 py-3 text-sm font-semibold bg-gray-50 dark:bg-slate-700/50 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 active:bg-gray-200 transition-colors"
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
	class="mt-6 inline-flex items-center px-4 py-2 rounded-xl bg-gray-900 dark:bg-slate-700 text-white text-sm font-medium hover:bg-gray-800 dark:hover:bg-slate-600 shadow-soft hover:shadow-soft-lg transition-all"
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
			class="bg-white dark:bg-slate-800 rounded-2xl shadow-soft-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
			tabindex="-1"
		>
			<div
				class="sticky top-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-b border-gray-100 dark:border-slate-700 px-6 py-4 flex justify-between items-center z-10"
			>
				<h2 class="text-lg font-semibold text-gray-900 dark:text-white">
					{editMode ? 'Editar Cierre' : 'Detalle del Cierre'}
				</h2>
				<div class="flex items-center gap-2">
					{#if !editMode}
						<button
							type="button"
							onclick={enableEditMode}
							class="px-4 py-2 text-sm bg-fresh-sky-600 text-white font-medium rounded-xl hover:bg-fresh-sky-700 shadow-soft hover:shadow-soft-lg active:scale-95 transition-all"
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
							class="px-4 py-2 text-sm bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-all disabled:opacity-50"
						>
							❌ Cancelar
						</button>
					{/if}
					<button
						type="button"
						onclick={closeModal}
						class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-2xl transition-colors"
						>&times;</button
					>
				</div>
			</div>

			<div class="p-6 space-y-4">
				<!-- Success/Error Alerts -->
				{#if saveSuccess}
					<AlertAny color="green" dismissable class="mb-4">
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
					<AlertAny color="red" dismissable class="mb-4">
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
					<h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
						Datos Generales
					</h3>
					<div class="grid grid-cols-2 gap-3 text-sm">
						<div>
							<span class="text-slate-600 dark:text-slate-400">Fecha:</span>
							{#if editMode}
								<input
									type="date"
									bind:value={selectedClosure.date}
									class="ml-2 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
								/>
							{:else}
								<span class="font-medium text-gray-900 dark:text-white">{selectedClosure.date}</span
								>
							{/if}
						</div>
						<div>
							<span class="text-slate-600 dark:text-slate-400">Cajero:</span>
							{#if editMode}
								<select
									bind:value={selectedClosure.cashier}
									class="ml-2 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
								>
									{#each cashierOptions as cashier}
										<option value={cashier}>{cashier}</option>
									{/each}
								</select>
							{:else}
								<span class="font-medium text-gray-900 dark:text-white"
									>{selectedClosure.cashier}</span
								>
							{/if}
						</div>
						<div>
							<span class="text-slate-600 dark:text-slate-400">Tienda:</span>
							{#if editMode}
								<select
									bind:value={selectedClosure.store}
									class="ml-2 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
								>
									{#each storeOptions as store}
										<option value={store.name}>{store.name}</option>
									{/each}
								</select>
							{:else}
								<span class="font-medium text-gray-900 dark:text-white"
									>{selectedClosure.store}</span
								>
							{/if}
						</div>
						<div>
							<span class="text-slate-600 dark:text-slate-400">Nota:</span>
							{#if editMode}
								<input
									type="text"
									bind:value={selectedClosure.note}
									class="ml-2 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm w-full bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
								/>
							{:else}
								<span class="font-medium text-gray-900 dark:text-white"
									>{selectedClosure.note || 'N/A'}</span
								>
							{/if}
						</div>
					</div>
				</section>

				<!-- Venta Total -->
				<section>
					<h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Venta Total</h3>
					<div
						class="p-3 bg-fresh-sky-50 dark:bg-fresh-sky-900/20 border border-fresh-sky-200 dark:border-fresh-sky-800 rounded-xl"
					>
						<div class="flex justify-between items-center text-sm">
							<div>
								<span class="text-slate-600 dark:text-slate-400">Total De Venta Del Día:</span>
								<span class="ml-2 text-xl font-bold text-fresh-sky-700 dark:text-fresh-sky-400">
									{selectedClosureTotalSales.toLocaleString('es-CO', {
										style: 'currency',
										currency: 'COP',
										maximumFractionDigits: 0
									})}
								</span>
							</div>
							<div class="text-right">
								<span class="text-slate-600 dark:text-slate-400 block text-xs"
									>Porcentaje Efectivo</span
								>
								<span class="text-lg font-bold text-slate-700 dark:text-slate-200">
									{selectedClosureCashPercentage.toFixed(2)}%
								</span>
							</div>
						</div>
					</div>
				</section>

				<!-- Medios Electrónicos -->
				<section>
					<h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
						Medios Electrónicos
					</h3>
					<div class="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
						<table class="w-full text-xs">
							<thead>
								<tr class="bg-slate-50 dark:bg-slate-700/50">
									<th class="px-3 py-2 text-left text-slate-600 dark:text-slate-300 font-semibold"
										>Medio</th
									>
									<th class="px-3 py-2 text-right text-slate-600 dark:text-slate-300 font-semibold"
										>Sistema</th
									>
									<th class="px-3 py-2 text-right text-slate-600 dark:text-slate-300 font-semibold"
										>Real</th
									>
									<th class="px-3 py-2 text-right text-slate-600 dark:text-slate-300 font-semibold"
										>Diferencia</th
									>
								</tr>
							</thead>
							<tbody
								class="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800"
							>
								{#each [selectedClosure.channels.dataphone, selectedClosure.channels.rappi, selectedClosure.channels.justo, selectedClosure.channels.appartaPay, selectedClosure.channels.nequi, selectedClosure.channels.bancolombia] as ch}
									<tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
										<td class="px-3 py-2 font-medium text-slate-700 dark:text-slate-200"
											>{ch.name}</td
										>
										<td class="px-3 py-2 text-right">
											{#if editMode}
												<input
													type="number"
													bind:value={ch.system}
													class="w-24 px-1 py-0.5 border border-slate-300 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-700 text-right text-gray-900 dark:text-white"
												/>
											{:else}
												${ch.system.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
											{/if}
										</td>
										<td class="px-3 py-2 text-right">
											{#if editMode}
												<input
													type="number"
													bind:value={ch.real}
													class="w-24 px-1 py-0.5 border border-slate-300 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-700 text-right text-gray-900 dark:text-white"
												/>
											{:else}
												${ch.real.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
											{/if}
										</td>
										<td
											class="px-3 py-2 text-right font-medium"
											class:text-red-500={ch.real - ch.system !== 0}
											class:text-green-500={ch.real - ch.system === 0}
										>
											${(ch.real - ch.system).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</section>

				<!-- Efectivo -->
				<section>
					<h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Efectivo</h3>
					<div
						class="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700"
					>
						<!-- Base -->
						<div>
							<p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Base:</p>
							{#if editMode}
								<input
									type="number"
									bind:value={selectedClosure.efectivo.base}
									class="w-full px-1 py-0.5 border border-slate-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
								/>
							{:else}
								<p class="font-semibold text-slate-800 dark:text-white">
									${selectedClosure.efectivo.base.toLocaleString('es-CO', {
										maximumFractionDigits: 0
									})}
								</p>
							{/if}
						</div>
						<!-- Ventas -->
						<div>
							<p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Ventas (Efec):</p>
							{#if editMode}
								<input
									type="number"
									bind:value={selectedClosure.efectivo.ventas}
									class="w-full px-1 py-0.5 border border-slate-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
								/>
							{:else}
								<p class="font-semibold text-slate-800 dark:text-white">
									${selectedClosure.efectivo.ventas.toLocaleString('es-CO', {
										maximumFractionDigits: 0
									})}
								</p>
							{/if}
						</div>
						<!-- Gastos -->
						<div>
							<p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Gastos:</p>
							{#if editMode}
								<input
									type="number"
									bind:value={selectedClosure.efectivo.gastos}
									class="w-full px-1 py-0.5 border border-slate-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
								/>
							{:else}
								<p class="font-semibold text-red-600 dark:text-red-400">
									${selectedClosure.efectivo.gastos.toLocaleString('es-CO', {
										maximumFractionDigits: 0
									})}
								</p>
							{/if}
						</div>
						<!-- Real -->
						<div>
							<p class="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Real:</p>
							{#if editMode}
								<input
									type="number"
									bind:value={selectedClosure.efectivo.real}
									class="w-full px-1 py-0.5 border border-slate-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
								/>
							{:else}
								<p class="font-bold text-lg text-slate-900 dark:text-white">
									${selectedClosure.efectivo.real.toLocaleString('es-CO', {
										maximumFractionDigits: 0
									})}
								</p>
							{/if}
						</div>
						<!-- Diferencia -->
						<div class="col-span-2">
							<p class="text-xs text-slate-500 dark:text-slate-400 font-medium">
								Diferencia Total:
							</p>
							<p
								class="font-bold text-lg"
								class:text-green-600={selectedClosure.efectivo.diferencia === 0}
								class:dark:text-green-400={selectedClosure.efectivo.diferencia === 0}
								class:text-red-600={selectedClosure.efectivo.diferencia !== 0}
								class:dark:text-red-400={selectedClosure.efectivo.diferencia !== 0}
							>
								${selectedClosure.efectivo.diferencia.toLocaleString('es-CO', {
									maximumFractionDigits: 0
								})}
							</p>
						</div>
					</div>
				</section>
			</div>
		</div>
	</div>
{/if}
