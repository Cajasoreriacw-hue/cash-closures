<script lang="ts">
	import { onMount } from 'svelte';
	import { Alert } from 'flowbite-svelte';
	import { getCashiers, getStores } from '$lib/services/closures';
	import Pagination from '$lib/components/Pagination.svelte';
	import { Logger } from '$lib/utils/logger';

	let { data } = $props();
	let { supabase } = $derived(data);

	type Sobre = {
		id: string;
		date: string;
		cashier: string;
		store: string;
		valorSobre: number | null;
		sinSobre: boolean;
		closureId: string;
		createdAt: string;
		status: string;
	};

	const AlertAny = Alert as any;

	let pageState = $state<{
		sobres: Sobre[];
		updateError: string;
		loading: boolean;
		error: string | null;
	}>({
		sobres: [],
		updateError: '',
		loading: true,
		error: null
	});

	let filterCashier = $state('');
	let filterStore = $state('');
	let filterFrom = $state('');
	let filterTo = $state('');

	let cashierOptions: string[] = $state([]);
	let storeOptions: string[] = $state([]);

	// Pagination state
	let currentPage = $state(1);
	let itemsPerPage = $state(8);

	const statusOptions = [
		'activo en tienda',
		'retirado por rafael cepeda',
		'retirado por juan osorio',
		'apertura de sobre',
		'sin sobre'
	];

	const loadSobres = async () => {
		pageState.loading = true;
		pageState.error = null;

		try {
			if (!supabase) throw new Error('Supabase client not initialized');

			const [cashiers, stores] = await Promise.all([getCashiers(supabase), getStores(supabase)]);
			cashierOptions = cashiers;
			storeOptions = stores;

			const { data, error: fetchError } = await supabase
				.from('cash_envelopes')
				.select(
					`
          id,
          envelope_number,
          amount,
          closure_id,
          status,
          cash_closures (
            date,
            created_at,
            cashiers (name),
            stores (name)
          )
        `
				)
				.order('cash_closures(date)', { ascending: false });

			if (fetchError) throw fetchError;

			pageState.sobres = (data || []).map((env: any) => ({
				id: env.id,
				date: env.cash_closures?.date || '',
				cashier: env.cash_closures?.cashiers?.name || '',
				store: env.cash_closures?.stores?.name || '',
				valorSobre: env.envelope_number === 'SIN SOBRE' ? null : env.amount,
				sinSobre: env.envelope_number === 'SIN SOBRE',
				closureId: env.closure_id,
				createdAt: env.cash_closures?.created_at || '',
				status: env.status || 'activo en tienda'
			}));
		} catch (err: any) {
			Logger.error(err);
			pageState.error = err.message || 'No se pudieron cargar los sobres';
		} finally {
			pageState.loading = false;
		}
	};

	const updateStatus = async (sobreId: string, newStatus: string) => {
		try {
			if (!supabase) throw new Error('Supabase client not initialized');

			const { error: updateError } = await supabase
				.from('cash_envelopes')
				.update({ status: newStatus })
				.eq('id', sobreId);

			if (updateError) throw updateError;

			pageState.sobres = pageState.sobres.map((s: Sobre) =>
				s.id === sobreId ? { ...s, status: newStatus } : s
			);
			pageState.updateError = '';
		} catch (err: any) {
			Logger.error(err);
			pageState.updateError = 'Error al actualizar el estado: ' + err.message;
		}
	};

	const inDateRange = (dateStr: string) => {
		if (!filterFrom && !filterTo) return true;
		const d = new Date(dateStr).toISOString().slice(0, 10);
		if (filterFrom && d < filterFrom) return false;
		if (filterTo && d > filterTo) return false;
		return true;
	};

	let filteredSobres = $derived(
		pageState.sobres.filter((s: Sobre) => {
			if (filterCashier && s.cashier !== filterCashier) return false;
			if (filterStore && s.store !== filterStore) return false;
			if (!inDateRange(s.date)) return false;
			return true;
		})
	);

	// Pagination calculations
	let totalPages = $derived(Math.ceil(filteredSobres.length / itemsPerPage));
	let paginatedSobres = $derived(
		filteredSobres.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
	);

	const handlePageChange = (page: number) => {
		currentPage = page;
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	onMount(loadSobres);
</script>

<div class="space-y-6">
	<h1 class="text-2xl md:text-3xl font-bold text-gray-900">Sobres generados</h1>

	{#if pageState.updateError}
		<AlertAny color="red" dismissable class="mb-4">
			<svelte:fragment slot="icon">
				<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
						clip-rule="evenodd"
					/>
				</svg>
			</svelte:fragment>
			<span class="font-medium">Error:</span>
			{pageState.updateError}
		</AlertAny>
	{/if}

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
							<option value={s}>{s}</option>
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

	{#if pageState.loading}
		<p class="text-sm text-slate-500">Cargando sobres...</p>
	{:else if pageState.error}
		<p class="text-sm text-red-600">{pageState.error}</p>
	{:else if !filteredSobres.length}
		<p class="text-sm text-slate-500">No hay sobres para los filtros seleccionados.</p>
	{:else}
		<!-- Desktop Table View -->
		<div class="hidden md:block overflow-hidden rounded-2xl border border-gray-100 shadow-soft">
			<table class="w-full text-sm">
				<thead>
					<tr class="bg-gray-50 border-b border-gray-100">
						<th class="px-6 py-4 text-left font-semibold text-gray-700">Fecha</th>
						<th class="px-6 py-4 text-left font-semibold text-gray-700">Cajero</th>
						<th class="px-6 py-4 text-left font-semibold text-gray-700">Tienda</th>
						<th class="px-6 py-4 text-left font-semibold text-gray-700">Valor sobre</th>
						<th class="px-6 py-4 text-left font-semibold text-gray-700">Estado</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100 bg-white">
					{#each paginatedSobres as s}
						<tr class="hover:bg-dark-orange-50/30 transition-colors duration-150">
							<td class="px-6 py-4 text-gray-600">{s.date}</td>
							<td class="px-6 py-4 text-gray-600">{s.cashier}</td>
							<td class="px-6 py-4">
								<span
									class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
								>
									{s.store}
								</span>
							</td>
							<td class="px-6 py-4 font-bold text-dark-orange-600">
								{s.sinSobre
									? '—'
									: `$${s.valorSobre?.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`}
							</td>
							<td class="px-6 py-4">
								<div class="relative">
									<select
										value={s.status}
										onchange={(e) => updateStatus(s.id, (e.target as HTMLSelectElement).value)}
										class="h-9 rounded-lg border border-gray-200 px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-dark-orange-500/20 focus:border-dark-orange-500 transition-all cursor-pointer hover:border-dark-orange-300"
									>
										{#each statusOptions as opt}
											<option value={opt}>{opt}</option>
										{/each}
									</select>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Mobile Card View -->
		<div class="md:hidden space-y-4">
			{#each paginatedSobres as s}
				<div class="bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden">
					<div class="p-5 space-y-4">
						<!-- Header -->
						<div class="flex items-start justify-between">
							<div>
								<p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha</p>
								<p class="text-base font-bold text-gray-900">{s.date}</p>
							</div>
							<div class="text-right">
								<p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Valor</p>
								<p class="text-base font-bold text-dark-orange-600">
									{s.sinSobre
										? 'Sin sobre'
										: `$${s.valorSobre?.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`}
								</p>
							</div>
						</div>

						<!-- Details -->
						<div class="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
							<div>
								<p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Cajero</p>
								<p class="text-sm font-medium text-gray-900">{s.cashier}</p>
							</div>
							<div>
								<p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Tienda</p>
								<span
									class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mt-1"
								>
									{s.store}
								</span>
							</div>
						</div>

						<!-- Status Selector -->
						<div class="pt-4 border-t border-gray-100">
							<label class="flex flex-col gap-2">
								<span class="text-xs font-medium text-gray-700 uppercase tracking-wide"
									>Estado del sobre</span
								>
								<select
									value={s.status}
									onchange={(e) => updateStatus(s.id, (e.target as HTMLSelectElement).value)}
									class="h-11 rounded-xl border border-gray-200 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-dark-orange-500/20 focus:border-dark-orange-500 transition-all font-medium text-gray-700"
								>
									{#each statusOptions as opt}
										<option value={opt}>{opt}</option>
									{/each}
								</select>
							</label>
						</div>
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
		onclick={loadSobres}
		class="mt-6 w-full md:w-auto px-6 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 shadow-soft hover:shadow-soft-lg transition-all active:scale-95"
	>
		↻ Recargar datos
	</button>
</div>
