const fs = require('fs');
const path = require('path');

export default async function handler(req, res) {
  const { id, u } = req.query;
  
  // Baca file undangan.html asli
  const filePath = path.join(process.cwd(), 'undangan.html');
  let html = fs.readFileSync(filePath, 'utf8');

  const guestName = u ? decodeURIComponent(u) : "Tamu Undangan";
  const guestId = id || "00000";
  
  // Link Gambar Dinamis dari API OG yang kita buat tadi
  const dynamicOgImage = `https://sapatamu.id/api/og?u=${encodeURIComponent(guestName)}&id=${guestId}`;

  // GANTI META TAG SECARA DINAMIS (Lebih kuat)
  html = html.replace(/<meta property="og:title" content="[^"]*">/gi, `<meta property="og:title" content="Undangan Spesial untuk ${guestName}">`);
  html = html.replace(/<meta property="og:image" content="[^"]*">/gi, `<meta property="og:image" content="${dynamicOgImage}">`);
  html = html.replace(/<title>[^<]*<\/title>/gi, `<title>Undangan ${guestName}</title>`);

  // Set header agar dibaca sebagai HTML
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}
