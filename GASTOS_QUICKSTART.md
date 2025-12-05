# 🚀 Guía Rápida - Activación del Módulo de Gastos

## Pasos para Activar

### 1️⃣ Ejecutar el Schema en Supabase

Abre el **SQL Editor** en tu proyecto de Supabase y ejecuta los siguientes archivos en orden:

```sql
-- 1. Crear la tabla y los índices
-- Copiar y pegar el contenido de: supabase-expenses-schema.sql
```

```sql
-- 2. Configurar las políticas de seguridad (RLS)
-- Copiar y pegar el contenido de: supabase-expenses-rls.sql
```

### 2️⃣ Verificar la Instalación

```bash
# El servidor debería estar corriendo
npm run dev
```

### 3️⃣ Probar la Funcionalidad

1. Navega a: `http://localhost:5173/gastos`
2. Haz clic en "Seleccionar archivo CSV"
3. Selecciona el archivo: `gastos-ejemplo.csv`
4. Haz clic en "Vista Previa" para verificar el mapeo
5. Haz clic en "Importar Gastos"
6. ¡Observa el dashboard actualizarse automáticamente!

---

## 📂 Archivos Importantes

| Archivo | Descripción |
|---------|-------------|
| `supabase-expenses-schema.sql` | Schema de la tabla de gastos |
| `supabase-expenses-rls.sql` | Políticas de seguridad RLS |
| `gastos-ejemplo.csv` | Archivo CSV de ejemplo para pruebas |
| `GASTOS_MODULE.md` | Documentación completa del módulo |
| `GASTOS_IMPLEMENTATION_SUMMARY.md` | Resumen de implementación |

---

## 🎯 Formato del CSV

Tu archivo CSV debe tener estas columnas (en este orden):

```
Fecha Gasto,Negocio,Proveedor,Tipo de gasto,Total,Impuestos,Número de Factura
```

**Ejemplo:**
```csv
01/12/2024,CC Plaza Claro,Proveedor XYZ,Servicios,150000,28500,FAC-001
```

---

## ✅ Verificación Rápida

Después de ejecutar los scripts SQL, verifica que todo esté correcto:

```sql
-- Verificar que la tabla existe
SELECT * FROM expenses LIMIT 1;

-- Verificar los índices
SELECT indexname FROM pg_indexes WHERE tablename = 'expenses';

-- Verificar las políticas RLS
SELECT * FROM pg_policies WHERE tablename = 'expenses';
```

---

## 🆘 Solución de Problemas

### Error: "Table expenses does not exist"
→ Ejecuta `supabase-expenses-schema.sql` en el SQL Editor

### Error: "Permission denied"
→ Ejecuta `supabase-expenses-rls.sql` en el SQL Editor

### Error: "Store not found"
→ Asegúrate de que las sedes existan en la tabla `stores`

### Los nombres de sedes no coinciden
→ El sistema usa fuzzy matching, pero puedes ajustar el umbral en `expenses.ts` (línea 52)

---

## 📊 Características Destacadas

- ✅ **Importación masiva**: Procesa cientos de registros en segundos
- ✅ **Fuzzy matching**: Encuentra sedes aunque el nombre no sea exacto
- ✅ **Sin duplicados**: Usa el número de factura como clave única
- ✅ **Optimizado**: Batch processing de 100 registros por lote
- ✅ **Visual**: 3 gráficos interactivos con Chart.js
- ✅ **Filtros**: Por fecha, sede y categoría

---

## 📖 Más Información

Para documentación completa, consulta:
- `GASTOS_MODULE.md` - Guía completa del módulo
- `GASTOS_IMPLEMENTATION_SUMMARY.md` - Resumen técnico

---

**¡Listo para usar! 🎉**
