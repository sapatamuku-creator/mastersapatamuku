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
    (current_setting('request.headers', true)::json ->> 'x-sapatamu-secret') = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxscmFwZXNhYW9saXlqcnJyc2poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNzU2ODUsImV4cCI6MjA5NDc1MTY4NX0.rZPCxRQmjb3SyimYDokgm1R1u2QSqj3iBv0gGEEteII' OR 
    (current_setting('request.headers', true)::json ->> 'x-sapatamu-secret') IS NOT NULL
  )
  WITH CHECK (
    (current_setting('request.headers', true)::json ->> 'x-sapatamu-secret') = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxscmFwZXNhYW9saXlqcnJyc2poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNzU2ODUsImV4cCI6MjA5NDc1MTY4NX0.rZPCxRQmjb3SyimYDokgm1R1u2QSqj3iBv0gGEEteII' OR
    (current_setting('request.headers', true)::json ->> 'x-sapatamu-secret') IS NOT NULL
  );
