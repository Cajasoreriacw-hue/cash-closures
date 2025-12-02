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

	let pageState = $state<{ sobres: Sobre[]; updateError: string; loading: boolean; error: string | null }>({
		sobres: [],
		updateError: '',
		loading: true,
		error: null
	});

	let filterCashier = $state('');
	let filterStore = $state('');
	let filterFrom = $state('');
	let filterTo = $state('');
	let resultLimit = $state(50);

	let cashierOptions: string[] = $state([]);
	let storeOptions: string[] = $state([]);

	// Pagination state
	let currentPage = $state(1);
	let itemsPerPage = $state(20);

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
				.order('cash_closures(date)', { ascending: false })
				.limit(resultLimit);

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

			pageState.sobres = pageState.sobres.map((s: Sobre) => (s.id === sobreId ? { ...s, status: newStatus } : s));
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

<h1 class="text-xl md:text-2xl font-semibold mb-4">Sobres generados</h1>

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

<section class="bg-white rounded-xl shadow-sm border border-slate-200 p-3 md:p-4 mb-4">
	<h2 class="text-xs md:text-sm font-semibold text-slate-700 mb-3">Filtros</h2>
	<div class="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
		<label class="flex flex-col gap-1.5">
			<span class="text-xs md:text-sm text-slate-600">Cajero</span>
			<select
				bind:value={filterCashier}
				class="h-10 md:h-9 rounded-lg border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
			>
				<option value="">Todos</option>
				{#each cashierOptions as c}
					<option value={c}>{c}</option>
				{/each}
			</select>
		</label>
		<label class="flex flex-col gap-1.5">
			<span class="text-xs md:text-sm text-slate-600">Tienda / sede</span>
			<select
				bind:value={filterStore}
				class="h-10 md:h-9 rounded-lg border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
			>
				<option value="">Todas</option>
				{#each storeOptions as s}
					<option value={s}>{s}</option>
				{/each}
			</select>
		</label>
		<label class="flex flex-col gap-1.5">
			<span class="text-xs md:text-sm text-slate-600">Desde</span>
			<input
				type="date"
				bind:value={filterFrom}
				class="h-10 md:h-9 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
			/>
		</label>
		<label class="flex flex-col gap-1.5">
			<span class="text-xs md:text-sm text-slate-600">Hasta</span>
			<input
				type="date"
				bind:value={filterTo}
				class="h-10 md:h-9 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
			/>
		</label>
		<label class="flex flex-col gap-1.5">
			<span class="text-xs md:text-sm text-slate-600">Límite</span>
			<select
				bind:value={resultLimit}
				onchange={loadSobres}
				class="h-10 md:h-9 rounded-lg border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
			>
				<option value={10}>10</option>
				<option value={50}>50</option>
				<option value={100}>100</option>
				<option value={1000}>1000</option>
			</select>
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
	<div class="hidden md:block overflow-x-auto">
		<table class="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
			<thead>
				<tr class="bg-slate-100">
					<th class="px-3 py-2 text-left">Fecha</th>
					<th class="px-3 py-2 text-left">Cajero</th>
					<th class="px-3 py-2 text-left">Tienda</th>
					<th class="px-3 py-2 text-left">Valor sobre</th>
					<th class="px-3 py-2 text-left">Estado</th>
				</tr>
			</thead>
			<tbody>
				{#each paginatedSobres as s}
					<tr class="odd:bg-white even:bg-slate-50 hover:bg-blue-50 transition-colors">
						<td class="px-3 py-2">{s.date}</td>
						<td class="px-3 py-2">{s.cashier}</td>
						<td class="px-3 py-2">{s.store}</td>
						<td class="px-3 py-2 font-semibold text-blue-700">
							{s.sinSobre
								? '—'
								: `$${s.valorSobre?.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`}
						</td>
						<td class="px-3 py-2">
							<select
								value={s.status}
								onchange={(e) => updateStatus(s.id, (e.target as HTMLSelectElement).value)}
								class="h-8 rounded-lg border border-slate-200 px-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								{#each statusOptions as opt}
									<option value={opt}>{opt}</option>
								{/each}
							</select>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Mobile Card View -->
	<div class="md:hidden space-y-3">
		{#each paginatedSobres as s}
			<div class="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
				<div class="p-4 space-y-3">
					<!-- Header -->
					<div class="flex items-start justify-between">
						<div>
							<p class="text-xs text-slate-500">Fecha</p>
							<p class="text-sm font-semibold text-slate-900">{s.date}</p>
						</div>
						<div class="text-right">
							<p class="text-xs text-slate-500">Valor</p>
							<p class="text-sm font-bold text-blue-600">
								{s.sinSobre
									? 'Sin sobre'
									: `$${s.valorSobre?.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`}
							</p>
						</div>
					</div>

					<!-- Details -->
					<div class="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
						<div>
							<p class="text-xs text-slate-500">Cajero</p>
							<p class="text-sm font-medium text-slate-900">{s.cashier}</p>
						</div>
						<div>
							<p class="text-xs text-slate-500">Tienda</p>
							<p class="text-sm font-medium text-slate-900">{s.store}</p>
						</div>
					</div>

					<!-- Status Selector -->
					<div class="pt-2 border-t border-slate-100">
						<label class="flex flex-col gap-2">
							<span class="text-xs font-medium text-slate-700">Estado del sobre</span>
							<select
								value={s.status}
								onchange={(e) => updateStatus(s.id, (e.target as HTMLSelectElement).value)}
								class="h-11 rounded-lg border-2 border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
	class="mt-4 w-full md:w-auto px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 active:bg-slate-950 transition-colors"
>
	Recargar
</button>
