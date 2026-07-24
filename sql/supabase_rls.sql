-- ============================================================
-- SAPATAMU RLS MIGRATION SCRIPT
-- Jalankan di: Supabase Dashboard > SQL Editor
-- URL: https://supabase.com/dashboard/project/llrapesaaoliyjrrrsjh/sql/new
-- ============================================================

-- 1. TABLE: clients (PALING SENSITIF - Kunci total dari publik)
ALTER TABLE IF EXISTS clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read clients" ON clients;
DROP POLICY IF EXISTS "Anon write clients" ON clients;
DROP POLICY IF EXISTS "service_role bypass" ON clients;
DROP POLICY IF EXISTS "Allow anon select own row" ON clients;
-- TIDAK ADA policy SELECT untuk anon/public — hanya Service Role Key (GAS) yang bisa akses

-- 2. TABLE: tamu
ALTER TABLE IF EXISTS tamu ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all tamu" ON tamu;
DROP POLICY IF EXISTS "Anon select tamu by ssid" ON tamu;
DROP POLICY IF EXISTS "Anon insert tamu" ON tamu;
DROP POLICY IF EXISTS "Anon update tamu by ssid" ON tamu;
DROP POLICY IF EXISTS "Anon delete tamu by ssid" ON tamu;

CREATE POLICY "Anon select tamu by ssid" ON tamu
  FOR SELECT TO anon USING (ssid IS NOT NULL AND ssid != '');
CREATE POLICY "Anon insert tamu" ON tamu
  FOR INSERT TO anon WITH CHECK (ssid IS NOT NULL AND ssid != '');
CREATE POLICY "Anon update tamu by ssid" ON tamu
  FOR UPDATE TO anon USING (ssid IS NOT NULL AND ssid != '')
  WITH CHECK (ssid IS NOT NULL AND ssid != '');
CREATE POLICY "Anon delete tamu by ssid" ON tamu
  FOR DELETE TO anon USING (ssid IS NOT NULL AND ssid != '');

-- 3. TABLE: print_queue
ALTER TABLE IF EXISTS print_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all print_queue" ON print_queue;
DROP POLICY IF EXISTS "Anon select print_queue by ssid" ON print_queue;
DROP POLICY IF EXISTS "Anon insert print_queue" ON print_queue;
DROP POLICY IF EXISTS "Anon update print_queue by ssid" ON print_queue;
DROP POLICY IF EXISTS "Anon delete print_queue by ssid" ON print_queue;

CREATE POLICY "Anon select print_queue by ssid" ON print_queue
  FOR SELECT TO anon USING (ssid IS NOT NULL AND ssid != '');
CREATE POLICY "Anon insert print_queue" ON print_queue
  FOR INSERT TO anon WITH CHECK (ssid IS NOT NULL AND ssid != '');
CREATE POLICY "Anon update print_queue by ssid" ON print_queue
  FOR UPDATE TO anon USING (ssid IS NOT NULL AND ssid != '')
  WITH CHECK (ssid IS NOT NULL AND ssid != '');
CREATE POLICY "Anon delete print_queue by ssid" ON print_queue
  FOR DELETE TO anon USING (ssid IS NOT NULL AND ssid != '');

-- 4. TABLE: welcome_queue
ALTER TABLE IF EXISTS welcome_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all welcome_queue" ON welcome_queue;
DROP POLICY IF EXISTS "Anon select welcome_queue by ssid" ON welcome_queue;
DROP POLICY IF EXISTS "Anon insert welcome_queue" ON welcome_queue;
DROP POLICY IF EXISTS "Anon update welcome_queue by ssid" ON welcome_queue;
DROP POLICY IF EXISTS "Anon delete welcome_queue by ssid" ON welcome_queue;

CREATE POLICY "Anon select welcome_queue by ssid" ON welcome_queue
  FOR SELECT TO anon USING (ssid IS NOT NULL AND ssid != '');
CREATE POLICY "Anon insert welcome_queue" ON welcome_queue
  FOR INSERT TO anon WITH CHECK (ssid IS NOT NULL AND ssid != '');
CREATE POLICY "Anon update welcome_queue by ssid" ON welcome_queue
  FOR UPDATE TO anon USING (ssid IS NOT NULL AND ssid != '')
  WITH CHECK (ssid IS NOT NULL AND ssid != '');
CREATE POLICY "Anon delete welcome_queue by ssid" ON welcome_queue
  FOR DELETE TO anon USING (ssid IS NOT NULL AND ssid != '');

-- 5. TABLE: wishes_queue
ALTER TABLE IF EXISTS wishes_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all wishes_queue" ON wishes_queue;
DROP POLICY IF EXISTS "Anon select wishes_queue by ssid" ON wishes_queue;
DROP POLICY IF EXISTS "Anon insert wishes_queue" ON wishes_queue;

CREATE POLICY "Anon select wishes_queue by ssid" ON wishes_queue
  FOR SELECT TO anon USING (ssid IS NOT NULL AND ssid != '');
CREATE POLICY "Anon insert wishes_queue" ON wishes_queue
  FOR INSERT TO anon WITH CHECK (ssid IS NOT NULL AND ssid != '');

-- 6. TABLE: config_invitation
ALTER TABLE IF EXISTS config_invitation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read" ON config_invitation;
DROP POLICY IF EXISTS "Anon write" ON config_invitation;

CREATE POLICY "Public read config_invitation" ON config_invitation
  FOR SELECT TO anon USING (true);
