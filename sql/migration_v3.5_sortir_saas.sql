-- ==============================================================================
-- MIGRATION v3.5: SAPATAMU SORTIR SAAS (HYBRID ACCESS & SUBSCRIPTION)
-- URL Proyek: https://supabase.com/dashboard/project/llrapesaaoliyjrrrsjh/editor
-- ==============================================================================
-- Jalankan seluruh script SQL ini di Supabase SQL Editor.
-- Script ini membersihkan tabel lama jika ada, dan membuat skema baru v3.5 secara bersih.
-- ==============================================================================

-- 0. BERSIHKAN STRUKTUR LAMA (JIKA PERNAH ADA VERSI LEGACY)
DROP TABLE IF EXISTS public.sortir_otps CASCADE;
DROP TABLE IF EXISTS public.sortir_transactions CASCADE;
DROP TABLE IF EXISTS public.sortir_vendors CASCADE;

-- 1. TABEL UTAMA VENDOR (AKUN FOTOGRAFER / VENDOR)
CREATE TABLE public.sortir_vendors (
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

CREATE INDEX idx_sortir_vendors_email ON public.sortir_vendors(email);
CREATE INDEX idx_sortir_vendors_sub_exp ON public.sortir_vendors(subscription_expires_at);

-- 2. TABEL KODE VERIFIKASI OTP EMAIL (1 EMAIL 1 AKUN)
CREATE TABLE public.sortir_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_sortir_otps_email_code ON public.sortir_otps(email, otp_code, is_used);

-- 3. TAMBAHKAN RELASI VENDOR_ID PADA TABEL EVENT CULLING (JIKA BELUM ADA)
ALTER TABLE public.sortir_events 
ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.sortir_vendors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sortir_events_vendor_id ON public.sortir_events(vendor_id);

-- 4. TABEL RIWAYAT TRANSAKSI / MIDTRANS SUBSCRIPTION
CREATE TABLE public.sortir_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES public.sortir_vendors(id) ON DELETE CASCADE,
    order_id VARCHAR(100) UNIQUE NOT NULL,
    plan_type VARCHAR(50) NOT NULL, -- 'monthly' (25.000) / 'yearly' (250.000)
    gross_amount NUMERIC NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending' NOT NULL, -- 'pending', 'settlement', 'expire', 'cancel'
    snap_token TEXT,
    payment_type VARCHAR(50),
    payment_response JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    settled_at TIMESTAMPTZ
);

CREATE INDEX idx_sortir_transactions_vendor ON public.sortir_transactions(vendor_id);
CREATE INDEX idx_sortir_transactions_order ON public.sortir_transactions(order_id);

-- 5. TABEL LOG AKTIVITAS & NOTIFIKASI REMINDER (AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS public.sortir_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES public.sortir_vendors(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL, -- 'REMINDER_PRO_H7', 'REMINDER_PRO_H3', 'REMINDER_PRO_H1', 'AUTH_REGISTER', 'SUBSCRIPTION_ACTIVATED'
    channel VARCHAR(20) NOT NULL, -- 'WHATSAPP', 'EMAIL', 'SYSTEM'
    target VARCHAR(100) NOT NULL, -- No. WA / Email
    status VARCHAR(20) DEFAULT 'SUCCESS' NOT NULL, -- 'SUCCESS', 'FAILED'
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sortir_logs_vendor ON public.sortir_logs(vendor_id);
CREATE INDEX IF NOT EXISTS idx_sortir_logs_action ON public.sortir_logs(action_type, created_at);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.sortir_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sortir_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sortir_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sortir_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sortir_vendors' AND policyname = 'Allow public operations for sortir_vendors') THEN
        CREATE POLICY "Allow public operations for sortir_vendors" ON public.sortir_vendors FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sortir_otps' AND policyname = 'Allow public operations for sortir_otps') THEN
        CREATE POLICY "Allow public operations for sortir_otps" ON public.sortir_otps FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sortir_transactions' AND policyname = 'Allow public operations for sortir_transactions') THEN
        CREATE POLICY "Allow public operations for sortir_transactions" ON public.sortir_transactions FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sortir_logs' AND policyname = 'Allow public operations for sortir_logs') THEN
        CREATE POLICY "Allow public operations for sortir_logs" ON public.sortir_logs FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 6. STORED PROCEDURE / RPC: PENGURANGAN KUOTA & OVERRIDE SUBSCRIPTION (ATOMIC)

-- 6a. Atomic Create Event with Quota Check
CREATE OR REPLACE FUNCTION public.create_sortir_event_with_quota(
    p_vendor_id UUID,
    p_event_name VARCHAR(150),
    p_event_slug VARCHAR(100),
    p_quota_limit INTEGER,
    p_drive_folder_url TEXT,
    p_drive_folder_id VARCHAR(100),
    p_whatsapp_admin VARCHAR(20)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_vendor RECORD;
    v_is_pro BOOLEAN := FALSE;
    v_new_event public.sortir_events;
BEGIN
    -- 1. Ambil data vendor
    SELECT * INTO v_vendor FROM public.sortir_vendors WHERE id = p_vendor_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Akun vendor tidak ditemukan.');
    END IF;

    -- 2. Cek apakah vendor memiliki masa aktif PRO
    IF v_vendor.subscription_expires_at IS NOT NULL AND v_vendor.subscription_expires_at > NOW() THEN
        v_is_pro := TRUE;
    END IF;

    -- 3. Jika bukan PRO, periksa kuota Free Tier (10x)
    IF NOT v_is_pro THEN
        IF v_vendor.free_quota_remaining <= 0 THEN
            RETURN jsonb_build_object(
                'success', false, 
                'paywall_required', true, 
                'message', 'Kuota gratis Anda (10x event) telah habis. Silakan berlangganan paket PRO.'
            );
        END IF;
        
        -- Kurangi 1 kuota free tier
        UPDATE public.sortir_vendors 
        SET free_quota_remaining = free_quota_remaining - 1,
            updated_at = NOW()
        WHERE id = p_vendor_id;
    END IF;

    -- 4. Buat Event Culling Baru
    INSERT INTO public.sortir_events (
        event_name, event_slug, quota_limit, 
        drive_folder_url, drive_folder_id, whatsapp_admin, vendor_id
    ) VALUES (
        p_event_name, p_event_slug, p_quota_limit, 
        p_drive_folder_url, p_drive_folder_id, p_whatsapp_admin, p_vendor_id
    ) RETURNING * INTO v_new_event;

    RETURN jsonb_build_object(
        'success', true, 
        'event', row_to_json(v_new_event),
        'is_pro', v_is_pro,
        'quota_remaining', CASE WHEN v_is_pro THEN 9999 ELSE v_vendor.free_quota_remaining - 1 END
    );
END;
$$;

-- 6b. Atomic Activate / Override Subscription Plan
CREATE OR REPLACE FUNCTION public.activate_sortir_subscription(
    p_vendor_id UUID,
    p_order_id VARCHAR(100),
    p_plan_type VARCHAR(50) -- 'monthly' (30 hari) atau 'yearly' (365 hari)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_duration_days INT;
    v_expires_at TIMESTAMPTZ;
BEGIN
    IF p_plan_type = 'yearly' THEN
        v_duration_days := 365;
    ELSE
        v_duration_days := 30;
    END IF;

    -- Override reset: durasi baru dihitung dari NOW() + durasi paket
    v_expires_at := NOW() + (v_duration_days || ' days')::INTERVAL;

    -- Update Vendor
    UPDATE public.sortir_vendors
    SET subscription_plan = p_plan_type,
        subscription_started_at = NOW(),
        subscription_expires_at = v_expires_at,
        updated_at = NOW()
    WHERE id = p_vendor_id;

    -- Update Transaksi
    UPDATE public.sortir_transactions
    SET payment_status = 'settlement',
        settled_at = NOW()
    WHERE order_id = p_order_id;

    RETURN jsonb_build_object(
        'success', true,
        'plan_type', p_plan_type,
        'expires_at', v_expires_at
    );
END;
$$;
