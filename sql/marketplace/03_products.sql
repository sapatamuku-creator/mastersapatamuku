-- ============================================================
-- 03_products.sql — Paket/produk yang dijual vendor
-- ============================================================
-- Requires: 02_vendors.sql

CREATE TABLE IF NOT EXISTS mp_products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id       UUID NOT NULL REFERENCES mp_vendors(id) ON DELETE CASCADE,

  -- Info produk
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  description     TEXT,
  short_desc      TEXT,              -- Summary singkat untuk card

  -- Harga
  price           BIGINT NOT NULL,   -- Harga dalam Rupiah (integer, tanpa desimal)
  price_label     TEXT,              -- Label tampil, misal "mulai dari", "per orang", dll
  is_price_visible BOOLEAN DEFAULT true,

  -- Media — URL Google Drive proxy
  cover_image_url TEXT,
  images          TEXT[] DEFAULT '{}',

  -- Spesifikasi paket (flexible JSON)
  inclusions      TEXT[] DEFAULT '{}',  -- Daftar yang termasuk
  exclusions      TEXT[] DEFAULT '{}',  -- Daftar yang tidak termasuk
  max_pax         INTEGER,              -- Kapasitas tamu maksimum
  min_pax         INTEGER,              -- Kapasitas tamu minimum
  duration_days   INTEGER DEFAULT 1,    -- Durasi event (hari)

  -- Status
  is_active       BOOLEAN DEFAULT true,
  is_featured     BOOLEAN DEFAULT false,  -- Tampil di highlight toko vendor

  -- Sorting
  sort_order      INTEGER DEFAULT 0,

  -- Metadata
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  -- Slug unik per vendor
  UNIQUE(vendor_id, slug)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mp_products_vendor    ON mp_products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_mp_products_active    ON mp_products(is_active);
CREATE INDEX IF NOT EXISTS idx_mp_products_price     ON mp_products(price);
CREATE INDEX IF NOT EXISTS idx_mp_products_slug      ON mp_products(slug);

-- Auto-update updated_at (reuse fungsi dari 02_vendors.sql)
CREATE TRIGGER trg_mp_products_updated_at
  BEFORE UPDATE ON mp_products
  FOR EACH ROW EXECUTE FUNCTION mp_set_updated_at();

-- Auto-update price_from di mp_vendors ketika produk berubah
CREATE OR REPLACE FUNCTION mp_sync_vendor_price_from()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE mp_vendors
  SET price_from = (
    SELECT COALESCE(MIN(price), 0)
    FROM mp_products
    WHERE vendor_id = COALESCE(NEW.vendor_id, OLD.vendor_id)
      AND is_active = true
  )
  WHERE id = COALESCE(NEW.vendor_id, OLD.vendor_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mp_products_sync_price
  AFTER INSERT OR UPDATE OR DELETE ON mp_products
  FOR EACH ROW EXECUTE FUNCTION mp_sync_vendor_price_from();

-- RLS
ALTER TABLE mp_products ENABLE ROW LEVEL SECURITY;

-- Publik bisa lihat produk dari vendor aktif
CREATE POLICY "mp_products_public_read"
  ON mp_products FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM mp_vendors v
      WHERE v.id = vendor_id AND v.is_active = true
    )
  );

-- Vendor hanya bisa kelola produknya sendiri
CREATE POLICY "mp_products_owner_all"
  ON mp_products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM mp_vendors v
      WHERE v.id = vendor_id AND v.user_id = auth.uid()
    )
  );

COMMENT ON TABLE mp_products IS 'Paket dan produk layanan yang ditawarkan vendor';
COMMENT ON COLUMN mp_products.price IS 'Harga dalam Rupiah (IDR), integer tanpa desimal';
COMMENT ON COLUMN mp_products.inclusions IS 'Array string: daftar item yang termasuk dalam paket';
