const fs = require('fs');
const path = require('path');
import { resolveWeddingData, buildOgMeta, injectOgMeta } from '../lib/og-shared.js';

export default async function handler(req, res) {
  const { id, u } = req.query;
  const host = req.headers.host || '';

  // Baca invitation.html (engine terbaru) alih-alih undangan.html legacy
  const filePath = path.join(process.cwd(), 'invitation.html');
  let html = fs.readFileSync(filePath, 'utf8');

  // Path /u/... mengubah base URL relatif — paksa semua asset relatif ke root
  html = html.replace(/<head>/, '<head><base href="/">');

  // Bawa meta OG statis sebagai default; perbarui dinamis bila resolusi berhasil
  html = html.replace(/<title[^>]*>[^<]*<\/title>/i, `<title id="page-title">Undangan Pernikahan Digital — SapaTamu.Ku</title>`);

  try {
    const hostParts = (host || '').split(':')[0].split('.');
    const sub = (hostParts.length >= 3 && hostParts[0] !== 'www') ? hostParts[0] : null;

    if (sub && /^[a-z0-9-]{3,50}$/i.test(sub)) {
      const data = await resolveWeddingData(sub);
      if (data) {
        const guestName = u ? decodeURIComponent(String(u).replace(/\+/g, ' ')).trim() : '';
        const meta = buildOgMeta(data, guestName);
        html = injectOgMeta(html, meta);
      }
    }
  } catch (e) {
    // Tetap tampilkan halaman dengan meta OG statis bila resolusi gagal
  }

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}