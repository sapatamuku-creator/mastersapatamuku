-- ==============================================================================
-- PATCH: PELEPASAN RELASI EVENT ORANG LAIN & FALLBACK WHATSAPP ADMIN (GATE-34)
-- URL Supabase: https://supabase.com/dashboard/project/llrapesaaoliyjrrrsjh/editor
-- ==============================================================================
-- Penjelasan:
-- Event yang dibuat sebelum v3.5 (Juli-Agustus 2026) memiliki vendor_id NULL.
-- Script ini memastikan bahwa event hanya ditautkan ke akun vendor yang nomor
-- WhatsApp-nya benar-benar cocok dengan nomor whatsapp_admin pada event tersebut.
-- Event milik orang lain (nomor WA berbeda) dikembalikan menjadi vendor_id = NULL.
-- ==============================================================================

-- 1. KEMBALIKAN vendor_id = NULL PADA EVENT YANG NOMOR WA-NYA BUKAN MILIK KNOWHERE STUDIO
UPDATE public.sortir_events 
SET vendor_id = NULL
WHERE vendor_id = '21c16abd-7f83-46e9-b034-23c14140700c'
  AND whatsapp_admin NOT IN ('6282214578132', '082214578132', '+6282214578132', '628123456789')
  AND event_name NOT ILIKE '%Knowhere%';

-- 2. TAUTKAN EVENT UNASSIGNED (vendor_id IS NULL) KE VENDOR JIKA NOMOR WHATSAPP COCOK
UPDATE public.sortir_events e
SET vendor_id = v.id
FROM public.sortir_vendors v
WHERE e.vendor_id IS NULL
  AND e.whatsapp_admin IS NOT NULL
  AND (
    REPLACE(REPLACE(e.whatsapp_admin, '+', ''), ' ', '') = REPLACE(REPLACE(v.whatsapp_number, '+', ''), ' ', '')
    OR '62' || SUBSTRING(REPLACE(REPLACE(e.whatsapp_admin, '+', ''), ' ', '') FROM 2) = REPLACE(REPLACE(v.whatsapp_number, '+', ''), ' ', '')
  );

-- 3. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';

-- 4. TAMPILKAN HASIL PENYELARASAN
SELECT id, event_name, event_slug, whatsapp_admin, vendor_id, created_at 
FROM public.sortir_events 
ORDER BY created_at DESC;
