// api/drive-video.js
// Ultra-lightweight Vercel 302 Redirect Proxy for Google Drive MP4 Video Streaming.
// Zero memory overhead, zero execution timeout, 100% direct browser-to-Google CDN streaming for native HTML5 <video autoplay>.

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Missing id parameter' });
  }

  // Set CDN cache headers
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');

  // Direct raw MP4 video stream redirect URL from Google Drive CDN
  const targetUrl = `https://drive.usercontent.google.com/download?id=${id}&confirm=t`;

  // HTTP 302 Redirect directly to Google Drive stream
  return res.redirect(302, targetUrl);
}
