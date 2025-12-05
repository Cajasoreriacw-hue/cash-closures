# Actualización del Módulo de Gastos - Soporte para Excel

## Cambios Realizados

### ✅ 1. Soporte para Archivos Excel
- **Librería instalada**: `xlsx` para procesar archivos .xlsx y .xls
- **Formatos soportados**: CSV, Excel (.xlsx, .xls)

### ✅ 2. Limpieza Automática de Nombres de Negocios
Se agregó la función `cleanStoreName()` que elimina automáticamente los siguientes prefijos:
- `GRUPO TCW SAS - THE CHEESE WHEEL - `
- `GRUPO TCW SAS - `
- `THE CHEESE WHEEL - `
- `TCW - `

**Ejemplo de funcionamiento:**
```
Excel: "GRUPO TCW SAS - THE CHEESE WHEEL - GRAN ESTACIÓN"
Limpiado: "GRAN ESTACIÓN"
Match en BD: "GRAN ESTACIÓN" ✓ (100% confianza)
```

### ✅ 3. Mejoras en el Fuzzy Matching
- **Paso 1**: Limpia el nombre del negocio (elimina prefijos)
- **Paso 2**: Intenta match exacto (case insensitive)
- **Paso 3**: Si no hay match exacto, usa fuzzy matching con Fuse.js
- **Confianza**: 100% para matches exactos, variable para fuzzy matches

## Cómo Funciona

### Procesamiento de Nombres

```typescript
// Nombre en Excel
"GRUPO TCW SAS - THE CHEESE WHEEL - CC PALATINO"

// Después de cleanStoreName()
"CC PALATINO"

// Match en base de datos
"CC Palatino" → ✓ Match exacto (100% confianza)
```

### Ejemplos de Matches

| Nombre en Excel | Nombre Limpio | Nombre en BD | Match | Confianza |
|----------------|---------------|--------------|-------|-----------|
| GRUPO TCW SAS - THE CHEESE WHEEL - GRAN ESTACIÓN | GRAN ESTACIÓN | GRAN ESTACIÓN | ✓ | 100% |
| THE CHEESE WHEEL - CC PALATINO | CC PALATINO | CC Palatino | ✓ | 100% |
| GRUPO TCW SAS - Santa Barbará | Santa Barbará | Santa Barbará | ✓ | 100% |
| TCW - Green Office | Green Office | Green Office | ✓ | 100% |
| CC Plaza Claro | CC Plaza Claro | CC Plaza Claro | ✓ | 100% |

## Uso

### 1. Preparar el Archivo Excel

Tu archivo Excel debe tener estas columnas (pueden estar en cualquier orden):
- **Fecha Gasto**: Formato DD/MM/YYYY o YYYY-MM-DD
- **Negocio**: Nombre completo con prefijos (se limpiarán automáticamente)
- **Proveedor**: Nombre del proveedor
- **Tipo de gasto**: Categoría del gasto
- **Total**: Monto total
- **Impuestos**: Monto de impuestos
- **Número de Factura** (opcional): Para evitar duplicados

### 2. Importar el Archivo

1. Navega a `/gastos`
2. Haz clic en "Seleccionar archivo CSV o Excel"
3. Selecciona tu archivo (.xlsx, .xls, o .csv)
4. Haz clic en "Vista Previa" para verificar el mapeo
5. Revisa que los nombres de negocios se hayan mapeado correctamente
6. Haz clic en "Importar Gastos"

### 3. Verificar el Mapeo

En la vista previa verás:
- ✓ **Verde**: Match exitoso con % de confianza
- ✗ **Rojo**: Sin match (necesita revisión)
- **Fondo amarillo**: Baja confianza (< 80%)

## Configuración de Prefijos

Si necesitas agregar o modificar los prefijos que se eliminan automáticamente, edita el archivo:

**Archivo**: `src/lib/services/expenses.ts`

**Función**: `cleanStoreName()`

```typescript
const prefixesToRemove = [
    'GRUPO TCW SAS - THE CHEESE WHEEL - ',
    'GRUPO TCW SAS - ',
    'THE CHEESE WHEEL - ',
    'TCW - ',
    // Agrega más prefijos aquí si es necesario
];
```

## Ejemplo de Archivo Excel

Basándome en la imagen que compartiste, tu archivo Excel debería verse así:

| Fecha Gasto | Negocio | Proveedor | Tipo de gasto | Total | Impuestos |
|-------------|---------|-----------|---------------|-------|-----------|
| 01/12/2024 | GRUPO TCW SAS - THE CHEESE WHEEL - GRAN ESTACIÓN | Proveedor XYZ | Servicios | 150000 | 28500 |
| 02/12/2024 | GRUPO TCW SAS - THE CHEESE WHEEL - CC PALATINO | Proveedor ABC | Mantenimiento | 200000 | 38000 |

**Resultado después del procesamiento:**
- "GRAN ESTACIÓN" → Match con "GRAN ESTACIÓN" en BD
- "CC PALATINO" → Match con "CC Palatino" en BD

## Solución de Problemas

### Problema: Los nombres no coinciden
**Solución**: 
1. Verifica que los nombres en la base de datos estén correctos
2. Agrega el prefijo específico a la lista en `cleanStoreName()`
3. Ajusta el umbral de fuzzy matching (actualmente 0.4)

### Problema: Muchos registros marcados para revisión
**Solución**:
1. Revisa los nombres en la vista previa
2. Verifica que los prefijos estén configurados correctamente
3. Considera agregar variaciones comunes de nombres a la BD

### Problema: Error al leer el archivo Excel
**Solución**:
1. Asegúrate de que el archivo sea .xlsx o .xls válido
2. Verifica que las columnas tengan los nombres correctos
3. Revisa que no haya filas vacías al inicio

## Ventajas de Esta Implementación

✅ **Automático**: No necesitas editar manualmente los nombres en Excel  
✅ **Flexible**: Soporta múltiples formatos de prefijos  
✅ **Inteligente**: Usa fuzzy matching si no hay match exacto  
✅ **Transparente**: Muestra la confianza del match en la vista previa  
✅ **Seguro**: Marca registros dudosos para revisión manual  

## Próximos Pasos

1. Ejecuta el schema SQL en Supabase (si no lo has hecho)
2. Prueba con tu archivo Excel real
3. Verifica que los matches sean correctos en la vista previa
4. Importa los datos
5. Revisa el dashboard

---

**¡Listo para usar!** 🎉

El sistema ahora puede procesar archivos Excel con nombres completos de negocios y mapearlos automáticamente a tus sedes en la base de datos.
