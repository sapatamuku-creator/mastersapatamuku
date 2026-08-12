// api/marketplace/vendors.js
// GET /api/marketplace/vendors
// Browse vendor dengan filter, sort, multi-field search (provinsi, kota, kecamatan), dan pagination

import { sbFetch, setCors, handleOptions } from './mp-config.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(res);

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      kategori, provinsi, kota, kecamatan, min_price, max_price,
      rating, verified, sort = 'rating_avg',
      order = 'desc', page = '1', limit = '16', q
    } = req.query;

    // Validasi & sanitasi
    const pageNum  = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(48, Math.max(1, parseInt(limit) || 16));
    const offset   = (pageNum - 1) * limitNum;

    const allowedSort = ['rating_avg', 'created_at', 'view_count', 'price_from'];
    const sortCol  = allowedSort.includes(sort) ? sort : 'rating_avg';
    const sortDir  = order === 'asc' ? 'asc' : 'desc';

    // Build query ke view mp_vendor_public
    let path = `/mp_vendor_public?select=*`;

    // Filter kategori
    if (kategori) path += `&category_slug=eq.${encodeURIComponent(kategori)}`;

    // Filter provinsi
    if (provinsi) path += `&province=ilike.${encodeURIComponent(`%${provinsi}%`)}`;

    // Filter kota (Kabupaten / Kota)
    if (kota) path += `&city=ilike.${encodeURIComponent(`%${kota}%`)}`;

    // Filter kecamatan
    if (kecamatan) path += `&city=ilike.${encodeURIComponent(`%${kecamatan}%`)}`;

    // Filter rating minimum
    if (rating) path += `&rating_avg=gte.${parseFloat(rating)}`;

    // Filter verified
    if (verified === 'true') path += `&is_verified=eq.true`;

    // Filter harga (via min/max price_from)
    if (min_price) path += `&price_from=gte.${parseInt(min_price)}`;
    if (max_price) path += `&price_from=lte.${parseInt(max_price)}`;

    // Multi-column search (Cari di Nama Bisnis, Kategori, Kota, Provinsi, & Deskripsi)
    if (q) {
      const cleanQ = encodeURIComponent(`%${q.trim()}%`);
      path += `&or=(business_name.ilike.${cleanQ},category_name.ilike.${cleanQ},city.ilike.${cleanQ},province.ilike.${cleanQ},description.ilike.${cleanQ})`;
    }

    // Sort & pagination
    path += `&order=${sortCol}.${sortDir}`;
    path += `&limit=${limitNum}&offset=${offset}`;

    // Request dengan count header
    const dataRes = await sbFetch(path, {
      headers: { 'Prefer': 'count=exact' }
    });

    if (!dataRes.ok) {
      const errText = await dataRes.text();
      console.error('[vendors] Supabase error:', errText);
      return res.status(502).json({ error: 'Database error' });
    }

    const data  = await dataRes.json();
    const total = parseInt(dataRes.headers.get('content-range')?.split('/')[1] || '0');

    return res.status(200).json({
      data,
      pagination: {
        page:        pageNum,
        limit:       limitNum,
        total,
        total_pages: Math.ceil(total / limitNum)
      }
    });

  } catch (err) {
    console.error('[vendors] error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
