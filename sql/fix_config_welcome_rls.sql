-- ============================================================
-- SAPATAMU FIX: RLS config_welcome — penyebab "HTTP 401" saat Simpan
-- Tanggal: 2026-10-25
-- Jalankan di: Supabase Dashboard > SQL Editor
--
-- Diagnosis (probe REST 2026-10-25):
--   GET  config_welcome  -> 200 OK
--   POST config_welcome  -> 401 dengan body:
--   {"code":"42501","message":"new row violates row-level security
--    policy for table \"config_welcome\""}
--
-- Artinya: RLS config_welcome hanya mengizinkan SELECT. Selama ini
-- upsert dari halaman Config/Profile SENYAP gagal dan data hanya
-- "tersimpan" lewat write-back GAS (yang menghapus merchandise &
-- customMetrics). Script ini menambah policy tulis untuk anon
-- (gated per ssid — pola sama persis dengan tabel merchandise_config).
-- ============================================================

-- 1. Pastikan RLS aktif (idempotent)
ALTER TABLE public.config_welcome ENABLE ROW LEVEL SECURITY;

-- 2. Policy tulis anon per ssid (idempotent)
DROP POLICY IF EXISTS "Anon write config_welcome" ON public.config_welcome;
CREATE POLICY "Anon write config_welcome" ON public.config_welcome
    FOR ALL TO anon, authenticated
    USING (ssid IS NOT NULL AND ssid <> '')
    WITH CHECK (ssid IS NOT NULL AND ssid <> '');

-- 3. Pastikan ada policy baca eksplisit (jaga-jaga bila RLS tadinya
--    mati sehingga baca sempat berjalan tanpa policy)
DROP POLICY IF EXISTS "Anon read config_welcome" ON public.config_welcome;
CREATE POLICY "Anon read config_welcome" ON public.config_welcome
    FOR SELECT TO anon, authenticated
    USING (ssid IS NOT NULL AND ssid <> '');

-- Catatan: policy permissive di PostgreSQL dikombinasikan dengan OR,
-- jadi policy baca lama (bila ada) tidak rusak — akses tetap berlaku.
