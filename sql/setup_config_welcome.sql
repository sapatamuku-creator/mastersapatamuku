-- ============================================================
-- SAPATAMU CONFIG_WELCOME TABLE MIGRATION (V1)
-- Jalankan script ini di: Supabase Dashboard > SQL Editor
-- URL: https://supabase.com/dashboard/project/llrapesaaoliyjrrrsjh/sql/new
-- ============================================================

CREATE TABLE IF NOT EXISTS public.config_welcome (
    ssid TEXT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.config_welcome ENABLE ROW LEVEL SECURITY;

-- 1. Allow public read access for anyone (for welcome.html loading)
DROP POLICY IF EXISTS "Public read config_welcome" ON public.config_welcome;
CREATE POLICY "Public read config_welcome"
ON public.config_welcome FOR SELECT
USING (true);

-- 2. Allow full access for requests with GAS Header Secret
DROP POLICY IF EXISTS "Anon CRUD config_welcome" ON public.config_welcome;
CREATE POLICY "Anon CRUD config_welcome" ON public.config_welcome
  FOR ALL TO anon
  USING (
    (current_setting('request.headers', true)::json ->> 'x-sapatamu-secret') = 'sb_publishable_414hQDyPBaFi0fnzmIKyZw_Iwa09Q0u'
  )
  WITH CHECK (
    (current_setting('request.headers', true)::json ->> 'x-sapatamu-secret') = 'sb_publishable_414hQDyPBaFi0fnzmIKyZw_Iwa09Q0u'
  );
