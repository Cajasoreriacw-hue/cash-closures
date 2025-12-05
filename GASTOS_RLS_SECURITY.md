# Políticas de Seguridad RLS - Tabla de Gastos

## ✅ Cambio Realizado

Se ha **eliminado la política de DELETE** del archivo `supabase-expenses-rls.sql` para **proteger la integridad de los datos**.

---

## 🔒 Políticas Activas

### 1. **SELECT (Ver)**
```sql
CREATE POLICY "Users can view expenses"
  ON expenses
  FOR SELECT
  USING (auth.role() = 'authenticated');
```
✅ **Permitido**: Usuarios autenticados pueden VER todos los gastos

---

### 2. **INSERT (Crear)**
```sql
CREATE POLICY "Users can insert expenses"
  ON expenses
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
```
✅ **Permitido**: Usuarios autenticados pueden CREAR nuevos gastos

---

### 3. **UPDATE (Editar)**
```sql
CREATE POLICY "Users can update expenses"
  ON expenses
  FOR UPDATE
  USING (auth.role() = 'authenticated');
```
✅ **Permitido**: Usuarios autenticados pueden EDITAR gastos existentes

---

### 4. **DELETE (Eliminar)**
```sql
-- NOTE: DELETE policy is intentionally NOT included
-- Users cannot delete expense records to maintain data integrity
```
❌ **NO PERMITIDO**: Nadie puede eliminar registros de gastos

---

## 🎯 Razón del Cambio

**Protección de Datos:**
- Los gastos son información financiera crítica
- No debe ser posible eliminar registros accidentalmente
- Mantiene un historial completo y auditable
- Previene pérdida de información

---

## 🔧 Si Necesitas Eliminar Registros

Si en el futuro necesitas eliminar registros, tienes dos opciones:

### Opción 1: Acceso Directo a la Base de Datos
Usar el SQL Editor de Supabase con permisos de administrador:
```sql
DELETE FROM expenses WHERE id = 'uuid-del-registro';
```

### Opción 2: Soft Delete (Recomendado)
Agregar una columna `deleted` en lugar de eliminar físicamente:

```sql
-- Agregar columna
ALTER TABLE expenses ADD COLUMN deleted BOOLEAN DEFAULT FALSE;

-- "Eliminar" (marcar como eliminado)
UPDATE expenses SET deleted = TRUE WHERE id = 'uuid';

-- Modificar políticas para excluir eliminados
CREATE POLICY "Users can view active expenses"
  ON expenses
  FOR SELECT
  USING (auth.role() = 'authenticated' AND deleted = FALSE);
```

---

## 📊 Resumen de Permisos

| Acción | Usuarios Autenticados | Usuarios No Autenticados |
|--------|----------------------|--------------------------|
| Ver gastos | ✅ Permitido | ❌ Bloqueado |
| Crear gastos | ✅ Permitido | ❌ Bloqueado |
| Editar gastos | ✅ Permitido | ❌ Bloqueado |
| Eliminar gastos | ❌ **BLOQUEADO** | ❌ Bloqueado |

---

## ⚠️ Importante

- Esta configuración protege tus datos financieros
- Solo administradores con acceso directo a Supabase pueden eliminar registros
- Se recomienda implementar "soft delete" si necesitas funcionalidad de eliminación
- Mantén backups regulares de la base de datos

---

**Fecha de actualización**: 2025-12-04  
**Archivo modificado**: `supabase-expenses-rls.sql`
