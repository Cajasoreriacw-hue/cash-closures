# Módulo de Análisis de Gastos Masivos

## Descripción General

Este módulo permite importar y analizar gastos masivos desde archivos CSV, con procesamiento optimizado para evitar saturar la base de datos de Supabase y visualización interactiva mediante gráficos.

## Características Principales

### 1. Importación de CSV
- **Formato de Archivo**: CSV con las siguientes columnas:
  - `Fecha Gasto`: Fecha del gasto (formato DD/MM/YYYY o YYYY-MM-DD)
  - `Negocio`: Nombre de la sede/negocio
  - `Proveedor`: Nombre del proveedor
  - `Tipo de gasto`: Categoría del gasto
  - `Total`: Monto total del gasto
  - `Impuestos`: Monto de impuestos
  - `Número de Factura` (opcional): Para evitar duplicados

### 2. Procesamiento Inteligente

#### Fuzzy Matching de Sedes
- El sistema utiliza **Fuse.js** para hacer coincidencia aproximada entre los nombres de negocios del CSV y las sedes en la base de datos
- Umbral de confianza: 0.4 (ajustable)
- Los registros con baja confianza (< 80%) se marcan para revisión manual

#### Batch Processing (Lotes)
- Los datos se procesan en lotes de **100 registros** para optimizar el rendimiento
- Delay de 100ms entre lotes para no saturar Supabase
- Uso de `upsert` basado en número de factura para evitar duplicados

### 3. Dashboard de Visualización

El dashboard incluye 3 tipos de gráficos:

1. **Gastos por Categoría** (Donut Chart)
   - Muestra la distribución de gastos por tipo
   - Colores diferenciados para cada categoría

2. **Gastos por Sede** (Bar Chart Horizontal)
   - Compara el total de gastos entre diferentes sedes
   - Ordenado de mayor a menor

3. **Comparativo de Periodos** (Line Chart)
   - Muestra la evolución de gastos mes a mes
   - Permite identificar tendencias

### 4. Filtros Interactivos

- **Rango de Fechas**: Fecha inicio y fecha fin
- **Sede/Negocio**: Filtrar por sede específica
- **Categoría de Gasto**: Filtrar por tipo de gasto

Los filtros se aplican automáticamente con un debounce de 300ms para optimizar las consultas.

## Estructura de la Base de Datos

### Tabla: `expenses`

```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  store_id UUID REFERENCES stores(id),
  store_name_raw TEXT NOT NULL,
  provider TEXT NOT NULL,
  expense_type TEXT NOT NULL,
  total NUMERIC NOT NULL,
  taxes NUMERIC NOT NULL DEFAULT 0,
  invoice_number TEXT,
  needs_review BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Índices
- `expenses_date_idx`: Optimiza consultas por fecha
- `expenses_store_idx`: Optimiza consultas por sede
- `expenses_type_idx`: Optimiza consultas por tipo
- `expenses_invoice_idx`: Optimiza búsquedas por factura
- `expenses_invoice_unique_idx`: Previene duplicados

## Uso

### 1. Preparar el Archivo CSV

Ejemplo de formato:
```csv
Fecha Gasto,Negocio,Proveedor,Tipo de gasto,Total,Impuestos,Número de Factura
01/12/2024,THE CHEESE WHEEL - PLAZA CLARO,Proveedor XYZ,Servicios,150000,28500,FAC-001
02/12/2024,CC Palatino,Proveedor ABC,Mantenimiento,200000,38000,FAC-002
```

### 2. Importar Datos

1. Navegar a **Gastos** en el menú
2. Hacer clic en "Seleccionar archivo CSV"
3. (Opcional) Hacer clic en "Vista Previa" para verificar el mapeo
4. Hacer clic en "Importar Gastos"
5. Esperar a que se complete el proceso

### 3. Analizar Datos

- Usar los filtros para segmentar la información
- Revisar los gráficos para identificar patrones
- Verificar registros marcados para revisión manual (fondo amarillo en la vista previa)

## Configuración de Supabase

### 1. Ejecutar el Schema

```bash
# Ejecutar el archivo SQL en Supabase
psql -h [HOST] -U [USER] -d [DATABASE] -f supabase-expenses-schema.sql
```

O copiar y pegar el contenido en el SQL Editor de Supabase.

### 2. Configurar RLS (Row Level Security)

```sql
-- Habilitar RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Política de lectura (usuarios autenticados)
CREATE POLICY "Users can view expenses"
  ON expenses FOR SELECT
  USING (auth.role() = 'authenticated');

-- Política de inserción (usuarios autenticados)
CREATE POLICY "Users can insert expenses"
  ON expenses FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Política de actualización (usuarios autenticados)
CREATE POLICY "Users can update expenses"
  ON expenses FOR UPDATE
  USING (auth.role() = 'authenticated');
```

## Optimizaciones Implementadas

### 1. Caché de Datos
- Las listas de sedes y categorías se cachean para reducir consultas

### 2. Debouncing
- Los filtros tienen un delay de 300ms para evitar consultas excesivas

### 3. Batch Processing
- Inserción en lotes de 100 registros
- Delay de 100ms entre lotes

### 4. Índices de Base de Datos
- Múltiples índices para optimizar consultas comunes

## Manejo de Errores

### Registros que Necesitan Revisión

Los registros se marcan para revisión (`needs_review = true`) cuando:
- No se encuentra coincidencia de sede
- La confianza del match es menor al 80%

Estos registros aparecen con fondo amarillo en la vista previa.

### Duplicados

El sistema usa `upsert` basado en `invoice_number` para:
- Actualizar registros existentes si ya existe la factura
- Insertar nuevos registros si no existe

## Librerías Utilizadas

- **PapaParse**: Parsing de archivos CSV
- **Fuse.js**: Fuzzy matching para nombres de sedes
- **Chart.js**: Visualización de gráficos
- **Flowbite Svelte**: Componentes de UI (Alerts)

## Próximas Mejoras

- [ ] Exportar datos filtrados a CSV/Excel
- [ ] Edición manual de registros marcados para revisión
- [ ] Comparación de gastos año a año
- [ ] Alertas automáticas para gastos inusuales
- [ ] Integración con OCR para facturas escaneadas
- [ ] Dashboard de presupuesto vs. gasto real

## Soporte

Para reportar problemas o sugerencias, contactar al equipo de desarrollo.
