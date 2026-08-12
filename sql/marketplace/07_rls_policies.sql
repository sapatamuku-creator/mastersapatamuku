-- ============================================================
-- 07_rls_policies.sql — Review & tambahan RLS policies
-- ============================================================
-- Jalankan SETELAH semua tabel dibuat (01–06)
-- File ini berisi policies tambahan & view untuk kemudahan query

-- ── View: vendor publik lengkap (untuk marketplace browse) ──
CREATE OR REPLACE VIEW mp_vendor_public AS
SELECT
  v.id,
  v.slug,
  v.business_name,
  v.short_bio,
  v.description,
  v.city,
  v.province,
  v.whatsapp,
  v.instagram,
  v.website,
  v.cover_image_url,
  v.logo_url,
  v.images,
  v.price_from,
  v.rating_avg,
  v.review_count,
  v.view_count,
  v.is_verified,
  v.is_featured,
  v.created_at,
  -- Join kategori
  c.id   AS category_id,
  c.name AS category_name,
  c.slug AS category_slug,
  c.icon AS category_icon
FROM mp_vendors v
JOIN mp_categories c ON c.id = v.category_id
WHERE v.is_active = true AND c.is_active = true;

COMMENT ON VIEW mp_vendor_public IS 'View vendor aktif dengan info kategori, dipakai di API /vendors';

-- ── View: statistik ringkas per vendor (untuk dashboard) ──
CREATE OR REPLACE VIEW mp_vendor_stats AS
SELECT
  v.id AS vendor_id,
  v.business_name,
  COUNT(DISTINCT p.id)  FILTER (WHERE p.is_active = true) AS active_product_count,
  COUNT(DISTINCT i.id)                                     AS total_inquiries,
  COUNT(DISTINCT i.id)  FILTER (WHERE i.status = 'new')   AS new_inquiries,
  COUNT(DISTINCT r.id)  FILTER (WHERE r.status = 'approved') AS approved_reviews,
  COUNT(DISTINCT t.id)  FILTER (WHERE t.status = 'completed') AS completed_transactions,
  COALESCE(SUM(t.deal_amount) FILTER (WHERE t.status = 'completed'), 0) AS total_deal_amount,
  COALESCE(SUM(t.commission_amount) FILTER (WHERE t.status IN ('paid','completed')), 0) AS total_commission_paid
FROM mp_vendors v
LEFT JOIN mp_products     p ON p.vendor_id = v.id
LEFT JOIN mp_inquiries    i ON i.vendor_id = v.id
LEFT JOIN mp_reviews      r ON r.vendor_id = v.id
LEFT JOIN mp_transactions t ON t.vendor_id = v.id
GROUP BY v.id, v.business_name;

COMMENT ON VIEW mp_vendor_stats IS 'Statistik ringkas untuk vendor dashboard';

-- ── Function: increment view count (atomic, aman dari race condition) ──
CREATE OR REPLACE FUNCTION mp_increment_view(p_vendor_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE mp_vendors
  SET view_count = view_count + 1
  WHERE id = p_vendor_id AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mp_increment_view IS 'Increment view_count vendor secara atomic. Dipanggil dari API vendor-detail.';

-- ── Function: helper format WA number ──
CREATE OR REPLACE FUNCTION mp_normalize_whatsapp(raw TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Hapus karakter bukan angka
  raw := regexp_replace(raw, '[^0-9]', '', 'g');
  -- Normalize ke format 628xxx
  IF raw LIKE '0%' THEN
    raw := '62' || substring(raw FROM 2);
  ELSIF raw LIKE '8%' THEN
    raw := '62' || raw;
  END IF;
  RETURN raw;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION mp_normalize_whatsapp IS 'Normalize nomor WA ke format 628xxx untuk wa.me link';
