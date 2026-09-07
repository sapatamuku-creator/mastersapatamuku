-- ==============================================================================
-- RESTORASI AKUN VENDOR: 21c16abd-7f83-46e9-b034-23c14140700c
-- (Knowhere Studio / opick8c@gmail.com)
-- URL Supabase: https://supabase.com/dashboard/project/llrapesaaoliyjrrrsjh/editor
-- ==============================================================================

-- 1. PASTIKAN TABEL sortir_vendors TERSEDIA
CREATE TABLE IF NOT EXISTS public.sortir_vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    whatsapp_number VARCHAR(50),
    free_quota_remaining INT DEFAULT 10 NOT NULL,
    subscription_plan VARCHAR(50) DEFAULT 'free' NOT NULL,
    subscription_started_at TIMESTAMPTZ,
    subscription_expires_at TIMESTAMPTZ,
    last_reminder_sent_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. PASTIKAN STRUKTUR KOLOM LENGKAP
ALTER TABLE public.sortir_vendors ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(255);
ALTER TABLE public.sortir_vendors ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.sortir_vendors ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE public.sortir_vendors ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50);
ALTER TABLE public.sortir_vendors ADD COLUMN IF NOT EXISTS free_quota_remaining INT DEFAULT 10;
ALTER TABLE public.sortir_vendors ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) DEFAULT 'free';
ALTER TABLE public.sortir_vendors ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ;
ALTER TABLE public.sortir_vendors ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
ALTER TABLE public.sortir_vendors ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;
ALTER TABLE public.sortir_vendors ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 3. PASTIKAN INDEX TERSEDIA
CREATE INDEX IF NOT EXISTS idx_sortir_vendors_email ON public.sortir_vendors(email);
CREATE INDEX IF NOT EXISTS idx_sortir_vendors_sub_exp ON public.sortir_vendors(subscription_expires_at);

-- 4. AKTIFKAN RLS & POLICY
ALTER TABLE public.sortir_vendors ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'sortir_vendors' 
          AND policyname = 'Allow public operations for sortir_vendors'
    ) THEN
        CREATE POLICY "Allow public operations for sortir_vendors" 
        ON public.sortir_vendors FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 5. KEMBALIKAN (RESTORE) DATA AKUN VENDOR DENGAN ID YANG SAMA
-- Password default yang dipulihkan: qwerty123
INSERT INTO public.sortir_vendors (
    id,
    vendor_name,
    email,
    password_hash,
    whatsapp_number,
    free_quota_remaining,
    subscription_plan,
    subscription_started_at,
    subscription_expires_at,
    is_active,
    created_at,
    updated_at
) VALUES (
    '21c16abd-7f83-46e9-b034-23c14140700c',
    'Knowhere Studio',
    'opick8c@gmail.com',
    encode(sha256(('qwerty123sapatamu_sortir_salt_2026')::bytea), 'hex'),
    '6282214578132',
    10,
    'monthly',
    NOW(),
    NOW() + INTERVAL '30 days',
    TRUE,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    vendor_name = EXCLUDED.vendor_name,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    whatsapp_number = EXCLUDED.whatsapp_number,
    subscription_plan = EXCLUDED.subscription_plan,
    subscription_expires_at = EXCLUDED.subscription_expires_at,
    is_active = TRUE,
    updated_at = NOW();

-- 6. HUBUNGKAN KEMBALI HANYA EVENT SORTIR MILIK VENDOR (BERDASARKAN NOMOR WHATSAPP ADMIN)
ALTER TABLE public.sortir_events 
ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.sortir_vendors(id) ON DELETE SET NULL;

UPDATE public.sortir_events 
SET vendor_id = '21c16abd-7f83-46e9-b034-23c14140700c'
WHERE vendor_id IS NULL
  AND (whatsapp_admin IN ('6282214578132', '082214578132', '+6282214578132', '628123456789')
       OR event_name ILIKE '%Knowhere%');

-- 7. NOTIFIKASI POSTGREST SUPAYA CACHE REFRESH
NOTIFY pgrst, 'reload schema';

-- 8. TAMPILKAN DATA AKUN YANG BERHASIL DIRESTORASI
SELECT id, vendor_name, email, whatsapp_number, subscription_plan, subscription_expires_at, free_quota_remaining 
FROM public.sortir_vendors 
WHERE id = '21c16abd-7f83-46e9-b034-23c14140700c';
