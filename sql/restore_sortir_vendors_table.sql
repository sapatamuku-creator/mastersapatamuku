-- ==============================================================================
-- RESTORASI TABEL sortir_vendors (AMAN & IDEMPOTEN)
-- URL Supabase: https://supabase.com/dashboard/project/llrapesaaoliyjrrrsjh/editor
-- ==============================================================================
-- Catatan Penting:
-- Nama tabel resmi di database adalah 'sortir_vendors' (dengan akhiran huruf 's', jamak).
-- Script ini 100% AMAN & TIDAK MENGHAPUS data yang sudah ada (menggunakan IF NOT EXISTS).
-- ==============================================================================

-- 1. BUAT TABEL sortir_vendors JIKA BELUM TERSEDIA
CREATE TABLE IF NOT EXISTS public.sortir_vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    whatsapp_number VARCHAR(50),
    free_quota_remaining INT DEFAULT 10 NOT NULL,
    subscription_plan VARCHAR(50) DEFAULT 'free' NOT NULL, -- 'free', 'monthly', 'yearly'
    subscription_started_at TIMESTAMPTZ,
    subscription_expires_at TIMESTAMPTZ,
    last_reminder_sent_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. PASTIKAN SEMUA KOLOM TERSEDIA LENGKAP JIKA SEBELUMNYA SUDAH ADA
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
ALTER TABLE public.sortir_vendors ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.sortir_vendors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- 3. BUAT INDEX PENCARIAN CEPAT EMAIL & MASA AKTIF
CREATE INDEX IF NOT EXISTS idx_sortir_vendors_email ON public.sortir_vendors(email);
CREATE INDEX IF NOT EXISTS idx_sortir_vendors_sub_exp ON public.sortir_vendors(subscription_expires_at);

-- 4. ATUR ROW LEVEL SECURITY (RLS)
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

-- 5. RELASIKAN KE TABEL sortir_events
ALTER TABLE public.sortir_events 
ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.sortir_vendors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sortir_events_vendor_id ON public.sortir_events(vendor_id);

-- 6. RELOAD SCHEMA CACHE SUPABASE
NOTIFY pgrst, 'reload schema';
