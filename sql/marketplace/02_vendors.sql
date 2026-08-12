-- ============================================================
-- 02_vendors.sql — Tabel utama vendor marketplace sapatamu.id
-- ============================================================
-- Requires: 01_categories.sql

CREATE TABLE IF NOT EXISTS mp_vendors (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- Supabase Auth user (nullable sebelum approved)
  category_id       UUID NOT NULL REFERENCES mp_categories(id),

  -- Identitas bisnis
  business_name     TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  owner_name        TEXT NOT NULL,
  description       TEXT,
  short_bio         TEXT,               -- Max ~200 char, untuk card preview

  -- Kontak
  whatsapp          TEXT NOT NULL,       -- Format: 628xxxx (tanpa +)
  email             TEXT NOT NULL,
  instagram         TEXT,               -- @handle
  website           TEXT,

  -- Lokasi
  city              TEXT NOT NULL,
  province          TEXT NOT NULL,
  address           TEXT,

  -- Media — URL dari Google Drive proxy (/api/mp-img?id=...)
  cover_image_url   TEXT,
  logo_url          TEXT,
  images            TEXT[] DEFAULT '{}', -- Array URL galeri

  -- Pricing
  price_from        BIGINT DEFAULT 0,    -- Harga terendah (auto-update dari mp_products)

  -- Status & Verifikasi
  is_active         BOOLEAN DEFAULT false,   -- Admin approval required
  is_verified       BOOLEAN DEFAULT false,   -- Badge verified
  is_featured       BOOLEAN DEFAULT false,   -- Featured di homepage

  -- Rating (denormalized untuk performance query)
  rating_avg        NUMERIC(3,2) DEFAULT 0.00,
  review_count      INTEGER DEFAULT 0,

  -- Komisi
  commission_rate   NUMERIC(5,2) DEFAULT 5.00,  -- Persen, default 5%

  -- Analytics
  view_count        INTEGER DEFAULT 0,
  inquiry_count     INTEGER DEFAULT 0,

  -- Metadata
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  approved_at       TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mp_vendors_slug        ON mp_vendors(slug);
CREATE INDEX IF NOT EXISTS idx_mp_vendors_category    ON mp_vendors(category_id);
CREATE INDEX IF NOT EXISTS idx_mp_vendors_city        ON mp_vendors(LOWER(city));
CREATE INDEX IF NOT EXISTS idx_mp_vendors_active      ON mp_vendors(is_active);
CREATE INDEX IF NOT EXISTS idx_mp_vendors_featured    ON mp_vendors(is_featured);
CREATE INDEX IF NOT EXISTS idx_mp_vendors_rating      ON mp_vendors(rating_avg DESC);
CREATE INDEX IF NOT EXISTS idx_mp_vendors_user        ON mp_vendors(user_id);

-- Full-text search index (pencarian keyword)
CREATE INDEX IF NOT EXISTS idx_mp_vendors_fts ON mp_vendors
  USING GIN(to_tsvector('indonesian', business_name || ' ' || COALESCE(short_bio,'') || ' ' || COALESCE(description,'')));

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION mp_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mp_vendors_updated_at
  BEFORE UPDATE ON mp_vendors
  FOR EACH ROW EXECUTE FUNCTION mp_set_updated_at();

-- RLS
ALTER TABLE mp_vendors ENABLE ROW LEVEL SECURITY;

-- Public bisa baca vendor yang sudah aktif
CREATE POLICY "mp_vendors_public_read"
  ON mp_vendors FOR SELECT
  USING (is_active = true);

-- Vendor hanya bisa update data sendiri
CREATE POLICY "mp_vendors_owner_update"
  ON mp_vendors FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Insert via API (service role) untuk register-vendor
CREATE POLICY "mp_vendors_service_insert"
  ON mp_vendors FOR INSERT
  WITH CHECK (true);  -- Dikontrol di API level

COMMENT ON TABLE mp_vendors IS 'Data vendor/penyedia layanan pernikahan di marketplace sapatamu.id';
COMMENT ON COLUMN mp_vendors.images IS 'Array URL gambar galeri dari Google Drive proxy';
COMMENT ON COLUMN mp_vendors.price_from IS 'Harga terendah produk, di-update otomatis saat produk berubah';
COMMENT ON COLUMN mp_vendors.is_active IS 'false = pending review admin, true = tampil di marketplace';
