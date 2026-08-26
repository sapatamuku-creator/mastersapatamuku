-- ============================================================
-- SAPATAMU MIGRATION: Add jam_pulang & souvenir columns to tamu
-- Jalankan di: Supabase Dashboard > SQL Editor
-- URL: https://supabase.com/dashboard/project/llrapesaaoliyjrrrsjh/sql/new
-- ============================================================

-- 1. Tambah kolom jam_pulang jika belum ada
ALTER TABLE public.tamu
ADD COLUMN IF NOT EXISTS jam_pulang TEXT DEFAULT '-';

-- 2. Pastikan kolom souvenir sudah ada
ALTER TABLE public.tamu
ADD COLUMN IF NOT EXISTS souvenir TEXT DEFAULT 'tidak';

-- 3. Update Realtime publication untuk mencakup kolom baru
-- (Supabase postgres_changes akan otomatis menyiarkan update jam_pulang & souvenir)
