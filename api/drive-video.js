// api/drive-video.js
// Vercel serverless proxy endpoint to stream Google Drive MP4 video files directly into HTML5 <video> elements.
// Eliminates Google Drive iframe UI play button overlay and enforces 100% seamless muted autoplay.

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Missing id parameter' });
  }

  // Set CDN cache headers for high performance
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');

  // Direct raw MP4 download URL from Google Drive (bypasses HTML virus scan confirmation)
  const targetUrl = `https://drive.usercontent.google.com/download?id=${id}&confirm=t`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Range': req.headers.range || 'bytes=0-'
      }
    });

    const contentType = response.headers.get('content-type') || '';

    // If Google returns raw video stream (200 or 206 Partial Content)
    if ((response.ok || response.status === 206) && !contentType.includes('text/html')) {
      res.setHeader('Content-Type', contentType.includes('video') ? contentType : 'video/mp4');
      if (response.headers.get('content-length')) {
        res.setHeader('Content-Length', response.headers.get('content-length'));
      }
      if (response.headers.get('content-range')) {
        res.setHeader('Content-Range', response.headers.get('content-range'));
        res.status(206);
      } else {
        res.status(200);
      }

      const arrayBuffer = await response.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    }
  } catch (e) {
    console.error(`Error streaming drive video for ${id}:`, e);
  }

  // Fallback 302 redirect to raw download endpoint
  return res.redirect(302, `https://drive.usercontent.google.com/download?id=${id}&confirm=t`);
}
