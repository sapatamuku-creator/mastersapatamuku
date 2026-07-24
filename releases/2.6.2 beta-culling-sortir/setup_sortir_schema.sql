-- ============================================================
-- setup_sortir_schema.sql — SapaTamu Sortir (Open Source)
-- ============================================================
-- Cara pakai:
--   FRESH INSTALL  → Jalankan seluruh file ini di Supabase SQL Editor
--   TABEL SUDAH ADA → Jalankan hanya bagian MIGRATION di bawah (baris 60+)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- BAGIAN 1: FRESH INSTALL (skip jika tabel sudah ada)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sortir_events (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name        VARCHAR(150) NOT NULL,
    event_slug        VARCHAR(100) UNIQUE NOT NULL,
    quota_limit       INTEGER DEFAULT 50 NOT NULL,
    drive_folder_url  TEXT NOT NULL,
    drive_folder_id   VARCHAR(100) NOT NULL,
    whatsapp_admin    VARCHAR(20) NOT NULL,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sortir_events_slug ON public.sortir_events(event_slug);

CREATE TABLE IF NOT EXISTS public.sortir_selections (
    event_id    UUID REFERENCES public.sortir_events(id) ON DELETE CASCADE NOT NULL,
    photo_id    VARCHAR(255) NOT NULL,
    photo_name  VARCHAR(255) NOT NULL,
    is_selected BOOLEAN DEFAULT TRUE NOT NULL,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (event_id, photo_id)
);

ALTER TABLE public.sortir_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sortir_selections ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
-- BAGIAN 2: MIGRATION — Aman dijalankan berulang kali
-- Semua operasi menggunakan IF NOT EXISTS / IF EXISTS
-- ────────────────────────────────────────────────────────────

-- 2a. Hapus kolom warisan versi SaaS/berbayar (penyebab NOT NULL error)
-- CASCADE otomatis menghapus RLS policy lama yang bergantung pada kolom ini
ALTER TABLE public.sortir_events DROP COLUMN IF EXISTS vendor_id CASCADE;
ALTER TABLE public.sortir_events DROP COLUMN IF EXISTS billing_status CASCADE;
ALTER TABLE public.sortir_events DROP COLUMN IF EXISTS subscription_plan CASCADE;
ALTER TABLE public.sortir_events DROP COLUMN IF EXISTS owner_id CASCADE;
ALTER TABLE public.sortir_events DROP COLUMN IF EXISTS is_paid CASCADE;
ALTER TABLE public.sortir_events DROP COLUMN IF EXISTS referral_code CASCADE;

-- 2b. Pastikan semua kolom open-source sudah ada
ALTER TABLE public.sortir_events ADD COLUMN IF NOT EXISTS whatsapp_admin   VARCHAR(20)  NOT NULL DEFAULT '';
ALTER TABLE public.sortir_events ADD COLUMN IF NOT EXISTS drive_folder_id  VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE public.sortir_events ADD COLUMN IF NOT EXISTS drive_folder_url  TEXT;
ALTER TABLE public.sortir_events ADD COLUMN IF NOT EXISTS quota_limit       INTEGER NOT NULL DEFAULT 50;

-- 2c. Buat RLS Policies (hanya jika belum ada)
DO $$
DECLARE
    policies TEXT[] := ARRAY[
        'Allow public insert for events',
        'Allow public select for events',
        'Allow public update for events',
        'Allow public delete for events',
        'Allow public insert for selections',
        'Allow public select for selections',
        'Allow public update for selections',
        'Allow public delete for selections'
    ];
    pol TEXT;
BEGIN
    -- sortir_events policies
    FOREACH pol IN ARRAY policies[1:4] LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sortir_events' AND policyname = pol) THEN
            CASE pol
                WHEN 'Allow public insert for events' THEN
                    EXECUTE 'CREATE POLICY "Allow public insert for events" ON public.sortir_events FOR INSERT WITH CHECK (true)';
                WHEN 'Allow public select for events' THEN
                    EXECUTE 'CREATE POLICY "Allow public select for events" ON public.sortir_events FOR SELECT USING (true)';
                WHEN 'Allow public update for events' THEN
                    EXECUTE 'CREATE POLICY "Allow public update for events" ON public.sortir_events FOR UPDATE USING (true)';
                WHEN 'Allow public delete for events' THEN
                    EXECUTE 'CREATE POLICY "Allow public delete for events" ON public.sortir_events FOR DELETE USING (true)';
            END CASE;
        END IF;
    END LOOP;

    -- sortir_selections policies
    FOREACH pol IN ARRAY policies[5:8] LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sortir_selections' AND policyname = pol) THEN
            CASE pol
                WHEN 'Allow public insert for selections' THEN
                    EXECUTE 'CREATE POLICY "Allow public insert for selections" ON public.sortir_selections FOR INSERT WITH CHECK (true)';
                WHEN 'Allow public select for selections' THEN
                    EXECUTE 'CREATE POLICY "Allow public select for selections" ON public.sortir_selections FOR SELECT USING (true)';
                WHEN 'Allow public update for selections' THEN
                    EXECUTE 'CREATE POLICY "Allow public update for selections" ON public.sortir_selections FOR UPDATE USING (true)';
                WHEN 'Allow public delete for selections' THEN
                    EXECUTE 'CREATE POLICY "Allow public delete for selections" ON public.sortir_selections FOR DELETE USING (true)';
            END CASE;
        END IF;
    END LOOP;
END $$;
