// api/marketplace/product-detail.js
// GET /api/marketplace/product-detail?slug=xxx OR ?id=xxx
// Detail produk/paket beserta info vendor dan produk terkait

import { sbFetch, setCors, handleOptions } from './mp-config.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(res);

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { slug, id } = req.query;
  if (!slug && !id) return res.status(400).json({ error: 'Parameter "slug" atau "id" wajib diisi' });

  try {
    // 1. Ambil detail produk
    const queryFilter = slug ? `slug=eq.${encodeURIComponent(slug)}` : `id=eq.${encodeURIComponent(id)}`;
    const prodRes = await sbFetch(`/mp_products?${queryFilter}&is_active=eq.true&limit=1&select=*`);

    if (!prodRes.ok) return res.status(502).json({ error: 'Database error' });
    const products = await prodRes.json();

    if (!products.length) return res.status(404).json({ error: 'Produk tidak ditemukan' });
    const product = products[0];

    // 2. Ambil detail vendor pemilik produk
    const vendorRes = await sbFetch(`/mp_vendor_public?id=eq.${product.vendor_id}&limit=1`);
    const vendors = vendorRes.ok ? await vendorRes.json() : [];
    const vendor = vendors[0] || null;

    // 3. Ambil produk lain dari vendor yang sama (maks 4)
    let otherProducts = [];
    if (vendor) {
      const otherRes = await sbFetch(
        `/mp_products?vendor_id=eq.${vendor.id}&id=neq.${product.id}&is_active=eq.true&order=sort_order.asc&limit=4&select=*`
      );
      otherProducts = otherRes.ok ? await otherRes.json() : [];
    }

    return res.status(200).json({
      product,
      vendor,
      otherProducts
    });

  } catch (err) {
    console.error('[product-detail] error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
