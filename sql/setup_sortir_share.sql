-- setup_sortir_share.sql — WebRTC signaling 1-klik Share ke HP (Auto 1-Scan P2P)
-- Mendukung sinyal WebRTC instan tanpa login (anonymous session_key) maupun dengan login vendor

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

CREATE INDEX IF NOT EXISTS idx_sortir_share_key ON public.sortir_share_sessions(session_key);
CREATE INDEX IF NOT EXISTS idx_sortir_share_vendor ON public.sortir_share_sessions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_sortir_share_status ON public.sortir_share_sessions(status, created_at DESC);

ALTER TABLE public.sortir_share_sessions ENABLE ROW LEVEL SECURITY;

-- Kebijakan akses: Izinkan public anon / authenticated untuk membuat dan membaca session berdasarkan session_key
DROP POLICY IF EXISTS "Public can create and participate in share sessions" ON public.sortir_share_sessions;
CREATE POLICY "Public can create and participate in share sessions"
    ON public.sortir_share_sessions FOR ALL
    USING (true)
    WITH CHECK (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.touch_sortir_share_updated()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sortir_share_updated ON public.sortir_share_sessions;
CREATE TRIGGER trg_sortir_share_updated BEFORE UPDATE ON public.sortir_share_sessions
FOR EACH ROW EXECUTE FUNCTION public.touch_sortir_share_updated();

COMMENT ON TABLE public.sortir_share_sessions IS 'WebRTC signaling 1-klik Share ke HP — 1-Scan QR auto signaling via Supabase table & Realtime Broadcast. PC showDirectoryPicker → stream thumbnail, HP scan → select & export.';
