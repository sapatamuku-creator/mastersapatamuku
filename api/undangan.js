const fs = require('fs');
const path = require('path');

// Konfigurasi Supabase publik (publishable key — read-only, sama seperti subdomain_resolver.js)
const SB_URL = "https://llrapesaaoliyjrrrsjh.supabase.co";
const SB_KEY = "sb_publishable_414hQDyPBaFi0fnzmIKyZw_Iwa09Q0u";
const FALLBACK_OG_IMAGE = "https://sapatamu.id/assets/og-invitation.png";

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cleanMeta(s) {
  return escapeHtml(String(s == null ? '' : s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()).slice(0, 160);
}

// Foto di config bisa berupa link Google Drive (halaman) — konversi ke URL gambar langsung,
// data: URI ditolak karena tidak bisa di-fetch crawler WhatsApp.
function normaliseImageUrl(url) {
  if (!url) return null;
  const s = String(url);
  if (/^data:/i.test(s)) return null;
  const m = s.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`;
  if (/^\/\//.test(s)) return 'https:' + s;
  if (/^https?:\/\//i.test(s)) return s;
  return null;
}

function formatDateId(v) {
  if (!v) return '';
  const s = String(v);
  const dm = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dm) {
    const d = new Date(+dm[3], +dm[2] - 1, +dm[1]);
    return `${DAYS[d.getDay()]}, ${dm[1]} ${MONTHS[+dm[2] - 1]} ${dm[3]}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d)) {
      return `${DAYS[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    }
  }
  return '';
}

async function resolveWeddingData(sub) {
  const headers = { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY };
  const profRes = await fetch(`${SB_URL}/rest/v1/client_public_profile?subdomain=eq.${encodeURIComponent(sub)}&select=ssid&limit=1`, { headers });
  const prof = await profRes.json();
  const ssid = Array.isArray(prof) && prof[0] && prof[0].ssid ? prof[0].ssid : null;
  if (!ssid) return null;

  const confRes = await fetch(`${SB_URL}/rest/v1/config_invitation?ssid=eq.${encodeURIComponent(ssid)}&select=data&limit=1`, { headers });
  const conf = await confRes.json();
  if (!Array.isArray(conf) || !conf[0] || !conf[0].data) return null;
  return conf[0].data;
}

export default async function handler(req, res) {
  const { id, u } = req.query;
  const host = req.headers.host || '';

  const rawGuest = u ? decodeURIComponent(String(u).replace(/\+/g, ' ')).trim() : '';
  const guestName = cleanMeta(rawGuest);

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
        const gName = cleanMeta(data.groom && data.groom.name);
        const bName = cleanMeta(data.bride && data.bride.name);
        const ev1 = data.ev1 || {};

        const couple = (gName && bName) ? `${gName} & ${bName}` : (gName || bName || 'Undangan Pernikahan');
        const ogTitle = guestName ? `${guestName} diundang — ${couple}` : couple;

        const dateTxt = ev1.date ? formatDateId(ev1.date) : '';
        const locTxt = cleanMeta(ev1.locName);
        let ogDesc = 'Anda diundang menghadiri acara pernikahan kami.';
        if (dateTxt) ogDesc += ' ' + dateTxt;
        if (locTxt) ogDesc += ' — ' + locTxt;
        ogDesc = ogDesc.slice(0, 160);

        const galleryFirst = (Array.isArray(data.gallery) && data.gallery.length) ? normaliseImageUrl(data.gallery[0]) : null;
        const ogImage = normaliseImageUrl(ev1.photo)
          || galleryFirst
          || normaliseImageUrl(data.groom && data.groom.photo)
          || normaliseImageUrl(data.bride && data.bride.photo)
          || FALLBACK_OG_IMAGE;

        html = html.replace(/<meta property="og:title" content="[^"]*">/gi, `<meta property="og:title" content="${ogTitle}">`);
        html = html.replace(/<meta property="og:description" content="[^"]*">/gi, `<meta property="og:description" content="${ogDesc}">`);
        html = html.replace(/<meta property="og:image" content="[^"]*">/gi, `<meta property="og:image" content="${ogImage}">`);
        html = html.replace(/<meta name="twitter:image" content="[^"]*">/gi, `<meta name="twitter:image" content="${ogImage}">`);
        html = html.replace(/<title[^>]*>[^<]*<\/title>/i, `<title id="page-title">${ogTitle} — SapaTamu.Ku</title>`);
      }
    }
  } catch (e) {
    // Tetap tampilkan halaman dengan meta OG statis bila resolusi gagal
  }

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}