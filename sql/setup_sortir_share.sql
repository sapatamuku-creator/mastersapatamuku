-- setup_sortir_share.sql — WebRTC signaling untuk 1-klik Share ke HP (vendor-isolated)
-- HP hanya lihat sesi milik vendor-nya sendiri (RLS vendor_id = auth.uid())

CREATE TABLE IF NOT EXISTS public.sortir_share_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    offer       JSONB,          -- RTCSessionDescription offer dari PC
    answer      JSONB,          -- answer dari HP
    status      VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','connected','closed')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sortir_share_vendor ON public.sortir_share_sessions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_sortir_share_status ON public.sortir_share_sessions(status, created_at DESC);

ALTER TABLE public.sortir_share_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendors can manage own share sessions" ON public.sortir_share_sessions;
CREATE POLICY "Vendors can manage own share sessions"
    ON public.sortir_share_sessions FOR ALL
    USING (auth.uid() = vendor_id)
    WITH CHECK (auth.uid() = vendor_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.touch_sortir_share_updated()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sortir_share_updated ON public.sortir_share_sessions;
CREATE TRIGGER trg_sortir_share_updated BEFORE UPDATE ON public.sortir_share_sessions
FOR EACH ROW EXECUTE FUNCTION public.touch_sortir_share_updated();

COMMENT ON TABLE public.sortir_share_sessions IS 'WebRTC signaling 1-klik Share ke HP — HP hanya lihat vendor_id miliknya (isolasi). PC showDirectoryPicker → offer, HP scan QR → answer, DataChannel P2P langsung Wi-Fi, file tetap di PC.';
