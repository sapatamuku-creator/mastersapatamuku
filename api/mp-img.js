// api/mp-img.js
// Proxy gambar marketplace dari Google Drive
// Mencegah CORB blocking & redirect issue saat load di frontend
// Identik dengan api/sortir-drive-img.js yang sudah ada

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { id, sz = 'w1080' } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id parameter' });

  // Cache agresif di CDN edge (7 hari)
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');

  const urlsToTry = [
    `https://drive.google.com/thumbnail?id=${id}&sz=${sz}`,
    `https://lh3.googleusercontent.com/d/${id}=${sz}`,
    `https://drive.google.com/uc?export=view&id=${id}`
  ];

  for (const targetUrl of urlsToTry) {
    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type') || 'image/webp';
        res.setHeader('Content-Type', contentType);
        const arrayBuffer = await response.arrayBuffer();
        return res.status(200).send(Buffer.from(arrayBuffer));
      }
    } catch (e) {
      console.error(`[mp-img] fetch error for ${targetUrl}:`, e.message);
    }
  }

  return res.status(500).json({ error: 'Failed to fetch image from Google Drive' });
}
