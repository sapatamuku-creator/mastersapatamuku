// api/marketplace/inquiry.js
// POST /api/marketplace/inquiry
// Kirim inquiry dari calon client ke vendor, return WA redirect URL

import { sbFetch, setCors, handleOptions, normalizeWA } from './mp-config.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(res);

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      vendor_id, product_id,
      client_name, client_whatsapp, client_email,
      event_date, guest_count, budget_range, message
    } = req.body;

    // Validasi wajib
    if (!vendor_id)       return res.status(400).json({ error: 'vendor_id wajib diisi' });
    if (!client_name)     return res.status(400).json({ error: 'Nama wajib diisi' });
    if (!client_whatsapp) return res.status(400).json({ error: 'Nomor WhatsApp wajib diisi' });

    // 1. Cek vendor masih aktif & ambil nomor WA vendor
    const vendorRes = await sbFetch(
      `/mp_vendors?id=eq.${vendor_id}&is_active=eq.true&select=id,business_name,whatsapp&limit=1`
    );
    if (!vendorRes.ok) return res.status(502).json({ error: 'Database error' });

    const vendors = await vendorRes.json();
    if (!vendors.length) return res.status(404).json({ error: 'Vendor tidak ditemukan atau tidak aktif' });

    const vendor = vendors[0];

    // 2. Simpan inquiry ke database
    const inquiryPayload = {
      vendor_id,
      ...(product_id && { product_id }),
      client_name:      client_name.trim(),
      client_whatsapp:  normalizeWA(client_whatsapp),
      ...(client_email   && { client_email }),
      ...(event_date     && { event_date }),
      ...(guest_count    && { guest_count: parseInt(guest_count) }),
      ...(budget_range   && { budget_range }),
      ...(message        && { message: message.trim() }),
      status: 'new'
    };

    const insertRes = await sbFetch('/mp_inquiries', {
      method: 'POST',
      body: JSON.stringify(inquiryPayload),
      headers: { 'Prefer': 'return=representation' }
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      console.error('[inquiry] insert error:', errText);
      return res.status(502).json({ error: 'Gagal menyimpan inquiry' });
    }

    const [inquiry] = await insertRes.json();

    // 3. Build WA URL
    const vendorWA    = normalizeWA(vendor.whatsapp);
    const clientWA    = normalizeWA(client_whatsapp);
    const productInfo = product_id ? `\nPaket yang diminati: (ID: ${product_id})` : '';
    const eventInfo   = event_date ? `\nTanggal event: ${event_date}` : '';
    const guestInfo   = guest_count ? `\nJumlah tamu: ${guest_count} orang` : '';
    const budgetInfo  = budget_range ? `\nBudget: ${budget_range}` : '';
    const msgInfo     = message ? `\n\nPesan: ${message}` : '';

    const waText = encodeURIComponent(
      `Halo ${vendor.business_name}, saya ${client_name.trim()} tertarik dengan layanan Anda di sapatamu.id.` +
      productInfo + eventInfo + guestInfo + budgetInfo + msgInfo +
      `\n\nNomor saya: ${clientWA}`
    );

    return res.status(201).json({
      success:          true,
      inquiry_id:       inquiry.id,
      vendor_whatsapp:  vendorWA,
      whatsapp_url:     `https://wa.me/${vendorWA}?text=${waText}`
    });

  } catch (err) {
    console.error('[inquiry] error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
