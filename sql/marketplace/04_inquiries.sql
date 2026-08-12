-- ============================================================
-- 04_inquiries.sql — Pesan/inquiry dari calon client ke vendor
-- ============================================================
-- Requires: 02_vendors.sql, 03_products.sql

CREATE TABLE IF NOT EXISTS mp_inquiries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id         UUID NOT NULL REFERENCES mp_vendors(id) ON DELETE CASCADE,
  product_id        UUID REFERENCES mp_products(id) ON DELETE SET NULL,  -- Opsional

  -- Data client (tidak perlu login)
  client_name       TEXT NOT NULL,
  client_whatsapp   TEXT NOT NULL,   -- Format: 08xxx atau 628xxx
  client_email      TEXT,

  -- Detail event
  event_date        DATE,
  guest_count       INTEGER,
  budget_range      TEXT,            -- Misal: "20-30jt", "50-100jt"
  message           TEXT,

  -- Status tracking
  status            TEXT DEFAULT 'new'
                    CHECK (status IN ('new','read','replied','closed')),

  -- Metadata
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  read_at           TIMESTAMPTZ,    -- Kapan vendor baca
  replied_at        TIMESTAMPTZ     -- Kapan vendor reply
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mp_inquiries_vendor    ON mp_inquiries(vendor_id);
CREATE INDEX IF NOT EXISTS idx_mp_inquiries_product   ON mp_inquiries(product_id);
CREATE INDEX IF NOT EXISTS idx_mp_inquiries_status    ON mp_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_mp_inquiries_created   ON mp_inquiries(created_at DESC);

-- Auto-update
CREATE TRIGGER trg_mp_inquiries_updated_at
  BEFORE UPDATE ON mp_inquiries
  FOR EACH ROW EXECUTE FUNCTION mp_set_updated_at();

-- Auto-increment inquiry_count di mp_vendors
CREATE OR REPLACE FUNCTION mp_increment_vendor_inquiry()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE mp_vendors
  SET inquiry_count = inquiry_count + 1
  WHERE id = NEW.vendor_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mp_inquiries_increment_count
  AFTER INSERT ON mp_inquiries
  FOR EACH ROW EXECUTE FUNCTION mp_increment_vendor_inquiry();

-- RLS
ALTER TABLE mp_inquiries ENABLE ROW LEVEL SECURITY;

-- Siapa saja bisa INSERT inquiry (tidak perlu login)
CREATE POLICY "mp_inquiries_public_insert"
  ON mp_inquiries FOR INSERT
  WITH CHECK (true);

-- Vendor hanya bisa baca inquiry miliknya sendiri
CREATE POLICY "mp_inquiries_vendor_read"
  ON mp_inquiries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM mp_vendors v
      WHERE v.id = vendor_id AND v.user_id = auth.uid()
    )
  );

-- Vendor bisa update status inquiry miliknya
CREATE POLICY "mp_inquiries_vendor_update"
  ON mp_inquiries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM mp_vendors v
      WHERE v.id = vendor_id AND v.user_id = auth.uid()
    )
  );

COMMENT ON TABLE mp_inquiries IS 'Pesan / inquiry dari calon client ke vendor. Tidak butuh akun untuk kirim.';
COMMENT ON COLUMN mp_inquiries.client_whatsapp IS 'Nomor WA client, dipakai untuk generate wa.me link';
COMMENT ON COLUMN mp_inquiries.status IS 'new=belum dibaca, read=sudah dibaca, replied=sudah dibalas, closed=selesai';
