<script lang="ts">
	import { onMount } from 'svelte';
	import Papa from 'papaparse';
	import * as XLSX from 'xlsx';
	import { Chart, registerables } from 'chart.js';
	import { Alert } from 'flowbite-svelte';
	import { Logger } from '$lib/utils/logger';
	import { getStoresData } from '$lib/services/closures';
	import {
		parseExpenseRow,
		batchInsertExpenses,
		getExpenseStats,
		getExpenseCategories,
		cleanStoreName,
		type ExpenseCSVRow,
		type ProcessedExpense,
		type ExpenseStats
	} from '$lib/services/expenses';

	let { data } = $props();
	let { supabase } = $derived(data);

	// Upload state
	let uploading = $state(false);
	let uploadProgress = $state(0);
	let uploadStatus = $state('');
	let uploadError = $state('');
	let uploadSuccess = $state('');

	// File input
	let fileInput: HTMLInputElement;
	let selectedFile: File | null = $state(null);

	// Preview data
	let previewData: ProcessedExpense[] = $state([]);
	let showPreview = $state(false);

	// Dashboard state
	let loading = $state(true);
	let stats: ExpenseStats | null = $state(null);

	// Filters
	let selectedStore = $state('');
	let selectedCategory = $state('');
	let startDate = $state('');
	let endDate = $state('');

	// Data for filters
	let stores: { id: string; name: string }[] = $state([]);
	let categories: string[] = $state([]);

	// Charts
	let chartCategory: Chart | null = null;
	let chartStore: Chart | null = null;
	let chartMonth: Chart | null = null;

	/**
	 * Load dashboard data
	 */
	const loadDashboard = async () => {
		loading = true;
		try {
			if (!supabase) throw new Error('Supabase not initialized');

			// Load stores and categories in parallel
			const [storesData, categoriesData] = await Promise.all([
				getStoresData(supabase),
				getExpenseCategories(supabase)
			]);

			stores = storesData;
			categories = categoriesData;

			// Load stats with filters
			const filters: any = {};
			if (startDate) filters.startDate = startDate;
			if (endDate) filters.endDate = endDate;
			if (selectedStore) {
				const store = stores.find((s) => s.name === selectedStore);
				if (store) filters.storeId = store.id;
			}
			if (selectedCategory) filters.category = selectedCategory;

			stats = await getExpenseStats(supabase, filters);

			// Render charts
			renderCharts();
		} catch (err) {
			Logger.error('Error loading dashboard:', err);
			uploadError = 'Error al cargar el dashboard';
		} finally {
			loading = false;
		}
	};

	/**
	 * Render charts
	 */
	const renderCharts = () => {
		if (!stats) return;

		// Helper to safely destroy chart
		const destroyChart = (chart: Chart | null) => {
			if (chart) {
				chart.destroy();
			}
			return null;
		};

		// Destroy previous charts
		chartCategory = destroyChart(chartCategory);
		chartStore = destroyChart(chartStore);
		chartMonth = destroyChart(chartMonth);

		// Wait for next tick to ensure canvas is ready/cleared
		setTimeout(() => {
			// Category Chart (Donut)
			const ctxCategory = document.getElementById('chartCategory') as HTMLCanvasElement;
			if (ctxCategory && stats?.byCategory && stats.byCategory.length > 0) {
				chartCategory = new Chart(ctxCategory, {
					type: 'doughnut',
					data: {
						labels: stats.byCategory.map((c) => c.category),
						datasets: [
							{
								data: stats.byCategory.map((c) => c.total),
								backgroundColor: [
									'rgba(239, 68, 68, 0.8)',
									'rgba(249, 115, 22, 0.8)',
									'rgba(234, 179, 8, 0.8)',
									'rgba(34, 197, 94, 0.8)',
									'rgba(59, 130, 246, 0.8)',
									'rgba(168, 85, 247, 0.8)',
									'rgba(236, 72, 153, 0.8)',
									'rgba(148, 163, 184, 0.8)'
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
									font: { size: 11, family: "'Inter', 'system-ui', sans-serif" },
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
										const formatted = value.toLocaleString('es-CO', { maximumFractionDigits: 0 });
										return `${label}: $${formatted}`;
									}
								}
							}
						}
					}
				});
			}

			// Store Chart (Bar)
			const ctxStore = document.getElementById('chartStore') as HTMLCanvasElement;
			if (ctxStore && stats?.byStore && stats.byStore.length > 0) {
				chartStore = new Chart(ctxStore, {
					type: 'bar',
					data: {
						labels: stats.byStore.map((s) => s.store),
						datasets: [
							{
								label: 'Gastos',
								data: stats.byStore.map((s) => s.total),
								backgroundColor: 'rgba(59, 130, 246, 0.8)',
								borderColor: 'rgba(37, 99, 235, 1)',
								borderWidth: 2,
								borderRadius: 8,
								hoverBackgroundColor: 'rgba(37, 99, 235, 0.9)'
							}
						]
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						indexAxis: 'y',
						plugins: {
							legend: { display: false },
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
										const value = context.parsed.x || 0;
										const formatted = value.toLocaleString('es-CO', { maximumFractionDigits: 0 });
										return `Total: $${formatted}`;
									}
								}
							}
						},
						scales: {
							x: {
								beginAtZero: true,
								ticks: {
									color: '#64748b',
									font: { size: 11 },
									callback: function (value) {
										return (
											'$' + Number(value).toLocaleString('es-CO', { maximumFractionDigits: 0 })
										);
									}
								},
								grid: { color: 'rgba(148, 163, 184, 0.1)' },
								border: { display: false }
							},
							y: {
								ticks: { color: '#64748b', font: { size: 11 } },
								grid: { display: false },
								border: { display: false }
							}
						}
					}
				});
			}

			// Month Chart (Line)
			const ctxMonth = document.getElementById('chartMonth') as HTMLCanvasElement;
			if (ctxMonth && stats?.byMonth && stats.byMonth.length > 0) {
				chartMonth = new Chart(ctxMonth, {
					type: 'line',
					data: {
						labels: stats.byMonth.map((m) => m.month),
						datasets: [
							{
								label: 'Gastos Mensuales',
								data: stats.byMonth.map((m) => m.total),
								backgroundColor: 'rgba(168, 85, 247, 0.1)',
								borderColor: 'rgba(168, 85, 247, 1)',
								borderWidth: 3,
								fill: true,
								tension: 0.4,
								pointBackgroundColor: 'rgba(168, 85, 247, 1)',
								pointBorderColor: '#fff',
								pointBorderWidth: 2,
								pointRadius: 5,
								pointHoverRadius: 7
							}
						]
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						plugins: {
							legend: { display: false },
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
										const value = context.parsed.y || 0;
										const formatted = value.toLocaleString('es-CO', { maximumFractionDigits: 0 });
										return `Total: $${formatted}`;
									}
								}
							}
						},
						scales: {
							y: {
								beginAtZero: true,
								ticks: {
									color: '#64748b',
									font: { size: 11 },
									callback: function (value) {
										return (
											'$' + Number(value).toLocaleString('es-CO', { maximumFractionDigits: 0 })
										);
									}
								},
								grid: { color: 'rgba(148, 163, 184, 0.1)' },
								border: { display: false }
							},
							x: {
								ticks: { color: '#64748b', font: { size: 11 } },
								grid: { display: false },
								border: { display: false }
							}
						}
					}
				});
			}
		}, 0);
	};

	/**
	 * Handle file selection
	 */
	const handleFileSelect = (event: Event) => {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			selectedFile = target.files[0];
			uploadError = '';
			uploadSuccess = '';
			showPreview = false;
		}
	};

	/**
	 * Parse Excel file to ExpenseCSVRow array
	 */
	const parseExcelFile = (file: File): Promise<ExpenseCSVRow[]> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();

			reader.onload = (e) => {
				try {
					const data = e.target?.result;
					const workbook = XLSX.read(data, { type: 'binary' });

					// Get first sheet
					const sheetName = workbook.SheetNames[0];
					const worksheet = workbook.Sheets[sheetName];

					// Convert to JSON
					const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });

					// Find header row (first non-empty row)
					let headerRowIndex = 0;
					for (let i = 0; i < jsonData.length; i++) {
						if (jsonData[i] && jsonData[i].length > 0) {
							headerRowIndex = i;
							break;
						}
					}

					const headers = jsonData[headerRowIndex];
					const rows = jsonData.slice(headerRowIndex + 1);

					// Map to ExpenseCSVRow format
					const expenses: ExpenseCSVRow[] = rows
						.filter(
							(row: any[]) =>
								row &&
								row.length > 0 &&
								row.some((cell) => cell !== null && cell !== undefined && cell !== '')
						)
						.map((row: any[]) => {
							const expense: any = {};
							headers.forEach((header: string, index: number) => {
								expense[header] =
									row[index] !== undefined && row[index] !== null ? String(row[index]) : '';
							});
							return expense as ExpenseCSVRow;
						});

					resolve(expenses);
				} catch (error) {
					reject(error);
				}
			};

			reader.onerror = () => reject(new Error('Error al leer el archivo'));
			reader.readAsBinaryString(file);
		});
	};

	/**
	 * Preview file (CSV or Excel)
	 */
	const previewFile = async () => {
		if (!selectedFile) {
			uploadError = 'Por favor selecciona un archivo';
			return;
		}

		uploading = true;
		uploadError = '';
		uploadStatus = 'Procesando archivo...';

		try {
			const storesData = await getStoresData(supabase);
			const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();

			let expenseData: ExpenseCSVRow[] = [];

			if (fileExtension === 'xlsx' || fileExtension === 'xls') {
				// Process Excel file
				expenseData = await parseExcelFile(selectedFile);
			} else {
				// Process CSV file
				await new Promise<void>((resolve, reject) => {
					Papa.parse<ExpenseCSVRow>(selectedFile!, {
						header: true,
						skipEmptyLines: true,
						complete: (results) => {
							if (results.errors.length > 0) {
								reject(new Error(results.errors[0].message));
								return;
							}
							expenseData = results.data;
							resolve();
						},
						error: (error) => reject(error)
					});
				});
			}

			// Process first 10 rows for preview
			const preview = expenseData.slice(0, 10).map((row) => parseExpenseRow(row, storesData));

			previewData = preview;
			showPreview = true;
			uploadStatus = `Vista previa: ${expenseData.length} registros encontrados`;
			uploading = false;
		} catch (err: any) {
			Logger.error('Error previewing file');
			uploadError = 'Error al procesar el archivo';
			uploading = false;
		}
	};

	/**
	 * Preview CSV file (deprecated - use previewFile instead)
	 */
	const previewCSV = previewFile;

	/**
	 * Upload and process file (CSV or Excel)
	 */
	const uploadCSV = async () => {
		if (!selectedFile) {
			uploadError = 'Por favor selecciona un archivo';
			return;
		}

		uploading = true;
		uploadError = '';
		uploadSuccess = '';
		uploadProgress = 0;
		uploadStatus = 'Procesando archivo...';

		try {
			const storesData = await getStoresData(supabase);
			const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();

			let expenseData: ExpenseCSVRow[] = [];

			if (fileExtension === 'xlsx' || fileExtension === 'xls') {
				// Process Excel file
				expenseData = await parseExcelFile(selectedFile);
			} else {
				// Process CSV file
				await new Promise<void>((resolve, reject) => {
					Papa.parse<ExpenseCSVRow>(selectedFile!, {
						header: true,
						skipEmptyLines: true,
						complete: (results) => {
							if (results.errors.length > 0) {
								reject(new Error(results.errors[0].message));
								return;
							}
							expenseData = results.data;
							resolve();
						},
						error: (error) => reject(error)
					});
				});
			}

			uploadStatus = `Procesando ${expenseData.length} registros...`;

			// Parse all rows
			const expenses = expenseData.map((row) => parseExpenseRow(row, storesData).expense);

			uploadProgress = 50;
			uploadStatus = 'Guardando en la base de datos...';

			// Batch insert
			const result = await batchInsertExpenses(supabase, expenses, 100);

			uploadProgress = 100;

			if (result.errors > 0) {
				uploadError = `Se procesaron ${result.success} registros con ${result.errors} errores`;
			} else {
				uploadSuccess = `¡Éxito! Se importaron ${result.success} registros`;
			}

			// Reload dashboard
			await loadDashboard();

			// Reset form
			selectedFile = null;
			if (fileInput) fileInput.value = '';
			showPreview = false;

			uploading = false;
		} catch (err: any) {
			Logger.error('Error uploading file');
			uploadError = 'Error al procesar el archivo';
			uploading = false;
		}
	};

	onMount(() => {
		Chart.register(...registerables);
		loadDashboard();
	});

	// Reload dashboard when filters change
	let filterTimeout: ReturnType<typeof setTimeout>;
	$effect(() => {
		if (
			selectedStore !== undefined ||
			selectedCategory !== undefined ||
			startDate !== undefined ||
			endDate !== undefined
		) {
			clearTimeout(filterTimeout);
			filterTimeout = setTimeout(() => {
				loadDashboard();
			}, 300);
		}
	});
</script>

<div class="space-y-4 md:space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
		<h1 class="text-xl md:text-2xl font-semibold">Análisis de Gastos</h1>
	</div>

	<!-- Upload Section -->
	<section class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6">
		<h2 class="text-lg font-semibold text-slate-800 mb-4">Importar Gastos desde CSV o Excel</h2>

		<div class="space-y-4">
			<!-- File Input -->
			<div>
				<label for="csv-upload" class="block text-sm font-medium text-slate-700 mb-2">
					Seleccionar archivo CSV o Excel
				</label>
				<input
					id="csv-upload"
					type="file"
					accept=".csv,.xlsx,.xls"
					bind:this={fileInput}
					onchange={handleFileSelect}
					disabled={uploading}
					class="block w-full text-sm text-slate-500
						file:mr-4 file:py-2 file:px-4
						file:rounded-lg file:border-0
						file:text-sm file:font-semibold
						file:bg-slate-900 file:text-white
						hover:file:bg-slate-800
						disabled:opacity-50 disabled:cursor-not-allowed"
				/>
				<p class="mt-1 text-xs text-slate-500">
					El archivo debe contener las columnas: Fecha Gasto, Negocio, Nombre Comercial, Tipo de
					gasto, Total, Impuestos. Formatos soportados: CSV, Excel (.xlsx, .xls)
				</p>
			</div>

			<!-- Action Buttons -->
			{#if selectedFile}
				<div class="flex flex-col sm:flex-row gap-3">
					<button
						onclick={previewCSV}
						disabled={uploading}
						class="px-4 py-2.5 bg-slate-600 text-white text-sm font-medium rounded-lg hover:bg-slate-700 active:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Vista Previa
					</button>
					<button
						onclick={uploadCSV}
						disabled={uploading}
						class="px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 active:bg-slate-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{uploading ? 'Procesando...' : 'Importar Gastos'}
					</button>
				</div>
			{/if}

			<!-- Upload Status -->
			{#if uploadStatus}
				<div class="text-sm text-slate-600">
					{uploadStatus}
					{#if uploading && uploadProgress > 0}
						<div class="mt-2 w-full bg-slate-200 rounded-full h-2">
							<div
								class="bg-slate-900 h-2 rounded-full transition-all duration-300"
								style="width: {uploadProgress}%"
							></div>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Alerts -->
			{#if uploadError}
				<Alert color="red" dismissable>
					<span class="font-medium">Error:</span>
					{uploadError}
				</Alert>
			{/if}

			{#if uploadSuccess}
				<Alert color="green" dismissable>
					<span class="font-medium">Éxito:</span>
					{uploadSuccess}
				</Alert>
			{/if}

			<!-- Preview Table -->
			{#if showPreview && previewData.length > 0}
				<div class="mt-4">
					<h3 class="text-md font-semibold text-slate-800 mb-2">
						Vista Previa (primeros 10 registros)
					</h3>
					<div class="overflow-x-auto">
						<table class="min-w-full divide-y divide-slate-200">
							<thead class="bg-slate-50">
								<tr>
									<th class="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase"
										>Fecha</th
									>
									<th class="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase"
										>Negocio</th
									>
									<th class="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase"
										>Proveedor</th
									>
									<th class="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase"
										>Tipo</th
									>
									<th class="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase"
										>Total</th
									>
									<th class="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase"
										>Match</th
									>
								</tr>
							</thead>
							<tbody class="bg-white divide-y divide-slate-200">
								{#each previewData as item}
									<tr class:bg-yellow-50={item.expense.needs_review}>
										<td class="px-3 py-2 text-sm text-slate-900">{item.expense.date}</td>
										<td class="px-3 py-2 text-sm text-slate-900">{item.expense.store_name_raw}</td>
										<td class="px-3 py-2 text-sm text-slate-900">{item.expense.provider}</td>
										<td class="px-3 py-2 text-sm text-slate-900">{item.expense.expense_type}</td>
										<td class="px-3 py-2 text-sm text-slate-900 text-right">
											${item.expense.total.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
										</td>
										<td class="px-3 py-2 text-sm">
											{#if item.matchedStore}
												<span
													class="text-green-600"
													title="Confianza: {(item.matchedStore.confidence * 100).toFixed(0)}%"
												>
													✓ {item.matchedStore.name}
												</span>
											{:else}
												<span class="text-red-600">✗ Sin match</span>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
					<p class="mt-2 text-xs text-slate-500">
						Los registros con fondo amarillo necesitan revisión manual (sin match o baja confianza)
					</p>
				</div>
			{/if}
		</div>
	</section>

	<!-- Filters -->
	<section class="bg-white rounded-xl shadow-sm border border-slate-200 p-3 md:p-4">
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
			<!-- Date Range -->
			<label class="flex flex-col gap-2">
				<span class="text-sm font-semibold text-slate-700">Fecha Inicio</span>
				<input
					type="date"
					bind:value={startDate}
					class="h-10 md:h-9 rounded-lg border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</label>

			<label class="flex flex-col gap-2">
				<span class="text-sm font-semibold text-slate-700">Fecha Fin</span>
				<input
					type="date"
					bind:value={endDate}
					class="h-10 md:h-9 rounded-lg border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</label>

			<!-- Store Filter -->
			<label class="flex flex-col gap-2">
				<span class="text-sm font-semibold text-slate-700">Sede/Negocio</span>
				<select
					bind:value={selectedStore}
					class="h-10 md:h-9 rounded-lg border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					<option value="">Todas las sedes</option>
					{#each stores as store}
						<option value={store.name}>{store.name}</option>
					{/each}
				</select>
			</label>

			<!-- Category Filter -->
			<label class="flex flex-col gap-2">
				<span class="text-sm font-semibold text-slate-700">Categoría</span>
				<select
					bind:value={selectedCategory}
					class="h-10 md:h-9 rounded-lg border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					<option value="">Todas las categorías</option>
					{#each categories as category}
						<option value={category}>{category}</option>
					{/each}
				</select>
			</label>
		</div>
	</section>

	<!-- Dashboard -->
	{#if loading}
		<p class="text-slate-500">Cargando datos...</p>
	{:else if stats}
		<!-- Summary Cards -->
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<div class="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
				<div class="flex items-center justify-between">
					<div class="flex-1">
						<p class="text-red-50 text-sm font-medium">Total Gastos</p>
						<p class="text-3xl font-bold mt-1">
							${stats.totalAmount.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
						</p>
					</div>
					<div class="bg-white/20 rounded-full p-3 ml-2">
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

			<div
				class="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white"
			>
				<div class="flex items-center justify-between">
					<div class="flex-1">
						<p class="text-orange-50 text-sm font-medium">Número de Gastos</p>
						<p class="text-3xl font-bold mt-1">{stats.totalExpenses}</p>
					</div>
					<div class="bg-white/20 rounded-full p-3 ml-2">
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
							/>
						</svg>
					</div>
				</div>
			</div>
		</div>

		<!-- Charts -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- Category Chart -->
			<div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
				<h2 class="text-lg font-semibold text-slate-800 mb-4">Gastos por Categoría</h2>
				<div class="h-80">
					<canvas id="chartCategory"></canvas>
				</div>
			</div>

			<!-- Store Chart -->
			<div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
				<h2 class="text-lg font-semibold text-slate-800 mb-4">Gastos por Sede</h2>
				<div class="h-80">
					<canvas id="chartStore"></canvas>
				</div>
			</div>
		</div>

		<!-- Month Comparison Chart -->
		<div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
			<h2 class="text-lg font-semibold text-slate-800 mb-4">Comparativo de Periodos (Mensual)</h2>
			<div class="h-80">
				<canvas id="chartMonth"></canvas>
			</div>
		</div>
	{/if}
</div>
