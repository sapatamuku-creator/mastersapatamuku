-- ============================================================
-- 05_reviews.sql — Ulasan / rating dari client untuk vendor
-- ============================================================
-- Requires: 02_vendors.sql, 03_products.sql

CREATE TABLE IF NOT EXISTS mp_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id       UUID NOT NULL REFERENCES mp_vendors(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES mp_products(id) ON DELETE SET NULL,
  inquiry_id      UUID REFERENCES mp_inquiries(id) ON DELETE SET NULL,  -- Verifikasi review

  -- Reviewer (tidak butuh akun)
  reviewer_name   TEXT NOT NULL,
  reviewer_city   TEXT,

  -- Rating & Konten
  rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title           TEXT,
  body            TEXT,
  event_date      DATE,              -- Kapan event berlangsung
  photo_urls      TEXT[] DEFAULT '{}',  -- Foto bukti dari Google Drive

  -- Moderasi
  status          TEXT DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','rejected')),
  is_featured     BOOLEAN DEFAULT false,   -- Review unggulan

  -- Metadata
  created_at      TIMESTAMPTZ DEFAULT now(),
  approved_at     TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mp_reviews_vendor    ON mp_reviews(vendor_id);
CREATE INDEX IF NOT EXISTS idx_mp_reviews_status    ON mp_reviews(status);
CREATE INDEX IF NOT EXISTS idx_mp_reviews_rating    ON mp_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_mp_reviews_created   ON mp_reviews(created_at DESC);

-- Sync rating_avg & review_count ke mp_vendors setiap ada review diapprove
CREATE OR REPLACE FUNCTION mp_sync_vendor_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE mp_vendors
  SET
    rating_avg   = (
      SELECT ROUND(AVG(rating)::NUMERIC, 2)
      FROM mp_reviews
      WHERE vendor_id = COALESCE(NEW.vendor_id, OLD.vendor_id)
        AND status = 'approved'
    ),
    review_count = (
      SELECT COUNT(*)
      FROM mp_reviews
      WHERE vendor_id = COALESCE(NEW.vendor_id, OLD.vendor_id)
        AND status = 'approved'
    )
  WHERE id = COALESCE(NEW.vendor_id, OLD.vendor_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mp_reviews_sync_rating
  AFTER INSERT OR UPDATE OR DELETE ON mp_reviews
  FOR EACH ROW EXECUTE FUNCTION mp_sync_vendor_rating();

-- RLS
ALTER TABLE mp_reviews ENABLE ROW LEVEL SECURITY;

-- Publik bisa lihat review yang sudah approved
CREATE POLICY "mp_reviews_public_read"
  ON mp_reviews FOR SELECT
  USING (status = 'approved');

-- Siapa saja bisa submit review (status = pending, tunggu moderasi)
CREATE POLICY "mp_reviews_public_insert"
  ON mp_reviews FOR INSERT
  WITH CHECK (status = 'pending');

-- Vendor bisa lihat semua review (termasuk pending) untuk vendornya
CREATE POLICY "mp_reviews_vendor_read_all"
  ON mp_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM mp_vendors v
      WHERE v.id = vendor_id AND v.user_id = auth.uid()
    )
  );

COMMENT ON TABLE mp_reviews IS 'Ulasan client untuk vendor. Semua review butuh approval admin sebelum tampil.';
COMMENT ON COLUMN mp_reviews.status IS 'pending=menunggu moderasi, approved=tampil, rejected=ditolak';
