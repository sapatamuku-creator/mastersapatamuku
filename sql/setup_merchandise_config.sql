-- ============================================================
-- SAPATAMU MIGRATION SCRIPT: MERCHANDISE CONFIG (PRODUK & STOK)
-- Tanggal: 2026-10-25
-- Jalankan di: Supabase Dashboard > SQL Editor
--
-- Tujuan: menyimpan daftar produk Merchandise Display (nama, stok
-- pcs, maksimal per klaim) di tabel khusus yang TIDAK ditimpa
-- write-back sinkronisasi Google Sheet (GAS) ke config_welcome.data.
-- Sebelumnya config_welcome.data.merchandise selalu hilang setelah
-- simpan karena lapisan GAS hanya mengenal 5 key klasik sheet
-- (urlFoto, teks sambutan 1-2, kapasitas, stok souvenir).
--
-- Simpan tabel ini juga dijalankan SEBELUM halaman Config/Profile
-- dipakai agar produk merchandise tersinkron antar-device.
-- ============================================================

-- 1. TABLE: merchandise_config
CREATE TABLE IF NOT EXISTS public.merchandise_config (
    ssid TEXT PRIMARY KEY,
    products JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ROW LEVEL SECURITY (RLS — anon by ssid, pola merchandise_claims)
ALTER TABLE public.merchandise_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon select merchandise_config" ON public.merchandise_config;
DROP POLICY IF EXISTS "Anon write merchandise_config" ON public.merchandise_config;

CREATE POLICY "Anon select merchandise_config" ON public.merchandise_config
    FOR SELECT TO anon, authenticated
    USING (ssid IS NOT NULL AND ssid <> '');

CREATE POLICY "Anon write merchandise_config" ON public.merchandise_config
    FOR ALL TO anon, authenticated
    USING (ssid IS NOT NULL AND ssid <> '')
    WITH CHECK (ssid IS NOT NULL AND ssid <> '');

-- 3. REALTIME PUBLICATION
-- Daftarkan ke Supabase Realtime Publication agar perubahan produk
-- saat event langsung terlihat di device lain tanpa refresh.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'merchandise_config'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.merchandise_config;
    END IF;
END $$;
