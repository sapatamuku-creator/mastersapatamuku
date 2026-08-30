-- ============================================================
-- setup_sortir_bridges.sql — SapaTamu Sortir Nearby Bridge
-- Vendor-isolated presence: HP hanya lihat PC milik vendor sendiri
-- Jalankan di Supabase SQL Editor (idempotent)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sortir_bridges (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Identitas PC di LAN
    pc_name       VARCHAR(100) NOT NULL DEFAULT 'PC Sortir',
    ip            VARCHAR(45)  NOT NULL,          -- 192.168.1.10
    port          INTEGER      NOT NULL DEFAULT 8787,
    -- Statistik folder yang di-share
    folder_path   TEXT         NOT NULL DEFAULT 'D:\Foto',
    file_count    INTEGER      NOT NULL DEFAULT 0,
    -- Token acak untuk pairing QR (tidak perlu RLS, hanya untuk LAN)
    pair_token    VARCHAR(64)  NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    last_seen     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sortir_bridges_vendor ON public.sortir_bridges(vendor_id);
CREATE INDEX IF NOT EXISTS idx_sortir_bridges_last_seen ON public.sortir_bridges(last_seen DESC);

ALTER TABLE public.sortir_bridges ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama jika ada (idempotent)
DROP POLICY IF EXISTS "Vendors can manage own bridges" ON public.sortir_bridges;
DROP POLICY IF EXISTS "Vendors can read own bridges" ON public.sortir_bridges;
DROP POLICY IF EXISTS "Vendors can insert own bridges" ON public.sortir_bridges;
DROP POLICY IF EXISTS "Vendors can update own bridges" ON public.sortir_bridges;
DROP POLICY IF EXISTS "Vendors can delete own bridges" ON public.sortir_bridges;

-- Vendor hanya bisa lihat bridge miliknya sendiri (isolasi!)
CREATE POLICY "Vendors can read own bridges"
    ON public.sortir_bridges FOR SELECT
    USING (auth.uid() = vendor_id);

CREATE POLICY "Vendors can insert own bridges"
    ON public.sortir_bridges FOR INSERT
    WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "Vendors can update own bridges"
    ON public.sortir_bridges FOR UPDATE
    USING (auth.uid() = vendor_id)
    WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "Vendors can delete own bridges"
    ON public.sortir_bridges FOR DELETE
    USING (auth.uid() = vendor_id);

-- View helper: hanya bridge online < 2 menit
CREATE OR REPLACE VIEW public.sortir_bridges_online AS
SELECT * FROM public.sortir_bridges
WHERE last_seen > now() - interval '2 minutes';

COMMENT ON TABLE public.sortir_bridges IS 'Presence PC Sortir Bridge per vendor — HP Nearby hanya tampilkan vendor_id = auth.uid() (isolasi, tidak bisa lihat vendor lain)';
COMMENT ON VIEW public.sortir_bridges_online IS 'Hanya bridge yang heartbeat <2 menit — dipakai sortir.html nearby-panel';
