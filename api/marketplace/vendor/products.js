// api/marketplace/vendor/products.js
// GET    /api/marketplace/vendor/products — Daftar produk vendor
// POST   /api/marketplace/vendor/products — Tambah produk baru
// PATCH  /api/marketplace/vendor/products — Update produk
// DELETE /api/marketplace/vendor/products — Hapus (soft delete: is_active=false)

import { sbFetch, setCors, handleOptions, generateSlug } from '../mp-config.js';

const SB_URL = 'https://llrapesaaoliyjrrrsjh.supabase.co';

async function verifyAuth(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const res = await fetch(`${SB_URL}/auth/v1/user`, {
    headers: {
      'apikey': process.env.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) return null;
  return await res.json();
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(res);

  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // Cari vendor milik user
    const vendorRes = await sbFetch(`/mp_vendors?user_id=eq.${user.id}&select=id&limit=1`);
    const vendors = vendorRes.ok ? await vendorRes.json() : [];
    if (!vendors.length) return res.status(404).json({ error: 'Vendor tidak ditemukan' });
    const vendorId = vendors[0].id;

    // ── GET: daftar produk ──
    if (req.method === 'GET') {
      const prodRes = await sbFetch(
        `/mp_products?vendor_id=eq.${vendorId}&order=sort_order.asc,created_at.desc&select=*`
      );
      const products = prodRes.ok ? await prodRes.json() : [];
      return res.status(200).json({ data: products });
    }

    // ── POST: tambah produk baru ──
    if (req.method === 'POST') {
      const { name, description, short_desc, price, price_label,
              inclusions, exclusions, max_pax, min_pax,
              duration_days, cover_image_url, images, sort_order } = req.body;

      if (!name || !price) {
        return res.status(400).json({ error: 'Field "name" dan "price" wajib diisi' });
      }

      const slug = generateSlug(name);

      const insertRes = await sbFetch('/mp_products', {
        method: 'POST',
        body: JSON.stringify({
          vendor_id: vendorId,
          name: name.trim(),
          slug,
          ...(description    && { description }),
          ...(short_desc     && { short_desc }),
          price:             parseInt(price),
          ...(price_label    && { price_label }),
          ...(inclusions     && { inclusions }),
          ...(exclusions     && { exclusions }),
          ...(max_pax        && { max_pax: parseInt(max_pax) }),
          ...(min_pax        && { min_pax: parseInt(min_pax) }),
          ...(duration_days  && { duration_days: parseInt(duration_days) }),
          ...(cover_image_url && { cover_image_url }),
          ...(images         && { images }),
          sort_order:        parseInt(sort_order) || 0,
          is_active: true
        }),
        headers: { 'Prefer': 'return=representation' }
      });

      if (!insertRes.ok) {
        const err = await insertRes.text();
        console.error('[vendor/products POST] error:', err);
        return res.status(502).json({ error: 'Gagal menambah produk' });
      }
      const [product] = await insertRes.json();
      return res.status(201).json({ success: true, product });
    }

    // ── PATCH: update produk ──
    if (req.method === 'PATCH') {
      const { product_id, ...updates } = req.body;
      if (!product_id) return res.status(400).json({ error: 'product_id wajib diisi' });

      const allowedFields = [
        'name', 'description', 'short_desc', 'price', 'price_label',
        'inclusions', 'exclusions', 'max_pax', 'min_pax', 'duration_days',
        'cover_image_url', 'images', 'is_active', 'is_featured', 'sort_order', 'is_price_visible'
      ];

      const cleanUpdates = {};
      for (const f of allowedFields) {
        if (updates[f] !== undefined) cleanUpdates[f] = updates[f];
      }

      const patchRes = await sbFetch(
        `/mp_products?id=eq.${product_id}&vendor_id=eq.${vendorId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(cleanUpdates),
          headers: { 'Prefer': 'return=representation' }
        }
      );

      if (!patchRes.ok) return res.status(502).json({ error: 'Gagal update produk' });
      const [product] = await patchRes.json();
      return res.status(200).json({ success: true, product });
    }

    // ── DELETE: soft delete (is_active = false) ──
    if (req.method === 'DELETE') {
      const { product_id } = req.body;
      if (!product_id) return res.status(400).json({ error: 'product_id wajib diisi' });

      const delRes = await sbFetch(
        `/mp_products?id=eq.${product_id}&vendor_id=eq.${vendorId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ is_active: false }),
          headers: { 'Prefer': 'return=minimal' }
        }
      );

      if (!delRes.ok) return res.status(502).json({ error: 'Gagal menghapus produk' });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('[vendor/products] error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
