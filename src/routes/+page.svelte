<script lang="ts">
	import { onMount } from 'svelte';
	import { getStores } from '$lib/services/closures';
	import { Chart, registerables } from 'chart.js';
	import { Logger } from '$lib/utils/logger';

	import type { Store } from '$lib/services/closures';
	import { getStoresData } from '$lib/services/closures';

	let { data } = $props();
	let { supabase } = $derived(data);

	let selectedStore = $state('');
	let stores: Store[] = $state([]);
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

			// 1. Iniciar cargas independientes en paralelo
			const storesPromise = getStoresData(supabase);
			const cajerosPromise = supabase.from('cashiers').select('*', { count: 'exact', head: true });
			const tiendasPromise = supabase.from('stores').select('*', { count: 'exact', head: true });

			// Esperar a que las tiendas carguen para poder filtrar por ID si es necesario
			const [storesData, cajerosRes, tiendasRes] = await Promise.all([
				storesPromise,
				cajerosPromise,
				tiendasPromise
			]);

			stores = storesData;
			totalCajeros = cajerosRes.count || 0;
			totalTiendas = tiendasRes.count || 0;

			// Obtener ID de la tienda seleccionada
			const selectedStoreObj = stores.find((s) => s.name === selectedStore);
			const selectedStoreId = selectedStoreObj?.id;

			// 2. Preparar consultas dependientes del filtro
			// Sobres Activos
			let sobresQuery = supabase
				.from('cash_envelopes')
				.select('id, cash_closures!inner(store_id)', { count: 'exact', head: true })
				.eq('status', 'activo en tienda');

			if (selectedStoreId) {
				sobresQuery = sobresQuery.eq('cash_closures.store_id', selectedStoreId);
			}

			// Total Cierres
			let cierresCountQuery = supabase
				.from('cash_closures')
				.select('id', { count: 'exact', head: true });

			if (selectedStoreId) {
				cierresCountQuery = cierresCountQuery.eq('store_id', selectedStoreId);
			}

			// Total Ventas
			let ventasQuery = supabase.from('cash_closures').select(`
          ef_real,
          cash_closure_channels (
            real_amount
          )
        `);

			if (selectedStoreId) {
				ventasQuery = ventasQuery.eq('store_id', selectedStoreId);
			}

			// Descuadres por Mes
			let closuresDataQuery = supabase
				.from('cash_closures')
				.select(
					`
          date,
          ef_diferencia,
          cash_closure_channels (
            channel_name,
            system_amount,
            real_amount
          )
        `
				)
				.gte('date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

			if (selectedStoreId) {
				closuresDataQuery = closuresDataQuery.eq('store_id', selectedStoreId);
			}

			// Descuadres por Cajero
			let closuresWithCashierQuery = supabase.from('cash_closures').select(`
          ef_diferencia,
          cashiers (name),
          cash_closure_channels (
            channel_name,
            system_amount,
            real_amount
          )
        `);

			if (selectedStoreId) {
				closuresWithCashierQuery = closuresWithCashierQuery.eq('store_id', selectedStoreId);
			}

			// 3. Ejecutar todas las consultas de datos en paralelo
			const [sobresRes, cierresRes, ventasRes, closuresDataRes, closuresWithCashierRes] =
				await Promise.all([
					sobresQuery,
					cierresCountQuery,
					ventasQuery,
					closuresDataQuery,
					closuresWithCashierQuery
				]);

			// 4. Procesar resultados
			totalSobresActivos = sobresRes.count || 0;
			totalCierres = cierresRes.count || 0;

			// Procesar Ventas
			totalVentas = (ventasRes.data || []).reduce((sum, closure: any) => {
				const efectivoReal = closure.ef_real || 0;
				const channelsTotal = (closure.cash_closure_channels || []).reduce(
					(chSum: number, ch: any) => chSum + (ch.real_amount || 0),
					0
				);
				return sum + efectivoReal + channelsTotal;
			}, 0);

			// Procesar Descuadres por Mes
			const descuadresByMonth: Record<string, number> = {};
			(closuresDataRes.data || []).forEach((closure: any) => {
				const month = closure.date.substring(0, 7);
				if (closure.ef_diferencia < 0) {
					descuadresByMonth[month] = (descuadresByMonth[month] || 0) + 1;
				}
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

			// Procesar Descuadres por Cajero
			const descuadresByCashier: Record<string, number> = {};
			(closuresWithCashierRes.data || []).forEach((closure: any) => {
				const cashierName = closure.cashiers?.name || 'Desconocido';
				if (closure.ef_diferencia < 0) {
					descuadresByCashier[cashierName] = (descuadresByCashier[cashierName] || 0) + 1;
				}
				const allowedChannels = ['dataphone', 'transferencia_nequi', 'transferencia_bancolombia'];
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
		// Helper to safely destroy chart
		const destroyChart = (chart: Chart | null) => {
			if (chart) {
				chart.destroy();
			}
			return null;
		};

		// Destruir gráficos anteriores
		chartMeses = destroyChart(chartMeses);
		chartCajeros = destroyChart(chartCajeros);

		// Wait for next tick to ensure canvas is ready/cleared
		setTimeout(() => {
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
								backgroundColor: 'rgba(31, 173, 224, 0.8)',
								borderColor: 'rgba(24, 138, 180, 1)',
								borderWidth: 2,
								borderRadius: 10,
								hoverBackgroundColor: 'rgba(24, 138, 180, 0.9)'
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
									'rgba(31, 173, 224, 0.85)', // fresh-sky-500
									'rgba(75, 189, 231, 0.85)', // fresh-sky-400
									'rgba(120, 206, 237, 0.85)', // fresh-sky-300
									'rgba(24, 138, 180, 0.85)', // fresh-sky-600
									'rgba(18, 104, 135, 0.85)', // fresh-sky-700
									'rgba(165, 222, 243, 0.85)', // fresh-sky-200
									'rgba(210, 239, 249, 0.85)', // fresh-sky-100
									'rgba(233, 247, 252, 0.85)', // fresh-sky-50
									'rgba(12, 69, 90, 0.85)', // fresh-sky-800
									'rgba(6, 35, 45, 0.85)' // fresh-sky-900
								],
								borderColor: '#fff',
								borderWidth: 3,
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
								callbacks: {
									label: function (context) {
										const label = context.label || '';
										const value = context.parsed || 0;
										const total = context.dataset.data.reduce((a: any, b: any) => a + b, 0);
										const percentage = ((value / total) * 100).toFixed(1);
										return `${label}: ${value} (${percentage}%)`;
									}
								}
							}
						}
					}
				});
			}
		}, 0);
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

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
		<h1 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
		<a
			href="/registro"
			class="w-full sm:w-auto px-6 py-3 bg-fresh-sky-600 text-white text-sm font-semibold rounded-xl shadow-soft hover:bg-fresh-sky-700 hover:shadow-soft-lg transition-all duration-200 text-center active:scale-95"
		>
			Registrar Cierre
		</a>
	</div>

	<!-- Filtro de tienda -->
	<section
		class="bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-gray-100 dark:border-slate-700 p-4 md:p-5 transition-colors"
	>
		<label class="flex flex-col gap-2 w-full md:max-w-xs">
			<span class="text-sm font-semibold text-gray-700 dark:text-gray-300">Filtrar por tienda</span>
			<select
				bind:value={selectedStore}
				class="h-11 rounded-xl border border-gray-200 dark:border-slate-600 px-4 text-sm bg-white dark:bg-slate-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-fresh-sky-500/20 focus:border-fresh-sky-500 transition-all duration-200"
			>
				<option value="">Todas las tiendas</option>
				{#each stores as store}
					<option value={store.name}>{store.name}</option>
				{/each}
			</select>
		</label>
	</section>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="text-center">
				<div
					class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-fresh-sky-200 border-t-fresh-sky-600 mb-2"
				></div>
				<p class="text-sm text-gray-500 dark:text-gray-400">Cargando datos...</p>
			</div>
		</div>
	{:else}
		<!-- Tarjetas de métricas -->
		<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
			<!-- Total Sobres Activos -->
			<div
				class="relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl shadow-soft dark:shadow-none dark:border dark:border-slate-700 p-4 md:p-5 transition-all duration-300 group hover:shadow-soft-lg"
			>
				<div class="relative">
					<div class="flex items-center justify-between">
						<div class="flex-1 min-w-0">
							<p class="text-gray-500 dark:text-gray-400 text-xs font-medium truncate mb-1">
								Sobres Activos
							</p>
							<p class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
								{totalSobresActivos}
							</p>
						</div>
						<div
							class="bg-fresh-sky-50 dark:bg-fresh-sky-900/30 rounded-xl p-2.5 ml-2 shrink-0 text-fresh-sky-600 dark:text-fresh-sky-400"
						>
							<svg
								class="w-5 h-5 md:w-6 md:h-6"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
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
			</div>

			<!-- Total Ventas -->
			<div
				class="relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl shadow-soft dark:shadow-none dark:border dark:border-slate-700 p-4 md:p-5 transition-all duration-300 group hover:shadow-soft-lg"
			>
				<div class="relative">
					<div class="flex items-center justify-between">
						<div class="flex-1 min-w-0">
							<p class="text-gray-500 dark:text-gray-400 text-xs font-medium truncate mb-1">
								Total Ventas
							</p>
							<p class="text-lg md:text-2xl font-bold truncate text-gray-900 dark:text-white">
								${totalVentas.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
							</p>
						</div>
						<div
							class="bg-green-50 dark:bg-green-900/30 rounded-xl p-2.5 ml-2 shrink-0 text-green-600 dark:text-green-400"
						>
							<svg
								class="w-5 h-5 md:w-6 md:h-6"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
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
			</div>

			<!-- Cajeros Registrados -->
			<div
				class="relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl shadow-soft dark:shadow-none dark:border dark:border-slate-700 p-4 md:p-5 transition-all duration-300 group hover:shadow-soft-lg"
			>
				<div class="relative">
					<div class="flex items-center justify-between">
						<div class="flex-1 min-w-0">
							<p class="text-gray-500 dark:text-gray-400 text-xs font-medium truncate mb-1">
								Cajeros
							</p>
							<p class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
								{totalCajeros}
							</p>
						</div>
						<div
							class="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-2.5 ml-2 shrink-0 text-purple-600 dark:text-purple-400"
						>
							<svg
								class="w-5 h-5 md:w-6 md:h-6"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
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
			</div>

			<!-- Tiendas -->
			<div
				class="relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl shadow-soft dark:shadow-none dark:border dark:border-slate-700 p-4 md:p-5 transition-all duration-300 group hover:shadow-soft-lg"
			>
				<div class="relative">
					<div class="flex items-center justify-between">
						<div class="flex-1 min-w-0">
							<p class="text-gray-500 dark:text-gray-400 text-xs font-medium truncate mb-1">
								Tiendas
							</p>
							<p class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
								{totalTiendas}
							</p>
						</div>
						<div
							class="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-2.5 ml-2 shrink-0 text-indigo-600 dark:text-indigo-400"
						>
							<svg
								class="w-5 h-5 md:w-6 md:h-6"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
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
			</div>

			<!-- Total Cierres -->
			<div
				class="relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl shadow-soft dark:shadow-none dark:border dark:border-slate-700 p-4 md:p-5 transition-all duration-300 group hover:shadow-soft-lg"
			>
				<div class="relative">
					<div class="flex items-center justify-between">
						<div class="flex-1 min-w-0">
							<p class="text-gray-500 dark:text-gray-400 text-xs font-semibold truncate mb-1">
								Nº Cierres
							</p>
							<p class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
								{totalCierres}
							</p>
						</div>
						<div
							class="bg-pink-50 dark:bg-pink-900/30 rounded-xl p-2.5 ml-2 shrink-0 text-pink-600 dark:text-pink-400"
						>
							<svg
								class="w-5 h-5 md:w-6 md:h-6"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
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
		</div>

		<!-- Gráficos -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
			<!-- Gráfico de meses -->
			<div
				class="bg-white dark:bg-slate-800 rounded-2xl shadow-soft dark:shadow-none dark:border dark:border-slate-700 p-5 md:p-6 hover:shadow-soft-lg transition-all duration-300"
			>
				<h2 class="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
					Descuadres por Mes
				</h2>
				<div class="h-64 md:h-80">
					<canvas id="chartMeses"></canvas>
				</div>
			</div>

			<!-- Gráfico de cajeros -->
			<div
				class="bg-white dark:bg-slate-800 rounded-2xl shadow-soft dark:shadow-none dark:border dark:border-slate-700 p-5 md:p-6 hover:shadow-soft-lg transition-all duration-300"
			>
				<h2 class="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
					Descuadres por Cajero
				</h2>
				<div class="h-64 md:h-80">
					<canvas id="chartCajeros"></canvas>
				</div>
			</div>
		</div>
	{/if}
</div>
