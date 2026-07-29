CREATE TABLE IF NOT EXISTS public.metadata_client (
    ssid TEXT PRIMARY KEY,
    nama_pengantin TEXT,
    hari_tanggal TEXT,
    lokasi_acara TEXT,
    waktu_acara TEXT,
    link_invitation TEXT,
    format_pesan_wa TEXT,
    format_pesan_wa_custom TEXT,
    sesi_1 TEXT,
    sesi_2 TEXT,
    sesi_3 TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.metadata_client ENABLE ROW LEVEL SECURITY;

-- Allow read access for public / anon (idempotent, conditioned on non-empty ssid)
DROP POLICY IF EXISTS "Public read metadata_client" ON public.metadata_client;
CREATE POLICY "Public read metadata_client"
ON public.metadata_client FOR SELECT
TO anon, authenticated
USING (ssid IS NOT NULL AND ssid <> '');

-- Allow full access for service_role
DROP POLICY IF EXISTS "Service write metadata_client" ON public.metadata_client;
CREATE POLICY "Service write metadata_client"
ON public.metadata_client FOR ALL
TO service_role
USING (true);
