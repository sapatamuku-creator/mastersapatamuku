// api/marketplace/categories.js
// GET /api/marketplace/categories
// Daftar semua kategori aktif (untuk filter pills di UI)

import { sbFetch, setCors, handleOptions } from './mp-config.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(res);

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const catRes = await sbFetch(
      `/mp_categories?is_active=eq.true&order=sort_order.asc&select=id,name,slug,icon,description`
    );

    if (!catRes.ok) return res.status(502).json({ error: 'Database error' });

    const categories = await catRes.json();

    // Opsional: sertakan vendor_count per kategori
    const { with_count } = req.query;
    if (with_count === 'true') {
      const countRes = await sbFetch(
        `/mp_vendors?is_active=eq.true&select=category_id`
      );
      if (countRes.ok) {
        const vendors = await countRes.json();
        const countMap = vendors.reduce((acc, v) => {
          acc[v.category_id] = (acc[v.category_id] || 0) + 1;
          return acc;
        }, {});
        return res.status(200).json(
          categories.map(c => ({ ...c, vendor_count: countMap[c.id] || 0 }))
        );
      }
    }

    // Cache agresif — kategori jarang berubah
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
    return res.status(200).json(categories);

  } catch (err) {
    console.error('[categories] error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
