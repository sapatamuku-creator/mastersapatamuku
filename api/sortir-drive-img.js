// api/sortir-drive-img.js
// Vercel serverless proxy for Google Drive images with strict content-type validation to prevent HTML responses

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { id, sz = 'w1600' } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Missing id parameter' });
  }

  // Set long-term cache header on CDN edge
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');

  const urlsToTry = [
    `https://lh3.googleusercontent.com/d/${id}=${sz}`,
    `https://lh3.googleusercontent.com/d/${id}`,
    `https://drive.google.com/thumbnail?id=${id}&sz=${sz}`,
    `https://drive.google.com/uc?export=download&id=${id}`,
    `https://drive.google.com/uc?export=view&id=${id}`
  ];

  for (const targetUrl of urlsToTry) {
    try {
      const response = await fetch(targetUrl, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        // ENSURE RESPONSE IS AN ACTUAL IMAGE (image/webp, image/jpeg, image/png), NOT HTML TEXT!
        if (contentType.toLowerCase().startsWith('image/')) {
          res.setHeader('Content-Type', contentType);
          const arrayBuffer = await response.arrayBuffer();
          return res.status(200).send(Buffer.from(arrayBuffer));
        }
      }
    } catch (e) {
      console.error(`Proxy fetch error for ${targetUrl}:`, e);
    }
  }

  return res.status(500).json({ error: 'Failed to fetch valid image from Google Drive' });
}
