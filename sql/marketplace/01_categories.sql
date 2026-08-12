-- ============================================================
-- 01_categories.sql — Kategori vendor marketplace sapatamu.id
-- ============================================================
-- Jalankan PERTAMA sebelum tabel lain (foreign key dependency)

CREATE TABLE IF NOT EXISTS mp_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  icon        TEXT,                    -- emoji atau nama icon (misal: '💍')
  description TEXT,
  sort_order  INTEGER DEFAULT 0,       -- urutan tampil di UI
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Index untuk query cepat
CREATE INDEX IF NOT EXISTS idx_mp_categories_slug     ON mp_categories(slug);
CREATE INDEX IF NOT EXISTS idx_mp_categories_active   ON mp_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_mp_categories_sort     ON mp_categories(sort_order);

-- RLS
ALTER TABLE mp_categories ENABLE ROW LEVEL SECURITY;

-- Siapa saja bisa baca kategori
CREATE POLICY "mp_categories_public_read"
  ON mp_categories FOR SELECT
  USING (is_active = true);

COMMENT ON TABLE mp_categories IS 'Kategori vendor marketplace sapatamu.id';
