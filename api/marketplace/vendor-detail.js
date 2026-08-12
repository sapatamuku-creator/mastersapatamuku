// api/marketplace/vendor-detail.js
// GET /api/marketplace/vendor-detail?slug=double-happiness-wo
// Detail lengkap satu vendor beserta produk dan review

import { sbFetch, setCors, handleOptions } from './mp-config.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(res);

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: 'Parameter "slug" wajib diisi' });

  try {
    // 1. Ambil data vendor dari view
    const vendorRes = await sbFetch(
      `/mp_vendor_public?slug=eq.${encodeURIComponent(slug)}&limit=1`
    );

    if (!vendorRes.ok) return res.status(502).json({ error: 'Database error' });

    const vendors = await vendorRes.json();
    if (!vendors.length) return res.status(404).json({ error: 'Vendor tidak ditemukan' });

    const vendor = vendors[0];

    // 2. Increment view count (fire & forget, tidak menghambat response)
    sbFetch(`/rpc/mp_increment_view`, {
      method: 'POST',
      body: JSON.stringify({ p_vendor_id: vendor.id })
    }).catch(() => {});

    // 3. Ambil produk aktif
    const productsRes = await sbFetch(
      `/mp_products?vendor_id=eq.${vendor.id}&is_active=eq.true&order=sort_order.asc,price.asc&select=*`
    );
    const products = productsRes.ok ? await productsRes.json() : [];

    // 4. Ambil review approved (max 10 terbaru)
    const reviewsRes = await sbFetch(
      `/mp_reviews?vendor_id=eq.${vendor.id}&status=eq.approved&order=created_at.desc&limit=10&select=*`
    );
    const reviews = reviewsRes.ok ? await reviewsRes.json() : [];

    return res.status(200).json({
      vendor,
      products,
      reviews
    });

  } catch (err) {
    console.error('[vendor-detail] error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
