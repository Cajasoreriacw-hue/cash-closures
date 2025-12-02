-- =====================================================
-- ÍNDICES DE RENDIMIENTO PARA MONIT
-- =====================================================
-- Ejecuta este script en tu base de datos Supabase
-- para mejorar significativamente el rendimiento de las queries
-- =====================================================

-- 1. Índice para búsquedas por fecha en cash_closures
-- Mejora queries ordenadas por fecha (usado en dashboard y closures)
CREATE INDEX IF NOT EXISTS idx_cash_closures_date 
ON cash_closures(date DESC);

-- 2. Índice para búsquedas por cajero
-- Mejora filtros por cajero
CREATE INDEX IF NOT EXISTS idx_cash_closures_cashier 
ON cash_closures(cashier_id);

-- 3. Índice para búsquedas por tienda
-- Mejora filtros por tienda
CREATE INDEX IF NOT EXISTS idx_cash_closures_store 
ON cash_closures(store_id);

-- 4. Índice compuesto para filtros combinados
-- Mejora queries que filtran por fecha Y tienda simultáneamente
CREATE INDEX IF NOT EXISTS idx_cash_closures_date_store 
ON cash_closures(date DESC, store_id);

-- 5. Índice compuesto para filtros de fecha y cajero
-- Mejora queries que filtran por fecha Y cajero
CREATE INDEX IF NOT EXISTS idx_cash_closures_date_cashier 
ON cash_closures(date DESC, cashier_id);

-- 6. Índice para sobres por estado
-- Mejora queries de sobres activos
CREATE INDEX IF NOT EXISTS idx_cash_envelopes_status 
ON cash_envelopes(status);

-- 7. Índice para sobres por closure_id
-- Mejora joins entre closures y envelopes
CREATE INDEX IF NOT EXISTS idx_cash_envelopes_closure 
ON cash_envelopes(closure_id);

-- 8. Índice para canales por closure_id
-- Mejora joins entre closures y channels
CREATE INDEX IF NOT EXISTS idx_cash_closure_channels_closure 
ON cash_closure_channels(closure_id);

-- 9. Índice para búsquedas de cajeros por nombre
-- Mejora lookups de cajeros
CREATE INDEX IF NOT EXISTS idx_cashiers_name 
ON cashiers(name);

-- 10. Índice para búsquedas de tiendas por nombre
-- Mejora lookups de tiendas
CREATE INDEX IF NOT EXISTS idx_stores_name 
ON stores(name);

-- 11. Índice para created_at en cash_closures
-- Útil para auditoría y reportes
CREATE INDEX IF NOT EXISTS idx_cash_closures_created_at 
ON cash_closures(created_at DESC);

-- =====================================================
-- VERIFICACIÓN DE ÍNDICES
-- =====================================================
-- Ejecuta esta query para verificar que los índices se crearon correctamente:

-- SELECT 
--     schemaname,
--     tablename,
--     indexname,
--     indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--     AND tablename IN ('cash_closures', 'cash_envelopes', 'cash_closure_channels', 'cashiers', 'stores')
-- ORDER BY tablename, indexname;

-- =====================================================
-- ESTADÍSTICAS DE RENDIMIENTO
-- =====================================================
-- Para ver el uso de los índices después de un tiempo:

-- SELECT 
--     schemaname,
--     tablename,
--     indexname,
--     idx_scan as index_scans,
--     idx_tup_read as tuples_read,
--     idx_tup_fetch as tuples_fetched
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
--     AND tablename IN ('cash_closures', 'cash_envelopes', 'cash_closure_channels', 'cashiers', 'stores')
-- ORDER BY idx_scan DESC;

-- =====================================================
-- MANTENIMIENTO (Opcional)
-- =====================================================
-- Ejecuta periódicamente para mantener los índices optimizados:

-- ANALYZE cash_closures;
-- ANALYZE cash_envelopes;
-- ANALYZE cash_closure_channels;
-- ANALYZE cashiers;
-- ANALYZE stores;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
-- 1. Los índices mejoran las lecturas pero pueden ralentizar las escrituras
-- 2. En esta aplicación, las lecturas son mucho más frecuentes que las escrituras
-- 3. El impacto esperado es una mejora de 5-10x en queries complejas
-- 4. Los índices ocupan espacio adicional en disco (mínimo en este caso)
-- 5. Supabase maneja automáticamente el mantenimiento de índices
