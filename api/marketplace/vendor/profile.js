// api/marketplace/vendor/profile.js
// GET  /api/marketplace/vendor/profile — Ambil profil vendor yang sedang login
// PATCH /api/marketplace/vendor/profile — Update profil vendor

import { sbFetch, setCors, handleOptions } from '../mp-config.js';

const SB_URL = 'https://llrapesaaoliyjrrrsjh.supabase.co';

/**
 * Verifikasi Supabase JWT dari Authorization header
 * Return user object jika valid, null jika tidak
 */
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

  // Auth check
  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized — login required' });

  try {
    // Cari vendor milik user ini
    const vendorRes = await sbFetch(
      `/mp_vendors?user_id=eq.${user.id}&select=*&limit=1`
    );
    if (!vendorRes.ok) return res.status(502).json({ error: 'Database error' });

    const vendors = await vendorRes.json();
    if (!vendors.length) return res.status(404).json({ error: 'Akun vendor tidak ditemukan' });

    const vendor = vendors[0];

    // ── GET: return profil ──
    if (req.method === 'GET') {
      return res.status(200).json({ vendor });
    }

    // ── PATCH: update profil ──
    if (req.method === 'PATCH') {
      const allowedFields = [
        'business_name', 'short_bio', 'description',
        'whatsapp', 'instagram', 'website',
        'city', 'province', 'address',
        'cover_image_url', 'logo_url', 'images'
      ];

      const updates = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      }

      if (!Object.keys(updates).length) {
        return res.status(400).json({ error: 'Tidak ada field yang diupdate' });
      }

      const patchRes = await sbFetch(
        `/mp_vendors?id=eq.${vendor.id}&user_id=eq.${user.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(updates),
          headers: { 'Prefer': 'return=representation' }
        }
      );

      if (!patchRes.ok) return res.status(502).json({ error: 'Gagal update profil' });
      const [updated] = await patchRes.json();
      return res.status(200).json({ success: true, vendor: updated });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('[vendor/profile] error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
