// api/marketplace/vendor/inquiries.js
// GET /api/marketplace/vendor/inquiries — Daftar inquiry masuk (auth required)

import { sbFetch, setCors, handleOptions } from '../mp-config.js';

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

  if (req.method !== 'GET' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // Cari vendor milik user
    const vendorRes = await sbFetch(`/mp_vendors?user_id=eq.${user.id}&select=id&limit=1`);
    const vendors = vendorRes.ok ? await vendorRes.json() : [];
    if (!vendors.length) return res.status(404).json({ error: 'Vendor tidak ditemukan' });

    const vendorId = vendors[0].id;

    // ── GET: daftar inquiry ──
    if (req.method === 'GET') {
      const { status, page = '1', limit = '20' } = req.query;
      const pageNum  = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(50, parseInt(limit) || 20);
      const offset   = (pageNum - 1) * limitNum;

      let path = `/mp_inquiries?vendor_id=eq.${vendorId}&order=created_at.desc`;
      if (status) path += `&status=eq.${status}`;
      path += `&limit=${limitNum}&offset=${offset}`;

      const iqRes = await sbFetch(path, { headers: { 'Prefer': 'count=exact' } });
      if (!iqRes.ok) return res.status(502).json({ error: 'Database error' });

      const inquiries = await iqRes.json();
      const total = parseInt(iqRes.headers.get('content-range')?.split('/')[1] || '0');

      return res.status(200).json({
        data: inquiries,
        pagination: { page: pageNum, limit: limitNum, total, total_pages: Math.ceil(total / limitNum) }
      });
    }

    // ── PATCH: update status inquiry (misal: read, replied, closed) ──
    if (req.method === 'PATCH') {
      const { inquiry_id, status } = req.body;
      const allowedStatuses = ['read', 'replied', 'closed'];
      if (!inquiry_id || !allowedStatuses.includes(status)) {
        return res.status(400).json({ error: 'inquiry_id dan status (read/replied/closed) wajib diisi' });
      }

      const timestamp = status === 'read' ? { read_at: new Date().toISOString() }
                      : status === 'replied' ? { replied_at: new Date().toISOString() }
                      : {};

      const patchRes = await sbFetch(
        `/mp_inquiries?id=eq.${inquiry_id}&vendor_id=eq.${vendorId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status, ...timestamp }),
          headers: { 'Prefer': 'return=representation' }
        }
      );

      if (!patchRes.ok) return res.status(502).json({ error: 'Gagal update status' });
      return res.status(200).json({ success: true });
    }

  } catch (err) {
    console.error('[vendor/inquiries] error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
