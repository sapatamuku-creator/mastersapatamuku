-- ==============================================================================
-- PURGE SORTIR SHARE & BRIDGES (CLEANUP MEMORY & REMOVE FROM SUPABASE)
-- Jalankan skrip ini di SQL Editor Supabase untuk menghapus tabel berat & cache
-- ==============================================================================

-- 1. Hapus Tabel & View Sesi / Bridges
DROP TABLE IF EXISTS public.sortir_share_sessions CASCADE;
DROP TABLE IF EXISTS public.sortir_bridges CASCADE;
DROP VIEW IF EXISTS public.sortir_bridges_online CASCADE;

-- 2. Bersihkan Trigger & Function Terkait
DROP FUNCTION IF EXISTS update_sortir_share_updated_at CASCADE;

-- 3. Reclaim Space & Kosongkan Memory Buffer Cache
VACUUM FULL;
ANALYZE;

-- ==============================================================================
-- SELESAI: Database Supabase kini 100% bersih dari tabel sortir share & bridges.
-- ==============================================================================
