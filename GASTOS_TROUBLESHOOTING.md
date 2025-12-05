# Solución de Problemas - Error al Importar Gastos

## ❌ Error Actual
```
Error: Se procesaron 0 registros con 1028 errores
```

## 🔍 Causas Posibles

### 1. **La tabla `expenses` no existe** (MÁS PROBABLE)
**Solución:** Ejecutar el schema SQL en Supabase

### 2. **Las políticas RLS no están configuradas**
**Solución:** Ejecutar el archivo RLS SQL

### 3. **Problema con los datos del Excel**
**Solución:** Verificar el formato de las columnas

---

## ✅ Pasos para Resolver

### Paso 1: Verificar si la tabla existe

1. Abre **Supabase Dashboard**
2. Ve a **Table Editor**
3. Busca la tabla `expenses`

**Si NO existe:**
- Continúa al Paso 2

**Si existe:**
- Continúa al Paso 3

---

### Paso 2: Crear la tabla `expenses`

1. Abre **Supabase Dashboard**
2. Ve a **SQL Editor**
3. Haz clic en **New Query**
4. Copia y pega el contenido de `supabase-expenses-schema.sql`:

```sql
-- Tabla para gastos importados
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  store_id uuid references public.stores(id) on delete restrict,
  store_name_raw text not null,
  provider text not null,
  expense_type text not null,
  total numeric not null,
  taxes numeric not null default 0,
  invoice_number text,
  needs_review boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices para optimizar consultas
create index if not exists expenses_date_idx on public.expenses(date);
create index if not exists expenses_store_idx on public.expenses(store_id);
create index if not exists expenses_type_idx on public.expenses(expense_type);
create index if not exists expenses_invoice_idx on public.expenses(invoice_number);
create index if not exists expenses_needs_review_idx on public.expenses(needs_review);

-- Trigger para actualizar updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_expenses_updated_at 
  before update on public.expenses
  for each row
  execute function update_updated_at_column();
```

5. Haz clic en **Run**
6. Verifica que diga "Success"

---

### Paso 3: Configurar las políticas RLS

1. En **SQL Editor**, crea otra **New Query**
2. Copia y pega el contenido de `supabase-expenses-rls.sql`:

```sql
-- Enable RLS on expenses table
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to view all expenses
CREATE POLICY "Users can view expenses"
  ON expenses
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to insert expenses
CREATE POLICY "Users can insert expenses"
  ON expenses
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to update expenses
CREATE POLICY "Users can update expenses"
  ON expenses
  FOR UPDATE
  USING (auth.role() = 'authenticated');
```

3. Haz clic en **Run**
4. Verifica que diga "Success"

---

### Paso 4: Verificar en la consola del navegador

1. Abre las **DevTools** del navegador (F12)
2. Ve a la pestaña **Console**
3. Intenta importar el archivo nuevamente
4. Busca mensajes de error en rojo

**Errores comunes:**

#### Error: "relation 'expenses' does not exist"
**Solución:** La tabla no existe, ejecuta el Paso 2

#### Error: "new row violates row-level security policy"
**Solución:** Las políticas RLS no están configuradas, ejecuta el Paso 3

#### Error: "null value in column 'xxx' violates not-null constraint"
**Solución:** Hay columnas vacías en tu Excel. Verifica que todas las filas tengan:
- Fecha Gasto
- Negocio
- Proveedor
- Tipo de gasto
- Total

---

### Paso 5: Verificar el formato del Excel

Tu archivo Excel debe tener estas columnas (exactamente con estos nombres):

| Columna | Requerida | Ejemplo |
|---------|-----------|---------|
| Fecha Gasto | ✅ Sí | 01/12/2024 |
| Negocio | ✅ Sí | GRUPO TCW SAS - THE CHEESE WHEEL - GRAN ESTACIÓN |
| Nombre Comercial | ✅ Sí | Proveedor XYZ |
| Tipo de gasto | ✅ Sí | Servicios |
| Total | ✅ Sí | 150000 |
| Impuestos | ✅ Sí | 28500 |
| N° Factura | ❌ No | FAC-001 |

**Importante:**
- Los nombres de las columnas deben ser EXACTOS (con tildes y espacios)
- No debe haber filas vacías al inicio
- Todos los campos requeridos deben tener valor

---

## 🔧 Verificación Rápida

Ejecuta esto en el SQL Editor de Supabase:

```sql
-- Verificar que la tabla existe
SELECT COUNT(*) FROM expenses;

-- Verificar las políticas RLS
SELECT * FROM pg_policies WHERE tablename = 'expenses';

-- Verificar la estructura de la tabla
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'expenses';
```

Si todo está bien, deberías ver:
- La tabla existe (puede tener 0 registros)
- 3 políticas RLS (view, insert, update)
- Las columnas de la tabla

---

## 📞 Siguiente Paso

Después de ejecutar los scripts SQL:

1. **Recarga la página** de gastos (F5)
2. **Intenta importar** el archivo nuevamente
3. **Revisa la consola** del navegador para ver errores específicos

Si sigue fallando, comparte:
- El mensaje de error de la consola del navegador
- Una captura de la tabla `expenses` en Supabase (si existe)

---

**Archivo actualizado:** `src/lib/services/expenses.ts`  
**Cambio:** Mejorado el logging de errores para diagnóstico
