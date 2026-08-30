-- setup_sortir_share.sql — WebRTC signaling 1-klik Share ke HP (Auto 1-Scan P2P)
-- Script ini aman dijalankan ulang (Idempotent Migration)

-- 1. Buat tabel jika belum ada
CREATE TABLE IF NOT EXISTS public.sortir_share_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_key VARCHAR(64) UNIQUE,
    vendor_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    offer       JSONB,          -- RTCSessionDescription offer dari PC
    answer      JSONB,          -- RTCSessionDescription answer dari HP
    status      VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','connected','closed')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Jika tabel sudah ada dari versi sebelumnya, tambahkan kolom yang belum ada
ALTER TABLE public.sortir_share_sessions ADD COLUMN IF NOT EXISTS session_key VARCHAR(64) UNIQUE;
ALTER TABLE public.sortir_share_sessions ADD COLUMN IF NOT EXISTS offer JSONB;
ALTER TABLE public.sortir_share_sessions ADD COLUMN IF NOT EXISTS answer JSONB;
ALTER TABLE public.sortir_share_sessions ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'waiting';

-- Izinkan vendor_id bernilai NULL agar bisa dipakai tanpa wajib login Supabase
DO $$
BEGIN
    ALTER TABLE public.sortir_share_sessions ALTER COLUMN vendor_id DROP NOT NULL;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 3. Indexes untuk performa query instan
CREATE INDEX IF NOT EXISTS idx_sortir_share_key ON public.sortir_share_sessions(session_key);
CREATE INDEX IF NOT EXISTS idx_sortir_share_vendor ON public.sortir_share_sessions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_sortir_share_status ON public.sortir_share_sessions(status, created_at DESC);

-- 4. Enable Row Level Security & Public Anonymous Policies
ALTER TABLE public.sortir_share_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendors can manage own share sessions" ON public.sortir_share_sessions;
DROP POLICY IF EXISTS "Public can create and participate in share sessions" ON public.sortir_share_sessions;

CREATE POLICY "Public can create and participate in share sessions"
    ON public.sortir_share_sessions FOR ALL
    USING (true)
    WITH CHECK (true);

-- 5. Trigger Auto-update updated_at
CREATE OR REPLACE FUNCTION public.touch_sortir_share_updated()
RETURNS TRIGGER AS $$
BEGIN 
    NEW.updated_at = now(); 
    RETURN NEW; 
END; 
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sortir_share_updated ON public.sortir_share_sessions;
CREATE TRIGGER trg_sortir_share_updated BEFORE UPDATE ON public.sortir_share_sessions
FOR EACH ROW EXECUTE FUNCTION public.touch_sortir_share_updated();

COMMENT ON TABLE public.sortir_share_sessions IS 'WebRTC signaling 1-klik Share ke HP — Auto 1-Scan P2P signaling via Supabase table & Realtime Broadcast.';
