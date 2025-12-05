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
		type ExpenseRecord,
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
	let previewData: ExpenseRecord[] = $state([]);
	let expensesToUpload: ExpenseRecord[] = $state([]);
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
			// Category Chart (Doughnut)
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
									'rgba(31, 173, 224, 0.7)',
									'rgba(75, 189, 231, 0.7)',
									'rgba(120, 206, 237, 0.7)',
									'rgba(165, 222, 243, 0.7)',
									'rgba(210, 239, 249, 0.7)'
								],
								borderColor: [
									'rgb(31, 173, 224)',
									'rgb(75, 189, 231)',
									'rgb(120, 206, 237)',
									'rgb(165, 222, 243)',
									'rgb(210, 239, 249)'
								],
								borderWidth: 1,
								hoverOffset: 4
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
									font: { family: "'Poppins', sans-serif", size: 11 },
									usePointStyle: true,
									boxWidth: 6,
									color: window.matchMedia('(prefers-color-scheme: dark)').matches
										? '#e2e8f0'
										: '#64748b' // Adaptive text color for legend
								}
							},
							tooltip: {
								backgroundColor: 'rgba(15, 23, 42, 0.9)', // Darker tooltip background
								titleColor: '#e2e8f0',
								bodyColor: '#e2e8f0',
								borderColor: '#334155',
								borderWidth: 1,
								padding: 10,
								callbacks: {
									label: function (context) {
										const value = context.parsed || 0;
										return new Intl.NumberFormat('es-CO', {
											style: 'currency',
											currency: 'COP',
											maximumFractionDigits: 0
										}).format(value);
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
								backgroundColor: 'rgba(31, 173, 224, 0.6)',
								borderColor: 'rgb(31, 173, 224)',
								borderWidth: 1,
								borderRadius: 4
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
								backgroundColor: 'rgba(15, 23, 42, 0.9)',
								titleColor: '#e2e8f0',
								bodyColor: '#e2e8f0',
								borderColor: '#334155',
								borderWidth: 1,
								padding: 10,
								callbacks: {
									label: function (context) {
										const value = context.parsed.x || 0;
										return new Intl.NumberFormat('es-CO', {
											style: 'currency',
											currency: 'COP',
											maximumFractionDigits: 0
										}).format(value);
									}
								}
							}
						},
						scales: {
							x: {
								grid: { color: 'rgba(148, 163, 184, 0.1)' },
								ticks: {
									font: { family: "'Poppins', sans-serif" },
									color: window.matchMedia('(prefers-color-scheme: dark)').matches
										? '#94a3b8'
										: '#64748b'
								}
							},
							y: {
								grid: { display: false },
								ticks: {
									font: { family: "'Poppins', sans-serif" },
									color: window.matchMedia('(prefers-color-scheme: dark)').matches
										? '#94a3b8'
										: '#64748b'
								}
							}
						}
					}
				});
			}

			// Month Chart (Line) - Not in new design but keeping logical support if needed, or remove?
			// The new design only showed Rubros and Tiendas. I will include Month chart just in case or remove it.
			// I'll keep it simple and match the new design which only had 2 charts.
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
			previewFile();
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

			// Process rows
			const expenses = expenseData.map((row) => parseExpenseRow(row, storesData).expense);
			expensesToUpload = expenses;
			previewData = expenses.slice(0, 10);

			showPreview = true;
			uploadStatus = `Vista previa: ${expenses.length} registros encontrados`;
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

	const cancelPreview = () => {
		selectedFile = null;
		if (fileInput) fileInput.value = '';
		showPreview = false;
		previewData = [];
		expensesToUpload = [];
		uploadError = '';
		uploadSuccess = '';
		uploadStatus = '';
	};

	const confirmUpload = async () => {
		if (expensesToUpload.length === 0) return;

		uploading = true;
		uploadError = '';
		uploadSuccess = '';
		uploadProgress = 0;
		uploadStatus = 'Guardando en la base de datos...';

		try {
			// Batch insert
			const result = await batchInsertExpenses(supabase, expensesToUpload, 100);

			uploadProgress = 100;

			if (result.errors > 0) {
				uploadError = `Se procesaron ${result.success} registros con ${result.errors} errores`;
			} else {
				uploadSuccess = `¡Éxito! Se importaron ${result.success} registros`;
			}

			// Reload dashboard
			await loadDashboard();

			// Reset form
			cancelPreview();
		} catch (err: any) {
			Logger.error('Error uploading file');
			uploadError = 'Error al procesar el archivo';
		} finally {
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

<div class="space-y-6">
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
		<h1 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Gestión de Gastos</h1>
		<div class="flex gap-2">
			<!-- Buttons can go here if needed -->
		</div>
	</div>

	<!-- Upload Section -->
	<section
		class="bg-white dark:bg-slate-800 rounded-2xl shadow-soft dark:shadow-none dark:border dark:border-slate-700 p-6 md:p-8 transition-colors"
	>
		<div class="max-w-xl mx-auto text-center">
			<div
				class="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-fresh-sky-50 dark:bg-fresh-sky-900/30 text-fresh-sky-600 dark:text-fresh-sky-400"
			>
				<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
					/>
				</svg>
			</div>
			<h2 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Cargar archivo de gastos</h2>
			<p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
				Sube tu archivo Excel o CSV para procesar los gastos.
			</p>

			<div class="relative group">
				<input
					bind:this={fileInput}
					type="file"
					accept=".xlsx, .xls, .csv"
					onchange={handleFileSelect}
					disabled={uploading}
					class="block w-full text-sm text-gray-500 dark:text-gray-400
						file:mr-4 file:py-2.5 file:px-6
						file:rounded-xl file:border-0
						file:text-sm file:font-semibold
						file:bg-fresh-sky-50 file:text-fresh-sky-700
						dark:file:bg-fresh-sky-900/30 dark:file:text-fresh-sky-400
						hover:file:bg-fresh-sky-100 dark:hover:file:bg-fresh-sky-900/50
						cursor-pointer focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed
						bg-gray-50 dark:bg-slate-700 rounded-xl border border-gray-200 dark:border-slate-600 p-2 transition-colors"
				/>
			</div>

			{#if uploading}
				<div
					class="mt-4 flex items-center justify-center gap-2 text-sm text-fresh-sky-600 dark:text-fresh-sky-400 font-medium animate-pulse"
				>
					<div
						class="w-4 h-4 border-2 border-fresh-sky-600/30 dark:border-fresh-sky-400/30 border-t-fresh-sky-600 dark:border-t-fresh-sky-400 rounded-full animate-spin"
					></div>
					Procesando archivo...
				</div>
			{/if}
			{#if uploadError}
				<div
					class="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-900/30 flex items-center gap-2"
				>
					<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						></path></svg
					>
					{uploadError}
				</div>
			{/if}
		</div>
	</section>

	<!-- Preview Table -->
	{#if showPreview && previewData.length > 0}
		<section class="space-y-6">
			<div class="flex items-center justify-between">
				<h3 class="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
					<span class="w-2 h-2 rounded-full bg-fresh-sky-500"></span>
					Vista Previa
					<span
						class="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 text-xs font-medium"
						>{previewData.length} registros</span
					>
				</h3>
				<div class="flex gap-3">
					<button
						onclick={cancelPreview}
						class="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
					>
						Cancelar
					</button>
					<button
						onclick={confirmUpload}
						class="px-5 py-2 rounded-xl bg-gray-900 dark:bg-slate-700 text-white text-sm font-semibold shadow-soft hover:shadow-soft-lg hover:bg-gray-800 dark:hover:bg-slate-600 transition-all active:scale-95"
					>
						Confirmar Carga
					</button>
				</div>
			</div>

			<div
				class="bg-white dark:bg-slate-800 rounded-2xl shadow-soft dark:shadow-none dark:border dark:border-slate-700 border border-gray-100 overflow-hidden"
			>
				<div class="overflow-x-auto">
					<table class="w-full text-sm text-left">
						<thead
							class="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold"
						>
							<tr>
								{#each Object.keys(previewData[0]) as header}
									<th class="px-6 py-4">{header}</th>
								{/each}
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-5 dark:divide-gray-700">
							{#each previewData.slice(0, 5) as row}
								<tr
									class="hover:bg-fresh-sky-50/30 dark:hover:bg-fresh-sky-900/10 transition-colors"
								>
									{#each Object.values(row) as val}
										<td
											class="px-6 py-4 text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap"
										>
											{val}
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if previewData.length > 5}
					<div
						class="bg-gray-50 dark:bg-slate-700/50 px-6 py-3 border-t border-gray-100 dark:border-slate-700 text-center"
					>
						<span class="text-xs font-medium text-gray-500 dark:text-gray-400 italic"
							>... y {previewData.length - 5} más</span
						>
					</div>
				{/if}
			</div>
		</section>
	{/if}

	<!-- DASHBOARD -->
	{#if !uploading && previewData.length === 0}
		<div class="space-y-6 animate-fade-in">
			<!-- Filters -->
			<section
				class="bg-white dark:bg-slate-800 rounded-2xl shadow-soft dark:shadow-none dark:border dark:border-slate-700 border border-gray-100 p-5 md:p-6 transition-colors"
			>
				<h3
					class="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4"
				>
					Filtros
				</h3>
				<div class="grid grid-cols-1 md:grid-cols-4 gap-5">
					<div class="space-y-2">
						<label
							for="filter-year"
							class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Sede</label
						>
						<select
							id="filter-year"
							bind:value={startDate}
							class="w-full h-11 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-fresh-sky-500/20 focus:border-fresh-sky-500 transition-all cursor-pointer font-medium text-gray-700 dark:text-white"
						>
							<option value="">Todas las sedes</option>
							{#each stores as store}
								<option value={store.name}>{store.name}</option>
							{/each}
						</select>
					</div>

					<!-- Category Filter -->
					<label class="flex flex-col gap-2">
						<span class="text-sm font-semibold text-slate-700 dark:text-slate-300">Categoría</span>
						<select
							bind:value={selectedCategory}
							class="h-10 md:h-9 rounded-lg border border-slate-200 dark:border-slate-600 px-3 text-sm bg-white dark:bg-slate-700 text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-fresh-sky-500"
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
				<div class="flex items-center justify-center py-12">
					<div
						class="w-10 h-10 border-4 border-fresh-sky-200 border-t-fresh-sky-600 rounded-full animate-spin"
					></div>
				</div>
			{:else if stats}
				<!-- KPI Cards -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-5">
					<!-- Total Gastos Card -->
					<div
						class="bg-white dark:bg-slate-800 rounded-2xl shadow-soft dark:shadow-none dark:border dark:border-slate-700 p-5 hover:shadow-soft-lg transition-all relative overflow-hidden group"
					>
						<div
							class="absolute top-0 right-0 w-24 h-24 bg-fresh-sky-50 dark:bg-fresh-sky-900/20 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"
						></div>
						<h4
							class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 relative z-10"
						>
							Total Gastos
						</h4>
						<p
							class="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white relative z-10"
						>
							{new Intl.NumberFormat('es-CO', {
								style: 'currency',
								currency: 'COP',
								maximumFractionDigits: 0
							}).format(stats.totalAmount)}
						</p>
						<p
							class="text-xs text-fresh-sky-600 dark:text-fresh-sky-400 mt-1 font-medium relative z-10"
						>
							{stats.totalExpenses} registros
						</p>
					</div>

					<!-- Rubro Mayor Card -->
					<div
						class="bg-white dark:bg-slate-800 rounded-2xl shadow-soft dark:shadow-none dark:border dark:border-slate-700 p-5 hover:shadow-soft-lg transition-all relative overflow-hidden"
					>
						<h4
							class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2"
						>
							Rubro Principal
						</h4>
						<p class="text-lg font-bold text-gray-900 dark:text-white truncate">
							{stats.byCategory && stats.byCategory.length > 0
								? stats.byCategory[0].category
								: 'N/A'}
						</p>
						<div class="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5 mt-3">
							<div
								class="bg-fresh-sky-500 h-1.5 rounded-full"
								style="width: {stats.byCategory && stats.byCategory.length > 0
									? Math.min((stats.byCategory[0].total / stats.totalAmount) * 100, 100)
									: 0}%"
							></div>
						</div>
					</div>
				</div>

				<!-- Charts -->
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<!-- Rubros Chart -->
					<div
						class="bg-white dark:bg-slate-800 rounded-2xl shadow-soft dark:shadow-none dark:border dark:border-slate-700 p-6"
					>
						<h4
							class="text-sm font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2"
						>
							<span class="w-1.5 h-4 bg-fresh-sky-500 rounded-full"></span>
							Gastos por Rubro/Categoría
						</h4>
						<div class="h-64 flex items-center justify-center chart-container relative">
							<canvas id="chartCategory"></canvas>
							{#if !stats.byCategory || stats.byCategory.length === 0}
								<div
									class="absolute inset-0 flex items-center justify-center text-xs text-gray-400"
								>
									Sin datos
								</div>
							{/if}
						</div>
					</div>

					<!-- Tiendas Chart -->
					<div
						class="bg-white dark:bg-slate-800 rounded-2xl shadow-soft dark:shadow-none dark:border dark:border-slate-700 p-6"
					>
						<h4
							class="text-sm font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2"
						>
							<span class="w-1.5 h-4 bg-gray-800 dark:bg-gray-400 rounded-full"></span>
							Gastos por Tienda
						</h4>
						<div class="h-64 flex items-center justify-center chart-container relative">
							<canvas id="chartStore"></canvas>
							{#if !stats.byStore || stats.byStore.length === 0}
								<div
									class="absolute inset-0 flex items-center justify-center text-xs text-gray-400"
								>
									Sin datos
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	/* No custom CSS needed, using Tailwind */
</style>
