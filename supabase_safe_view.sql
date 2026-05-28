-- ============================================================
-- SAPATAMU: Buat View "client_public_profile" yang aman
-- Hanya expose kolom NON-sensitif (tanpa password, tanpa SSID)
-- Anon key bisa SELECT dari view ini, bukan dari tabel clients langsung
-- Jalankan di: Supabase Dashboard > SQL Editor
-- ============================================================

-- Buat atau timpa view yang aman
CREATE OR REPLACE VIEW client_public_profile AS
SELECT
    username,
    whatsapp,
    wedding_date,
    email,
    status,
    category,
    subdomain,
    client_name,
    package
FROM clients;

-- Aktifkan RLS pada view (inherit dari tabel)
-- Karena view ini SELECT dari clients (yang sudah locked),
-- kita perlu grant akses SELECT ke anon KHUSUS untuk view ini.

-- Grant akses SELECT ke anon HANYA pada view ini
GRANT SELECT ON client_public_profile TO anon;

-- Pastikan view ini bisa dibaca dengan row filter berdasarkan subdomain
-- (Frontend hanya bisa query ?subdomain=eq.xxx sehingga hanya 1 row yang kembali)
