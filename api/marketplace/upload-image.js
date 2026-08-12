// api/marketplace/upload-image.js
// Vercel serverless proxy: browser → GAS → Google Drive
// Browser tidak bisa langsung call GAS karena CORS restriction
// Proxy ini menjembatani keduanya tanpa expose GAS URL ke client

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image, type, vendorId, filename } = req.body;

  // Validasi field wajib
  if (!image)    return res.status(400).json({ error: 'Field "image" (base64 WebP) wajib diisi' });
  if (!type)     return res.status(400).json({ error: 'Field "type" wajib diisi: logo, cover, gallery, product' });
  if (!vendorId) return res.status(400).json({ error: 'Field "vendorId" wajib diisi' });

  const GAS_URL = process.env.GAS_MARKETPLACE_URL;
  if (!GAS_URL) {
    console.error('[upload-image] GAS_MARKETPLACE_URL env variable not set!');
    return res.status(500).json({ error: 'Server configuration error: GAS URL not configured' });
  }

  try {
    const gasRes = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image,
        type,
        vendorId,
        filename: filename || `${vendorId}_${type}_${Date.now()}.webp`
      })
    });

    // GAS selalu return 200 bahkan saat error, cek body
    const text = await gasRes.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('[upload-image] GAS response tidak valid JSON:', text);
      return res.status(502).json({ error: 'Invalid response from upload service' });
    }

    if (data.status === 'error') {
      console.error('[upload-image] GAS error:', data.message);
      return res.status(422).json({ error: data.message });
    }

    console.log(`[upload-image] OK | type=${type} | vendor=${vendorId} | file=${data.fileId}`);
    return res.status(200).json({
      status:    'success',
      fileId:    data.fileId,
      proxyUrl:  data.proxyUrl,
      sizeBytes: data.sizeBytes
    });

  } catch (err) {
    console.error('[upload-image] fetch error:', err.message);
    return res.status(500).json({ error: 'Upload service unreachable', detail: err.message });
  }
}
