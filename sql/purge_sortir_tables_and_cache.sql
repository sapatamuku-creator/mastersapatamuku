-- ==============================================================================
-- CLEANUP TANPA VACUUM (INSTAN < 0.1 DETIK — ANTI TIMEOUT)
-- ==============================================================================

-- 1. Matikan semua query lama yang sedang macet di database
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE pid <> pg_backend_pid() 
  AND state IN ('active', 'idle in transaction');

-- 2. Hapus langsung tabel sortir share & bridges (Instan & memori langsung bebas)
DROP TABLE IF EXISTS public.sortir_share_sessions CASCADE;
DROP TABLE IF EXISTS public.sortir_bridges CASCADE;
DROP VIEW IF EXISTS public.sortir_bridges_online CASCADE;
DROP FUNCTION IF EXISTS update_sortir_share_updated_at CASCADE;
