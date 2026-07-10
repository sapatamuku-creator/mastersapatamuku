-- =======================================================
-- SQL SETUP UNTUK TABLE SYSTEM_LOGS (SapaTamu v2.5)
-- =======================================================
-- Jalankan script ini di SQL Editor Supabase Anda.

-- 1. Membuat tabel system_logs
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    client_name TEXT,
    action_type TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,       -- 'SUCCESS', 'FAILED', 'WARNING'
    error_source TEXT,          -- 'CLIENT', 'VERCEL_EDGE', 'SUPABASE', 'GAS'
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Mengaktifkan Row Level Security (RLS)
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- 3. Membuat Kebijakan RLS (Policies)
-- Kebijakan INSERT: Mengizinkan client (anon) dan backend (authenticated) memasukan log
CREATE POLICY "Allow anon insert logs" ON public.system_logs
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow authenticated insert logs" ON public.system_logs
    FOR INSERT TO authenticated WITH CHECK (true);

-- Kebijakan SELECT: Mengizinkan admin/monitor membaca log untuk visualisasi realtime
CREATE POLICY "Allow anon select logs" ON public.system_logs
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow authenticated select logs" ON public.system_logs
    FOR SELECT TO authenticated USING (true);

-- 4. Indeks performa untuk pemantauan realtime
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_status ON public.system_logs(status);
