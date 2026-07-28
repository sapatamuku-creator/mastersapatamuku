-- ============================================================
-- SAPATAMU PASSWORD HASHING MIGRATION
-- Jalankan script ini di: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Enable pgcrypto extension untuk bcrypt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Fungsi untuk hash password (dipanggil dari Google Apps Script)
CREATE OR REPLACE FUNCTION hash_password(p_password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN crypt(p_password, gen_salt('bf', 12));
END;
$$;

-- 3. Fungsi untuk verify password (dipanggil dari Google Apps Script)
CREATE OR REPLACE FUNCTION verify_password(p_password text, p_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN crypt(p_password, p_hash) = p_hash;
END;
$$;

-- 4. Update auth_client function untuk use bcrypt
DROP FUNCTION IF EXISTS auth_client(text, text);
CREATE OR REPLACE FUNCTION auth_client(p_username text, p_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client record;
  v_admin_pass text;
  v_is_usher boolean := false;
BEGIN
  -- 1. Ambil password admin_global (hash) untuk mengecek apakah user login sebagai usher
  SELECT password INTO v_admin_pass FROM clients WHERE username = 'admin_global' LIMIT 1;
  
  -- Cek apakah password cocok dengan hash admin (bcrypt)
  IF v_admin_pass IS NOT NULL AND length(v_admin_pass) > 0 THEN
    -- Jika admin password masih plaintext (migration phase), compare langsung
    IF v_admin_pass = p_password THEN
      v_is_usher := true;
    -- Jika admin password sudah hashed, gunakan bcrypt verify
    ELSIF length(v_admin_pass) = 60 AND v_admin_pass LIKE '$2%' THEN
      IF crypt(p_password, v_admin_pass) = v_admin_pass THEN
        v_is_usher := true;
      END IF;
    END IF;
  END IF;

  -- 2. Cari data client berdasarkan username atau subdomain
  SELECT *
  INTO v_client
  FROM clients
  WHERE (username = p_username OR subdomain = p_username)
  LIMIT 1;

  IF FOUND THEN
    -- 3. Verifikasi Password (Cocok dengan client ATAU login sebagai usher/admin)
    IF v_is_usher THEN
      RETURN json_build_object(
        'username', COALESCE(NULLIF(v_client.client_name, ''), v_client.username),
        'subdomain', COALESCE(NULLIF(v_client.subdomain, ''), v_client.username),
        'ssId', v_client.ssid,
        'whatsapp', v_client.whatsapp,
        'email', v_client.email,
        'category', COALESCE(NULLIF(v_client.category, ''), 'wedding'),
        'status', v_client.status,
        'role', 'usher'
      );
    ELSIF v_client.password = p_password THEN
      -- Password masih plaintext (migration phase)
      RETURN json_build_object(
        'username', COALESCE(NULLIF(v_client.client_name, ''), v_client.username),
        'subdomain', COALESCE(NULLIF(v_client.subdomain, ''), v_client.username),
        'ssId', v_client.ssid,
        'whatsapp', v_client.whatsapp,
        'email', v_client.email,
        'category', COALESCE(NULLIF(v_client.category, ''), 'wedding'),
        'status', v_client.status,
        'role', 'client'
      );
    ELSIF length(v_client.password) = 60 AND v_client.password LIKE '$2%' THEN
      -- Password sudah hashed, gunakan bcrypt verify
      IF crypt(p_password, v_client.password) = v_client.password THEN
        RETURN json_build_object(
          'username', COALESCE(NULLIF(v_client.client_name, ''), v_client.username),
          'subdomain', COALESCE(NULLIF(v_client.subdomain, ''), v_client.username),
          'ssId', v_client.ssid,
          'whatsapp', v_client.whatsapp,
          'email', v_client.email,
          'category', COALESCE(NULLIF(v_client.category, ''), 'wedding'),
          'status', v_client.status,
          'role', 'client'
        );
      ELSE
        RETURN json_build_object('error', 'Username atau Password salah');
      END IF;
    ELSE
      RETURN json_build_object('error', 'Username atau Password salah');
    END IF;
  ELSE
    RETURN json_build_object('error', 'Username atau Password salah');
  END IF;
END;
$$;

-- 5. Migration: Hash semua password yang masih plaintext
-- WARNING: Jalankan ini SATU KALI saja setelah deploy fungsi di atas
-- Uncomment baris di bawah ini untuk menjalankan migration

/*
UPDATE clients 
SET password = crypt(password, gen_salt('bf', 12))
WHERE length(password) < 60 
  OR password NOT LIKE '$2%';
*/

-- 6. Verifikasi migration (jalankan SETELAH migration)
-- Uncomment untuk check berapa password yang sudah/hash belum
/*
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN length(password) = 60 AND password LIKE '$2%' THEN 1 ELSE 0 END) as hashed,
  SUM(CASE WHEN length(password) < 60 OR password NOT LIKE '$2%' THEN 1 ELSE 0 END) as plaintext
FROM clients;
*/
