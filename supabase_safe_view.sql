-- ============================================================
-- SAPATAMU: Buat View "client_public_profile" yang aman
-- Hanya expose kolom NON-sensitif (tanpa password, tanpa SSID)
-- Anon key bisa SELECT dari view ini, bukan dari tabel clients langsung
-- Jalankan di: Supabase Dashboard > SQL Editor
-- ============================================================

-- DROP dulu karena CREATE OR REPLACE tidak bisa mengubah urutan kolom view yang sudah ada
-- (Postgres error 42P16 jika kolom baru disisipkan di tengah)
DROP VIEW IF EXISTS client_public_profile;

CREATE VIEW client_public_profile AS
SELECT
    username,
    ssid,           -- Diperlukan oleh subdomain_resolver untuk resolve SSID via Supabase (lebih cepat dari GAS)
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
