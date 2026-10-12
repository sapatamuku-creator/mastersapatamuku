-- ============================================================
-- SAPATAMU MIGRATION SCRIPT: RSVP REALTIME DASHBOARD
-- Tanggal: 2026-10-12
-- Jalankan di: Supabase Dashboard > SQL Editor
-- URL: https://supabase.com/dashboard/project/llrapesaaoliyjrrrsjh/sql/new
-- ============================================================

-- 1. TABLE: rsvp_dashboard
CREATE TABLE IF NOT EXISTS public.rsvp_dashboard (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ssid TEXT NOT NULL,
    kode_tamu TEXT NOT NULL,
    nama_tamu TEXT,
    kategori TEXT DEFAULT 'Umum',
    pihak_pengundang TEXT,
    sesi TEXT,
    status_rsvp TEXT NOT NULL DEFAULT 'opened', -- 'opened', 'hadir', 'tidak_hadir'
    pax INTEGER DEFAULT 0,
    ucapan TEXT,
    selfie_url TEXT,
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    open_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_ssid_kode_rsvp UNIQUE (ssid, kode_tamu)
);

-- 2. INDEXING
CREATE INDEX IF NOT EXISTS idx_rsvp_dash_ssid ON public.rsvp_dashboard (ssid);
CREATE INDEX IF NOT EXISTS idx_rsvp_dash_status ON public.rsvp_dashboard (status_rsvp);
CREATE INDEX IF NOT EXISTS idx_rsvp_dash_kode ON public.rsvp_dashboard (kode_tamu);

-- 3. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.rsvp_dashboard ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon select rsvp_dashboard by ssid" ON public.rsvp_dashboard;
DROP POLICY IF EXISTS "Anon insert rsvp_dashboard by ssid" ON public.rsvp_dashboard;
DROP POLICY IF EXISTS "Anon update rsvp_dashboard by ssid" ON public.rsvp_dashboard;
DROP POLICY IF EXISTS "Anon delete rsvp_dashboard by ssid" ON public.rsvp_dashboard;
DROP POLICY IF EXISTS "Service write rsvp_dashboard" ON public.rsvp_dashboard;

CREATE POLICY "Anon select rsvp_dashboard by ssid" ON public.rsvp_dashboard
    FOR SELECT TO anon, authenticated
    USING (ssid IS NOT NULL AND ssid <> '');

CREATE POLICY "Anon insert rsvp_dashboard by ssid" ON public.rsvp_dashboard
    FOR INSERT TO anon, authenticated
    WITH CHECK (ssid IS NOT NULL AND ssid <> '');

CREATE POLICY "Anon update rsvp_dashboard by ssid" ON public.rsvp_dashboard
    FOR UPDATE TO anon, authenticated
    USING (ssid IS NOT NULL AND ssid <> '')
    WITH CHECK (ssid IS NOT NULL AND ssid <> '');

CREATE POLICY "Anon delete rsvp_dashboard by ssid" ON public.rsvp_dashboard
    FOR DELETE TO anon, authenticated
    USING (ssid IS NOT NULL AND ssid <> '');

CREATE POLICY "Service write rsvp_dashboard" ON public.rsvp_dashboard
    FOR ALL TO service_role
    USING (true);

-- 4. REALTIME PUBLICATION
-- Daftarkan ke Supabase Realtime Publication agar browser klien menerima update instan
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'rsvp_dashboard'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.rsvp_dashboard;
    END IF;
END $$;
