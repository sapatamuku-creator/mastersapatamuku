-- ==============================================================================
-- PATCH MIGRATION v3.5: EVENT EXPIRY & AUTO-LOCK SCHEMA FIX (GATE-32 / Task 29)
-- URL Proyek: https://supabase.com/dashboard/project/llrapesaaoliyjrrrsjh/editor
-- ==============================================================================
-- Jalankan script ini di Supabase SQL Editor untuk mengatasi error:
-- "Could not find the 'expires_at' column of 'sortir_events' in the schema cache"
-- ==============================================================================

-- 1. TAMBAHKAN KOLOM expires_at & is_locked PADA TABEL sortir_events
ALTER TABLE public.sortir_events 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE NOT NULL;

-- 2. BUAT INDEX UNTUK PERFORMA QUERY & FILTER REALTIME
CREATE INDEX IF NOT EXISTS idx_sortir_events_expires_at ON public.sortir_events(expires_at);
CREATE INDEX IF NOT EXISTS idx_sortir_events_is_locked ON public.sortir_events(is_locked);

-- 3. HAPUS OVERLOAD LAMA (7 PARAMETER TANPA p_expires_at) AGAR TIDAK KONFLIK
DROP FUNCTION IF EXISTS public.create_sortir_event_with_quota(
    UUID, VARCHAR, VARCHAR, INTEGER, TEXT, VARCHAR, VARCHAR
);

-- 4. UPDATE STORED PROCEDURE RPC: create_sortir_event_with_quota DENGAN p_expires_at
CREATE OR REPLACE FUNCTION public.create_sortir_event_with_quota(
    p_vendor_id UUID,
    p_event_name VARCHAR(150),
    p_event_slug VARCHAR(100),
    p_quota_limit INTEGER,
    p_drive_folder_url TEXT,
    p_drive_folder_id VARCHAR(100),
    p_whatsapp_admin VARCHAR(20),
    p_expires_at TIMESTAMPTZ DEFAULT NULL
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

    -- 4. Buat Event Culling Baru (Menyimpan expires_at & is_locked = false)
    INSERT INTO public.sortir_events (
        event_name, 
        event_slug, 
        quota_limit, 
        drive_folder_url, 
        drive_folder_id, 
        whatsapp_admin, 
        vendor_id,
        expires_at,
        is_locked
    ) VALUES (
        p_event_name, 
        p_event_slug, 
        p_quota_limit, 
        p_drive_folder_url, 
        p_drive_folder_id, 
        p_whatsapp_admin, 
        p_vendor_id,
        p_expires_at,
        FALSE
    ) RETURNING * INTO v_new_event;

    RETURN jsonb_build_object(
        'success', true, 
        'event', row_to_json(v_new_event),
        'is_pro', v_is_pro,
        'quota_remaining', CASE WHEN v_is_pro THEN 9999 ELSE v_vendor.free_quota_remaining - 1 END
    );
END;
$$;

-- 5. RELOAD POSTGREST SCHEMA CACHE SUPABASE
NOTIFY pgrst, 'reload schema';
