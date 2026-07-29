-- ============================================================
-- SAPATAMU: Setup Presence Monitor System
-- Jalankan sekali di: Supabase Dashboard > SQL Editor
-- URL: https://supabase.com/dashboard/project/llrapesaaoliyjrrrsjh/sql/new
-- ============================================================

-- Tabel sinyal force-disconnect dari monitor ke browser user
-- Monitor INSERT ke sini → browser user yang sesuai username langsung di-kick
CREATE TABLE IF NOT EXISTS terminated_sessions (
  username      TEXT PRIMARY KEY,
  terminated_at TIMESTAMPTZ DEFAULT NOW(),
  terminated_by TEXT DEFAULT 'admin',
  reason        TEXT DEFAULT 'Diputus oleh Admin Monitor'
);

ALTER TABLE terminated_sessions ENABLE ROW LEVEL SECURITY;

-- Anon bisa SELECT (browser user perlu baca untuk cek apakah mereka di-kick — dibatasi 24 jam terakhir)
DROP POLICY IF EXISTS "anon can read terminated_sessions" ON terminated_sessions;
CREATE POLICY "anon can read terminated_sessions"
  ON terminated_sessions FOR SELECT TO anon 
  USING (terminated_at > (now() - INTERVAL '24 hours'));

-- Authenticated bisa INSERT (monitor page insert sinyal kick) — require valid username
DROP POLICY IF EXISTS "authenticated can insert terminated_sessions" ON terminated_sessions;
DROP POLICY IF EXISTS "anon can insert terminated_sessions" ON terminated_sessions;
CREATE POLICY "authenticated can insert terminated_sessions"
  ON terminated_sessions FOR INSERT TO authenticated
  WITH CHECK (username IS NOT NULL AND length(username) >= 3 AND length(username) <= 100);

-- Authenticated bisa DELETE (cleanup setelah kick berhasil) — require valid username
DROP POLICY IF EXISTS "authenticated can delete terminated_sessions" ON terminated_sessions;
DROP POLICY IF EXISTS "anon can delete terminated_sessions" ON terminated_sessions;
CREATE POLICY "authenticated can delete terminated_sessions"
  ON terminated_sessions FOR DELETE TO authenticated
  USING (username IS NOT NULL AND length(username) >= 3 AND length(username) <= 100);

-- ============================================================
-- VERIFIKASI: Cek apakah Realtime sudah aktif untuk tabel ini
-- Supabase Dashboard > Database > Replication > terminated_sessions ON
-- ============================================================
