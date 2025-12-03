<script lang="ts">
	import { onMount } from 'svelte';
	import { getStores } from '$lib/services/closures';
	import { Chart, registerables } from 'chart.js';
	import { Logger } from '$lib/utils/logger';

	let { data } = $props();
	let { supabase } = $derived(data);

	let selectedStore = $state('');
	let stores: string[] = $state([]);
	let loading = $state(true);

	// Métricas
	let totalSobresActivos = $state(0);
	let totalVentas = $state(0);
	let totalCajeros = $state(0);
	let totalTiendas = $state(0);
	let totalCierres = $state(0);

	// Datos para gráficos
	let descuadresPorMes: { month: string; count: number }[] = [];
	let descuadresPorCajero: { cashier: string; count: number }[] = [];

	let chartMeses: Chart | null = null;
	let chartCajeros: Chart | null = null;

	const loadDashboardData = async () => {
		loading = true;

		try {
			if (!supabase) throw new Error('Supabase not initialized');

			// Cargar tiendas
			stores = await getStores(supabase);

			// 1. Total sobres activos (filtrado por tienda si está seleccionada)
			let sobresQuery = supabase
				.from('cash_envelopes')
				.select('id, cash_closures!inner(stores!inner(name))', { count: 'exact', head: true })
				.eq('status', 'activo en tienda');

			if (selectedStore) {
				sobresQuery = sobresQuery.eq('cash_closures.stores.name', selectedStore);
			}

			const { count: sobresCount } = await sobresQuery;
			totalSobresActivos = sobresCount || 0;

			// 2. Total Cajeros
			const { count: cajerosCount } = await supabase
				.from('cashiers')
				.select('*', { count: 'exact', head: true });
			totalCajeros = cajerosCount || 0;

			// 3. Total Tiendas
			const { count: tiendasCount } = await supabase
				.from('stores')
				.select('*', { count: 'exact', head: true });
			totalTiendas = tiendasCount || 0;

			// 4. Total Cierres (filtrado por tienda si está seleccionada)
			let cierresCountQuery = supabase
				.from('cash_closures')
				.select('id, stores!inner(name)', { count: 'exact', head: true });

			if (selectedStore) {
				cierresCountQuery = cierresCountQuery.eq('stores.name', selectedStore);
			}

			const { count: cierresCount } = await cierresCountQuery;
			totalCierres = cierresCount || 0;

			// 5. Total ventas (filtrado por tienda si está seleccionada)
			let ventasQuery = supabase.from('cash_closures').select(`
          ef_real,
          cash_closure_channels (
            real_amount
          )
          ${selectedStore ? ', stores!inner (name)' : ''}
        `);

			if (selectedStore) {
				ventasQuery = ventasQuery.eq('stores.name', selectedStore);
			}

			const { data: ventasData } = await ventasQuery;

			totalVentas = (ventasData || []).reduce((sum, closure: any) => {
				const efectivoReal = closure.ef_real || 0;
				const channelsTotal = (closure.cash_closure_channels || []).reduce(
					(chSum: number, ch: any) => chSum + (ch.real_amount || 0),
					0
				);
				return sum + efectivoReal + channelsTotal;
			}, 0);

			// 3. Descuadres por mes (últimos 12 meses)
			let closuresDataQuery = supabase
				.from('cash_closures')
				.select(
					`
          date,
          ef_diferencia,
          stores!inner(name),
          cash_closure_channels (
            channel_name,
            system_amount,
            real_amount
          )
        `
				)
				.gte('date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

			if (selectedStore) {
				closuresDataQuery = closuresDataQuery.eq('stores.name', selectedStore);
			}

			const { data: closuresData } = await closuresDataQuery;

			const descuadresByMonth: Record<string, number> = {};

			(closuresData || []).forEach((closure: any) => {
				const month = closure.date.substring(0, 7); // YYYY-MM

				// Descuadre en efectivo (negativo)
				if (closure.ef_diferencia < 0) {
					descuadresByMonth[month] = (descuadresByMonth[month] || 0) + 1;
				}

				// Descuadres en canales (negativo)
				(closure.cash_closure_channels || []).forEach((ch: any) => {
					const diff = ch.real_amount - ch.system_amount;
					if (diff < 0) {
						descuadresByMonth[month] = (descuadresByMonth[month] || 0) + 1;
					}
				});
			});

			descuadresPorMes = Object.entries(descuadresByMonth)
				.map(([month, count]) => ({ month, count }))
				.sort((a, b) => a.month.localeCompare(b.month))
				.slice(-12);

			// 4. Descuadres por cajero
			let closuresWithCashierQuery = supabase.from('cash_closures').select(`
          ef_diferencia,
          cashiers (name),
          stores!inner(name),
          cash_closure_channels (
            channel_name,
            system_amount,
            real_amount
          )
        `);

			if (selectedStore) {
				closuresWithCashierQuery = closuresWithCashierQuery.eq('stores.name', selectedStore);
			}

			const { data: closuresWithCashier } = await closuresWithCashierQuery;

			const descuadresByCashier: Record<string, number> = {};

			(closuresWithCashier || []).forEach((closure: any) => {
				const cashierName = closure.cashiers?.name || 'Desconocido';

				// Descuadre en efectivo (negativo)
				if (closure.ef_diferencia < 0) {
					descuadresByCashier[cashierName] = (descuadresByCashier[cashierName] || 0) + 1;
				}

				// Descuadres en canales (negativo) - SOLO: dataphone, nequi, bancolombia
				const allowedChannels = [
					'dataphone',
					'transferencia_nequi',
					'transferencia_bancolombia'
				];
				(closure.cash_closure_channels || []).forEach((ch: any) => {
					if (allowedChannels.includes(ch.channel_name)) {
						const diff = ch.real_amount - ch.system_amount;
						if (diff < 0) {
							descuadresByCashier[cashierName] = (descuadresByCashier[cashierName] || 0) + 1;
						}
					}
				});
			});

			descuadresPorCajero = Object.entries(descuadresByCashier)
				.map(([cashier, count]) => ({ cashier, count }))
				.sort((a, b) => b.count - a.count)
				.slice(0, 10);

			// Renderizar gráficos
			renderCharts();
		} catch (err) {
			Logger.error('Error loading dashboard:', err);
		} finally {
			loading = false;
		}
	};

	const renderCharts = () => {
		// Destruir gráficos anteriores
		if (chartMeses) chartMeses.destroy();
		if (chartCajeros) chartCajeros.destroy();

		// Gráfico de meses
		const ctxMeses = document.getElementById('chartMeses') as HTMLCanvasElement;
		if (ctxMeses) {
			chartMeses = new Chart(ctxMeses, {
				type: 'bar',
				data: {
					labels: descuadresPorMes.map((d) => d.month),
					datasets: [
						{
							label: 'Descuadres',
							data: descuadresPorMes.map((d) => d.count),
							backgroundColor: 'rgba(239, 68, 68, 0.8)',
							borderColor: 'rgba(220, 38, 38, 1)',
							borderWidth: 2,
							borderRadius: 8,
							hoverBackgroundColor: 'rgba(220, 38, 38, 0.9)'
						}
					]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: {
							display: false
						},
						tooltip: {
							backgroundColor: 'rgba(15, 23, 42, 0.95)',
							titleColor: '#fff',
							bodyColor: '#fff',
							padding: 12,
							borderColor: 'rgba(148, 163, 184, 0.3)',
							borderWidth: 1,
							cornerRadius: 8,
							titleFont: {
								size: 13,
								weight: 'bold'
							},
							bodyFont: {
								size: 12
							}
						}
					},
					scales: {
						y: {
							beginAtZero: true,
							ticks: {
								stepSize: 1,
								color: '#64748b',
								font: {
									size: 11
								}
							},
							grid: {
								color: 'rgba(148, 163, 184, 0.1)'
							},
							border: {
								display: false
							}
						},
						x: {
							ticks: {
								color: '#64748b',
								font: {
									size: 11
								}
							},
							grid: {
								display: false
							},
							border: {
								display: false
							}
						}
					}
				}
			});
		}

		// Gráfico de cajeros (torta)
		const ctxCajeros = document.getElementById('chartCajeros') as HTMLCanvasElement;
		if (ctxCajeros) {
			chartCajeros = new Chart(ctxCajeros, {
				type: 'doughnut',
				data: {
					labels: descuadresPorCajero.map((d) => d.cashier),
					datasets: [
						{
							data: descuadresPorCajero.map((d) => d.count),
							backgroundColor: [
								'rgba(239, 68, 68, 0.8)',
								'rgba(249, 115, 22, 0.8)',
								'rgba(234, 179, 8, 0.8)',
								'rgba(34, 197, 94, 0.8)',
								'rgba(59, 130, 246, 0.8)',
								'rgba(168, 85, 247, 0.8)',
								'rgba(236, 72, 153, 0.8)',
								'rgba(148, 163, 184, 0.8)',
								'rgba(100, 116, 139, 0.8)',
								'rgba(71, 85, 105, 0.8)'
							],
							borderColor: '#fff',
							borderWidth: 3,
							hoverBorderWidth: 4,
							hoverOffset: 8
						}
					]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: {
							position: 'right',
							labels: {
								color: '#475569',
								font: {
									size: 11,
									family: "'Inter', 'system-ui', sans-serif"
								},
								padding: 12,
								usePointStyle: true,
								pointStyle: 'circle'
							}
						},
						tooltip: {
							backgroundColor: 'rgba(15, 23, 42, 0.95)',
							titleColor: '#fff',
							bodyColor: '#fff',
							padding: 12,
							borderColor: 'rgba(148, 163, 184, 0.3)',
							borderWidth: 1,
							cornerRadius: 8,
							titleFont: {
								size: 13,
								weight: 'bold'
							},
							bodyFont: {
								size: 12
							},
							callbacks: {
								label: function (context) {
									const label = context.label || '';
									const value = context.parsed || 0;
									const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
									const percentage = ((value / total) * 100).toFixed(1);
									return `${label}: ${value} (${percentage}%)`;
								}
							}
						}
					}
				}
			});
		}
	};

	onMount(() => {
		Chart.register(...registerables);
		loadDashboardData();
	});

	// Debounce filter changes to avoid excessive API calls
	let filterTimeout: ReturnType<typeof setTimeout>;
	$effect(() => {
		if (selectedStore !== undefined) {
			clearTimeout(filterTimeout);
			filterTimeout = setTimeout(() => {
				loadDashboardData();
			}, 300); // Wait 300ms after user stops changing filters
		}
	});
</script>

<div class="space-y-4 md:space-y-6">
	<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
		<h1 class="text-xl md:text-2xl font-semibold">Dashboard</h1>
		<a
			href="/registro"
			class="w-full sm:w-auto px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 active:bg-slate-950 transition-colors text-center"
		>
			Registrar Cierre
		</a>
	</div>

	<!-- Filtro de tienda -->
	<section class="bg-white rounded-xl shadow-sm border border-slate-200 p-3 md:p-4">
		<label class="flex flex-col gap-2 w-full md:max-w-xs">
			<span class="text-sm font-semibold text-slate-700">Filtrar por tienda</span>
			<select
				bind:value={selectedStore}
				class="h-10 md:h-9 rounded-lg border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
			>
				<option value="">Todas las tiendas</option>
				{#each stores as store}
					<option value={store}>{store}</option>
				{/each}
			</select>
		</label>
	</section>

	{#if loading}
		<p class="text-slate-500">Cargando datos...</p>
	{:else}
		<!-- Tarjetas de métricas -->
		<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
			<!-- Total Sobres Activos -->
			<div
				class="bg-linear-to-br from-yellow-900 to-yellow-950 rounded-xl shadow-lg p-4 text-white"
			>
				<div class="flex items-center justify-between">
					<div class="flex-1">
						<p class="text-amber-50 text-xs font-medium">Sobres Activos</p>
						<p class="text-2xl font-bold mt-1">{totalSobresActivos}</p>
					</div>
					<div class="bg-white/20 rounded-full p-2 ml-2">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
							/>
						</svg>
					</div>
				</div>
			</div>

			<!-- Total Ventas -->
			<div
				class="bg-linear-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-4 text-white"
			>
				<div class="flex items-center justify-between">
					<div class="flex-1">
						<p class="text-amber-50 text-xs font-medium">Total Ventas</p>
						<p class="text-2xl font-bold mt-1">
							${totalVentas.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
						</p>
					</div>
					<div class="bg-white/20 rounded-full p-2 ml-2">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
				</div>
			</div>

			<!-- Cajeros Registrados -->
			<div class="bg-linear-to-br from-cyan-500 to-cyan-600 rounded-xl shadow-lg p-4 text-white">
				<div class="flex items-center justify-between">
					<div class="flex-1">
						<p class="text-cyan-50 text-xs font-medium">Cajeros</p>
						<p class="text-2xl font-bold mt-1">{totalCajeros}</p>
					</div>
					<div class="bg-white/20 rounded-full p-2 ml-2">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
							/>
						</svg>
					</div>
				</div>
			</div>

			<!-- Tiendas -->
			<div
				class="bg-linear-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-4 text-white"
			>
				<div class="flex items-center justify-between">
					<div class="flex-1">
						<p class="text-purple-50 text-xs font-medium">Tiendas</p>
						<p class="text-2xl font-bold mt-1">{totalTiendas}</p>
					</div>
					<div class="bg-white/20 rounded-full p-2 ml-2">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
							/>
						</svg>
					</div>
				</div>
			</div>

			<!-- Total Cierres -->
			<div class="bg-linear-to-br from-lime-400 to-lime-500 rounded-xl shadow-lg p-4 text-white">
				<div class="flex items-center justify-between">
					<div class="flex-1">
						<p class="text-lime-50 text-xs font-medium">Nº Cierres</p>
						<p class="text-2xl font-bold mt-1">{totalCierres}</p>
					</div>
					<div class="bg-white/20 rounded-full p-2 ml-2">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
							/>
						</svg>
					</div>
				</div>
			</div>
		</div>

		<!-- Gráficos -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- Gráfico de meses -->
			<div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
				<h2 class="text-lg font-semibold text-slate-800 mb-4">Descuadres por Mes</h2>
				<div class="h-80">
					<canvas id="chartMeses"></canvas>
				</div>
			</div>

			<!-- Gráfico de cajeros -->
			<div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
				<h2 class="text-lg font-semibold text-slate-800 mb-4">Descuadres por Cajero</h2>
				<div class="h-80">
					<canvas id="chartCajeros"></canvas>
				</div>
			</div>
		</div>
	{/if}
</div>
