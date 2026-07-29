-- ============================================================
-- SAPATAMU: View "client_public_profile"
-- Hanya expose kolom publik yang diperlukan (tanpa password, tanpa sensitive tokens)
-- SSID tetap di-expose untuk client-side resolution (window.CURRENT_SS_ID)
-- ============================================================

DROP VIEW IF EXISTS client_public_profile;

CREATE VIEW client_public_profile AS
SELECT
    username,
    ssid,           -- Diperlukan oleh subdomain_resolver untuk resolve SSID via Supabase (publik)
    whatsapp,
    wedding_date,
    email,
    status,
    category,
    subdomain,
    client_name,
    package
FROM clients;

-- Grant akses SELECT ke anon HANYA pada view ini
GRANT SELECT ON client_public_profile TO anon;
GRANT SELECT ON client_public_profile TO authenticated;
