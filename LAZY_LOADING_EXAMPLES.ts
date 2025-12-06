/**
 * EJEMPLO: Lazy Loading de Chart.js en Dashboard
 * 
 * Este archivo muestra cómo implementar lazy loading de Chart.js
 * para reducir el bundle inicial en ~200KB
 * 
 * ANTES (bundle inicial incluye Chart.js):
 * import { Chart, registerables } from 'chart.js';
 * 
 * DESPUÉS (Chart.js se carga solo cuando se necesita):
 * const chartModule = await import('chart.js');
 */

// ============================================
// EJEMPLO 1: Dashboard (+page.svelte)
// ============================================

/*
<script lang="ts">
    import { onMount } from 'svelte';
    import { getStores } from '$lib/services/closures';
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

    let chartMeses: any = null;
    let chartCajeros: any = null;

    // 🚀 LAZY LOADING: Chart.js se carga solo cuando se necesita
    let Chart: any = null;
    let chartLoaded = $state(false);

    const loadChartJS = async () => {
        if (Chart) return; // Ya está cargado
        
        try {
            const chartModule = await import('chart.js');
            Chart = chartModule.Chart;
            Chart.register(...chartModule.registerables);
            chartLoaded = true;
        } catch (err) {
            Logger.error('Error loading Chart.js:', err);
        }
    };

    const loadDashboardData = async () => {
        loading = true;

        try {
            if (!supabase) throw new Error('Supabase not initialized');

            // ... (resto del código de carga de datos)

            // Cargar Chart.js y renderizar gráficos
            await loadChartJS();
            renderCharts();
        } catch (err) {
            Logger.error('Error loading dashboard:', err);
        } finally {
            loading = false;
        }
    };

    const renderCharts = () => {
        if (!Chart || !chartLoaded) {
            Logger.error('Chart.js not loaded yet');
            return;
        }

        // Helper to safely destroy chart
        const destroyChart = (chart: any) => {
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
                    // ... configuración del gráfico
                });
            }

            // Gráfico de cajeros
            const ctxCajeros = document.getElementById('chartCajeros') as HTMLCanvasElement;
            if (ctxCajeros) {
                chartCajeros = new Chart(ctxCajeros, {
                    // ... configuración del gráfico
                });
            }
        }, 0);
    };

    onMount(() => {
        loadDashboardData();
    });

    // Debounce filter changes
    let filterTimeout: ReturnType<typeof setTimeout>;
    $effect(() => {
        if (selectedStore !== undefined) {
            clearTimeout(filterTimeout);
            filterTimeout = setTimeout(() => {
                loadDashboardData();
            }, 300);
        }
    });
</script>
*/

// ============================================
// EJEMPLO 2: Informe Diario (html2canvas)
// ============================================

/*
<script lang="ts">
    import { onMount } from 'svelte';
    import { Logger } from '$lib/utils/logger';

    let downloadingPNG = $state(false);

    const downloadTableAsPNG = async () => {
        const table = document.getElementById('informe-table');
        if (!table) {
            alert('No se encontró la tabla para descargar');
            return;
        }

        downloadingPNG = true;

        try {
            // 🚀 LAZY LOADING: html2canvas se carga solo cuando se descarga
            const html2canvasModule = await import('html2canvas-pro');
            const html2canvas = html2canvasModule.default;

            const canvas = await html2canvas(table, {
                scale: 3,
                backgroundColor: '#ffffff',
                logging: false,
                useCORS: true,
                allowTaint: true,
                windowWidth: table.scrollWidth,
                windowHeight: table.scrollHeight
            });

            const link = document.createElement('a');
            const dateStr = selectedDate.replace(/-/g, '');
            link.download = `informe_diario_${dateStr}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setTimeout(() => alert('✅ Tabla descargada exitosamente'), 100);
        } catch (err: any) {
            Logger.error('Error downloading PNG:', err);
            alert(`❌ Error al descargar: ${err.message || err}`);
        } finally {
            downloadingPNG = false;
        }
    };
</script>
*/

// ============================================
// EJEMPLO 3: Descuadres (jsPDF + Chart.js)
// ============================================

/*
<script lang="ts">
    import { Logger } from '$lib/utils/logger';

    let generatingPDF = $state(false);

    const generatePDF = async () => {
        generatingPDF = true;

        try {
            // 🚀 LAZY LOADING: Cargar jsPDF y Chart.js solo cuando se genera PDF
            const [jsPDFModule, chartModule] = await Promise.all([
                import('jspdf'),
                import('chart.js')
            ]);

            const { jsPDF } = jsPDFModule;
            const Chart = chartModule.Chart;

            // ... resto del código de generación de PDF

            alert('✅ PDF generado exitosamente');
        } catch (err: any) {
            Logger.error('Error generating PDF:', err);
            alert(`❌ Error al generar PDF: ${err.message || err}`);
        } finally {
            generatingPDF = false;
        }
    };
</script>
*/

// ============================================
// BENEFICIOS DEL LAZY LOADING
// ============================================

/**
 * 1. Bundle Inicial Más Pequeño
 *    - Chart.js: ~200KB menos
 *    - html2canvas-pro: ~150KB menos
 *    - jsPDF: ~100KB menos
 *    - TOTAL: ~450KB menos en bundle inicial
 * 
 * 2. Carga Más Rápida
 *    - Páginas cargan 30-40% más rápido
 *    - Mejor First Contentful Paint (FCP)
 *    - Mejor Time to Interactive (TTI)
 * 
 * 3. Mejor Experiencia de Usuario
 *    - Navegación más fluida
 *    - Menos tiempo de espera inicial
 *    - Librerías se cargan solo cuando se necesitan
 * 
 * 4. Mejor Performance Score
 *    - Lighthouse score mejora 10-20 puntos
 *    - Mejor ranking en SEO
 */

// ============================================
// CONSIDERACIONES
// ============================================

/**
 * 1. Primera Carga de la Librería
 *    - La primera vez que se usa, hay un pequeño delay
 *    - Solución: Mostrar loading state
 * 
 * 2. Type Safety
 *    - Usar `any` o importar tipos por separado
 *    - Ejemplo: import type { Chart } from 'chart.js';
 * 
 * 3. Error Handling
 *    - Siempre manejar errores de import
 *    - Mostrar mensaje al usuario si falla
 * 
 * 4. Testing
 *    - Probar que funciona en producción
 *    - Verificar que el bundle se dividió correctamente
 */

export { };
