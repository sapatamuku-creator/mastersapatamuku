// api/marketplace/register-vendor.js
// POST /api/marketplace/register-vendor
// Pendaftaran vendor baru — data disimpan dengan is_active=false (pending admin review)

import { sbFetch, sbServiceFetch, setCors, handleOptions, normalizeWA, generateSlug } from './mp-config.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(res);

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      business_name, category_id, city, province,
      owner_name, whatsapp, email,
      instagram, website, description,
      cover_image_url, logo_url  // URL dari GDrive proxy (sudah diupload via /api/marketplace/upload-image)
    } = req.body;

    // Validasi field wajib
    const required = { business_name, category_id, city, province, owner_name, whatsapp, email };
    for (const [field, val] of Object.entries(required)) {
      if (!val || !String(val).trim()) {
        return res.status(400).json({ error: `Field "${field}" wajib diisi` });
      }
    }

    // Validasi format email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Format email tidak valid' });
    }

    // 1. Cek kategori valid
    const catRes = await sbFetch(`/mp_categories?id=eq.${category_id}&is_active=eq.true&select=id&limit=1`);
    if (!catRes.ok || !(await catRes.json()).length) {
      return res.status(400).json({ error: 'Kategori tidak valid' });
    }

    // 2. Generate slug unik
    let baseSlug = generateSlug(business_name);
    let slug     = baseSlug;
    let attempt  = 0;

    while (attempt < 10) {
      const slugCheck = await sbFetch(`/mp_vendors?slug=eq.${slug}&select=id&limit=1`);
      const existing  = slugCheck.ok ? await slugCheck.json() : [];
      if (!existing.length) break;
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    // 3. Cek email belum terdaftar
    const emailCheck = await sbFetch(`/mp_vendors?email=eq.${encodeURIComponent(email)}&select=id&limit=1`);
    if (emailCheck.ok && (await emailCheck.json()).length > 0) {
      return res.status(409).json({ error: 'Email sudah terdaftar sebagai vendor' });
    }

    // 4. Insert vendor (is_active=false, pending review)
    const insertPayload = {
      slug,
      business_name:   business_name.trim(),
      category_id,
      city:            city.trim(),
      province:        province.trim(),
      owner_name:      owner_name.trim(),
      whatsapp:        normalizeWA(whatsapp),
      email:           email.toLowerCase().trim(),
      ...(instagram        && { instagram: instagram.replace(/^@/, '') }),
      ...(website          && { website }),
      ...(description      && { description: description.trim() }),
      ...(cover_image_url  && { cover_image_url }),
      ...(logo_url         && { logo_url }),
      is_active:   false,   // Admin harus approve
      is_verified: false,
      commission_rate: 5.00
    };

    // Gunakan service key agar bisa bypass RLS untuk INSERT
    const insertRes = await sbServiceFetch('/mp_vendors', {
      method: 'POST',
      body: JSON.stringify(insertPayload),
      headers: { 'Prefer': 'return=representation' }
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      console.error('[register-vendor] insert error:', errText);
      return res.status(502).json({ error: 'Gagal menyimpan data vendor' });
    }

    const [vendor] = await insertRes.json();

    console.log(`[register-vendor] New vendor registered: ${vendor.id} — ${business_name} (${email})`);

    return res.status(201).json({
      success:    true,
      vendor_id:  vendor.id,
      slug:       vendor.slug,
      message:    'Pendaftaran berhasil! Tim kami akan meninjau dalam 1×24 jam. Cek email Anda untuk konfirmasi.'
    });

  } catch (err) {
    console.error('[register-vendor] error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
