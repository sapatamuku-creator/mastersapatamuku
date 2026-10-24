-- ============================================================
-- SAPATAMU MIGRATION SCRIPT: MERCHANDISE DISPLAY — CLAIM LOGS
-- Tanggal: 2026-10-24
-- Jalankan di: Supabase Dashboard > SQL Editor
-- URL: https://supabase.com/dashboard/project/llrapesaaoliyjrrrsjh/sql/new
--
-- Tujuan: log klaim merchandise per tamu per produk (stand kopi,
-- suvenir tambahan, dll). Stok & produk diatur via config_welcome
-- (halaman Config > Event Logistics), claims dicatat di sini.
-- ============================================================

-- 1. TABLE: merchandise_claims
CREATE TABLE IF NOT EXISTS public.merchandise_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ssid TEXT NOT NULL,
    kode_tamu TEXT NOT NULL,
    nama_tamu TEXT,
    product_key TEXT NOT NULL,
    product_name TEXT,
    qty INTEGER NOT NULL DEFAULT 1,
    jam_claim TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_ssid_kode_produk UNIQUE (ssid, kode_tamu, product_key)
);

-- 2. INDEXING
CREATE INDEX IF NOT EXISTS idx_merch_claims_ssid ON public.merchandise_claims (ssid);
CREATE INDEX IF NOT EXISTS idx_merch_claims_kode ON public.merchandise_claims (kode_tamu);
CREATE INDEX IF NOT EXISTS idx_merch_claims_produk ON public.merchandise_claims (product_key);

-- 3. ROW LEVEL SECURITY (RLS — anon by ssid, pola rsvp_dashboard)
ALTER TABLE public.merchandise_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon select merchandise_claims by ssid" ON public.merchandise_claims;
DROP POLICY IF EXISTS "Anon insert merchandise_claims by ssid" ON public.merchandise_claims;
DROP POLICY IF EXISTS "Anon update merchandise_claims by ssid" ON public.merchandise_claims;
DROP POLICY IF EXISTS "Anon delete merchandise_claims by ssid" ON public.merchandise_claims;
DROP POLICY IF EXISTS "Service write merchandise_claims" ON public.merchandise_claims;

CREATE POLICY "Anon select merchandise_claims by ssid" ON public.merchandise_claims
    FOR SELECT TO anon, authenticated
    USING (ssid IS NOT NULL AND ssid <> '');

CREATE POLICY "Anon insert merchandise_claims by ssid" ON public.merchandise_claims
    FOR INSERT TO anon, authenticated
    WITH CHECK (ssid IS NOT NULL AND ssid <> '');

CREATE POLICY "Anon update merchandise_claims by ssid" ON public.merchandise_claims
    FOR UPDATE TO anon, authenticated
    USING (ssid IS NOT NULL AND ssid <> '')
    WITH CHECK (ssid IS NOT NULL AND ssid <> '');

CREATE POLICY "Anon delete merchandise_claims by ssid" ON public.merchandise_claims
    FOR DELETE TO anon, authenticated
    USING (ssid IS NOT NULL AND ssid <> '');

CREATE POLICY "Service write merchandise_claims" ON public.merchandise_claims
    FOR ALL TO service_role
    USING (true);

-- 4. REALTIME PUBLICATION
-- Daftarkan ke Supabase Realtime Publication agar semua device di stand
-- menerima update instan (sisa stok dihitung dari total baris klaim, bukan
-- counter atomik di database — race dua device serentak hanya bisa jadi
-- overclaim kecil yang jujur dilaporkan).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'merchandise_claims'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.merchandise_claims;
    END IF;
END $$;
