// api/marketplace/vendor/stats.js
// GET /api/marketplace/vendor/stats
// Statistik ringkas untuk vendor dashboard (auth required)

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

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // Ambil vendor ID
    const vendorRes = await sbFetch(`/mp_vendors?user_id=eq.${user.id}&select=id&limit=1`);
    const vendors   = vendorRes.ok ? await vendorRes.json() : [];
    if (!vendors.length) return res.status(404).json({ error: 'Vendor tidak ditemukan' });

    const vendorId = vendors[0].id;

    // Ambil dari view mp_vendor_stats
    const statsRes = await sbFetch(`/mp_vendor_stats?vendor_id=eq.${vendorId}&select=*&limit=1`);
    if (!statsRes.ok) return res.status(502).json({ error: 'Database error' });

    const statsArr = await statsRes.json();
    const stats = statsArr[0] || {};

    // Ambil 5 inquiry terbaru
    const recentInqRes = await sbFetch(
      `/mp_inquiries?vendor_id=eq.${vendorId}&order=created_at.desc&limit=5&select=id,client_name,status,created_at,budget_range,event_date`
    );
    const recent_inquiries = recentInqRes.ok ? await recentInqRes.json() : [];

    return res.status(200).json({
      stats: {
        active_product_count:    stats.active_product_count    || 0,
        total_inquiries:         stats.total_inquiries         || 0,
        new_inquiries:           stats.new_inquiries           || 0,
        approved_reviews:        stats.approved_reviews        || 0,
        completed_transactions:  stats.completed_transactions  || 0,
        total_deal_amount:       stats.total_deal_amount       || 0,
        total_commission_paid:   stats.total_commission_paid   || 0
      },
      recent_inquiries
    });

  } catch (err) {
    console.error('[vendor/stats] error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
