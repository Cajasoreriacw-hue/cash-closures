# Guía: Lazy Loading en Dashboard

## 📝 Instrucciones Paso a Paso

### Archivo: `src/routes/+page.svelte`

---

### **PASO 1: Remover Import Estático**

**Buscar** (línea ~4):
```typescript
import { Chart, registerables } from 'chart.js';
```

**Eliminar** esa línea completa.

---

### **PASO 2: Actualizar Variables de Chart**

**Buscar** (línea ~28-29):
```typescript
let chartMeses: Chart | null = null;
let chartCajeros: Chart | null = null;
```

**Reemplazar con**:
```typescript
// 🚀 LAZY LOADING: Chart.js se carga solo cuando se necesita
let Chart: any = null;
let chartLoaded = $state(false);
let chartMeses: any = null;
let chartCajeros: any = null;
```

---

### **PASO 3: Agregar Función loadChartJS**

**Agregar** justo ANTES de `const loadDashboardData`:
```typescript
// 🚀 Función para cargar Chart.js dinámicamente
const loadChartJS = async () => {
	if (Chart) return; // Ya está cargado

	try {
		const chartModule = await import('chart.js');
		Chart = chartModule.Chart;
		Chart.register(...chartModule.registerables);
		chartLoaded = true;
	} catch (err) {
		Logger.error('Error loading Chart.js:', err);
		throw err;
	}
};
```

---

### **PASO 4: Modificar loadDashboardData**

**Buscar** (cerca de línea ~190):
```typescript
			// Renderizar gráficos
			renderCharts();
		} catch (err) {
```

**Reemplazar con**:
```typescript
			// 🚀 Cargar Chart.js y renderizar gráficos
			await loadChartJS();
			renderCharts();
		} catch (err) {
```

---

### **PASO 5: Actualizar renderCharts**

**Buscar** (línea ~200):
```typescript
const renderCharts = () => {
	// Helper to safely destroy chart
	const destroyChart = (chart: Chart | null) => {
```

**Reemplazar con**:
```typescript
const renderCharts = () => {
	// Verificar que Chart.js esté cargado
	if (!Chart || !chartLoaded) {
		Logger.error('Chart.js not loaded yet');
		return;
	}

	// Helper to safely destroy chart
	const destroyChart = (chart: any) => {
```

---

### **PASO 6: Simplificar onMount**

**Buscar** (línea ~364):
```typescript
onMount(() => {
	Chart.register(...registerables);
	loadDashboardData();
});
```

**Reemplazar con**:
```typescript
onMount(() => {
	loadDashboardData();
});
```

---

## ✅ Verificación

Después de hacer los cambios:

```bash
# 1. Verificar que no hay errores de TypeScript
npm run check

# 2. Probar en desarrollo
npm run dev

# 3. Verificar que los gráficos se cargan correctamente
# - Abre http://localhost:5173
# - Verifica que los gráficos aparecen
# - Abre DevTools → Network
# - Busca "chart.js" - debería cargarse DESPUÉS de la página inicial
```

---

## 🎯 Resultado Esperado

- ✅ Bundle inicial: -200KB
- ✅ Chart.js se carga solo cuando se necesita
- ✅ Gráficos funcionan igual que antes
- ✅ Primera carga más rápida

---

## 🆘 Si Algo Sale Mal

```bash
# Restaurar archivo original
git checkout src/routes/+page.svelte

# Intentar de nuevo siguiendo los pasos
```

---

**Fecha**: 2025-12-06
**Dificultad**: Media
**Tiempo estimado**: 5-10 minutos
