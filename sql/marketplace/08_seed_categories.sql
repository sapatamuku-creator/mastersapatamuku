-- ============================================================
-- 08_seed_categories.sql — Data awal kategori vendor
-- ============================================================
-- Jalankan TERAKHIR, setelah semua schema sudah dibuat

INSERT INTO mp_categories (name, slug, icon, description, sort_order) VALUES
  ('Wedding Organizer',   'wedding-organizer',  '💍', 'Jasa WO, koordinator pernikahan, dan wedding planner profesional', 1),
  ('Venue & Gedung',      'venue',              '🏛️', 'Gedung pernikahan, ballroom, villa, dan lokasi resepsi', 2),
  ('Fotografer',          'fotografer',         '📸', 'Fotografer dan videografer pernikahan profesional', 3),
  ('Katering',            'katering',           '🍽️', 'Layanan katering, tenda, dan dekorasi meja makan', 4),
  ('Dekorasi',            'dekorasi',           '🌸', 'Dekorasi pelaminan, bunga, lighting, dan backdrop', 5),
  ('Musik & Hiburan',     'musik-hiburan',      '🎵', 'Band, DJ, MC, dan hiburan pernikahan', 6),
  ('Rias Pengantin',      'rias-pengantin',     '💄', 'MUA, salon, dan paket rias pengantin komplit', 7),
  ('Busana Pengantin',    'busana-pengantin',   '👗', 'Gaun, jas, dan sewa busana pengantin adat maupun modern', 8),
  ('Undangan',            'undangan',           '✉️', 'Undangan cetak, digital, dan souvenir pernikahan', 9),
  ('Dokumentasi Digital', 'dokumentasi',        '🎬', 'Foto prewedding, same-day edit, dan highlight video', 10)
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  icon        = EXCLUDED.icon,
  description = EXCLUDED.description,
  sort_order  = EXCLUDED.sort_order;

-- Verifikasi
DO $$
DECLARE
  cat_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO cat_count FROM mp_categories;
  RAISE NOTICE '✅ mp_categories: % kategori berhasil diisi', cat_count;
END;
$$;
