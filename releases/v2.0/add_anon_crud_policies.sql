-- ============================================================
-- SAPATAMU SECURE SUPABASE MIGRATION SCRIPT (V2)
-- Jalankan script ini di: Supabase Dashboard > SQL Editor
-- URL: https://supabase.com/dashboard/project/llrapesaaoliyjrrrsjh/sql/new
--
-- PENTING: Ganti 'YOUR_SUPABASE_SERVICE_ROLE_KEY' di bawah ini dengan 
-- Supabase Service Role Key (Secret Key) Anda yang sebenarnya!
-- ============================================================

-- 1. TABLE: clients (Hanya izinkan akses lewat GAS dengan Header Secret)
DROP POLICY IF EXISTS "Anon CRUD clients" ON public.clients;
CREATE POLICY "Anon CRUD clients" ON public.clients
  FOR ALL TO anon 
  USING (
    (current_setting('request.headers', true)::json ->> 'x-sapatamu-secret') = 'YOUR_SUPABASE_SERVICE_ROLE_KEY'
  )
  WITH CHECK (
    (current_setting('request.headers', true)::json ->> 'x-sapatamu-secret') = 'YOUR_SUPABASE_SERVICE_ROLE_KEY'
  );

-- 2. TABLE: metadata_client (Hanya izinkan akses lewat GAS dengan Header Secret)
DROP POLICY IF EXISTS "Anon CRUD metadata_client" ON public.metadata_client;
CREATE POLICY "Anon CRUD metadata_client" ON public.metadata_client
  FOR ALL TO anon
  USING (
    (current_setting('request.headers', true)::json ->> 'x-sapatamu-secret') = 'YOUR_SUPABASE_SERVICE_ROLE_KEY'
  )
  WITH CHECK (
    (current_setting('request.headers', true)::json ->> 'x-sapatamu-secret') = 'YOUR_SUPABASE_SERVICE_ROLE_KEY'
  );

-- 3. TABLE: config_invitation (Hanya izinkan akses lewat GAS dengan Header Secret)
DROP POLICY IF EXISTS "Anon CRUD config_invitation" ON public.config_invitation;
CREATE POLICY "Anon CRUD config_invitation" ON public.config_invitation
  FOR ALL TO anon
  USING (
    (current_setting('request.headers', true)::json ->> 'x-sapatamu-secret') = 'YOUR_SUPABASE_SERVICE_ROLE_KEY'
  )
  WITH CHECK (
    (current_setting('request.headers', true)::json ->> 'x-sapatamu-secret') = 'YOUR_SUPABASE_SERVICE_ROLE_KEY'
  );
