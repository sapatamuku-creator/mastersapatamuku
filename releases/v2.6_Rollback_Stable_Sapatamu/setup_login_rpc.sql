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
  -- 1. Ambil password admin_global (jika ada) untuk mengecek apakah user login sebagai usher
  SELECT password INTO v_admin_pass FROM clients WHERE username = 'admin_global' LIMIT 1;
  
  IF p_password = v_admin_pass THEN
    v_is_usher := true;
  END IF;

  -- 2. Cari data client berdasarkan username atau subdomain
  SELECT *
  INTO v_client
  FROM clients
  WHERE (username = p_username OR subdomain = p_username)
  LIMIT 1;

  IF FOUND THEN
    -- 3. Verifikasi Password (Cocok dengan client ATAU login sebagai usher/admin)
    IF v_is_usher OR v_client.password = p_password THEN
      -- Jika berhasil, kembalikan profil client tanpa memberikan data sensitif ekstra
      RETURN json_build_object(
        'username', COALESCE(NULLIF(v_client.client_name, ''), v_client.username),
        'subdomain', COALESCE(NULLIF(v_client.subdomain, ''), v_client.username),
        'ssId', v_client.ssid,
        'whatsapp', v_client.whatsapp,
        'email', v_client.email,
        'category', COALESCE(NULLIF(v_client.category, ''), 'wedding'),
        'status', v_client.status,
        'role', CASE WHEN v_is_usher THEN 'usher' ELSE 'client' END
      );
    ELSE
      RETURN json_build_object('error', 'Username atau Password salah');
    END IF;
  ELSE
    RETURN json_build_object('error', 'Username atau Password salah');
  END IF;
END;
$$;
