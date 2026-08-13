// Shared Open Graph helpers — dipakai oleh middleware.js (edge) dan api/undangan.js (serverless)
const SB_URL = "https://llrapesaaoliyjrrrsjh.supabase.co";
const SB_KEY = "sb_publishable_414hQDyPBaFi0fnzmIKyZw_Iwa09Q0u";
export const FALLBACK_OG_IMAGE = "https://sapatamu.id/assets/og-invitation.png";

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export function cleanMeta(s) {
  return escapeHtml(String(s == null ? '' : s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()).slice(0, 160);
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Foto di config bisa berupa link Google Drive (halaman) — konversi ke URL gambar langsung,
// data: URI ditolak karena tidak bisa di-fetch crawler WhatsApp.
export function normaliseImageUrl(url) {
  if (!url) return null;
  const s = String(url);
  if (/^data:/i.test(s)) return null;
  const m = s.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`;
  if (/^\/\//.test(s)) return 'https:' + s;
  if (/^https?:\/\//i.test(s)) return s;
  return null;
}

export function formatDateId(v) {
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

// Resolusi subdomain → ssid → config_invitation (publik, publishable key — sama seperti subdomain_resolver.js)
export async function resolveWeddingData(sub) {
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

export function buildOgMeta(data, rawGuestName) {
  const guestName = rawGuestName ? cleanMeta(rawGuestName) : '';
  const gName = cleanMeta(data.groom && data.groom.name);
  const bName = cleanMeta(data.bride && data.bride.name);
  const ev1 = data.ev1 || {};

  const couple = (gName && bName) ? `${gName} & ${bName}` : (gName || bName || 'Undangan Pernikahan');
  const title = guestName ? `${guestName} diundang — ${couple}` : couple;

  const dateTxt = ev1.date ? formatDateId(ev1.date) : '';
  const locTxt = cleanMeta(ev1.locName);
  let description = 'Anda diundang menghadiri acara pernikahan kami.';
  if (dateTxt) description += ' ' + dateTxt;
  if (locTxt) description += ' — ' + locTxt;
  description = description.slice(0, 160);

  const galleryFirst = (Array.isArray(data.gallery) && data.gallery.length) ? normaliseImageUrl(data.gallery[0]) : null;
  const image = normaliseImageUrl(ev1.photo)
    || galleryFirst
    || normaliseImageUrl(data.groom && data.groom.photo)
    || normaliseImageUrl(data.bride && data.bride.photo)
    || FALLBACK_OG_IMAGE;

  return { title, description, image };
}

export function injectOgMeta(html, meta) {
  html = html.replace(/<meta property="og:title" content="[^"]*">/gi, `<meta property="og:title" content="${meta.title}">`);
  html = html.replace(/<meta property="og:description" content="[^"]*">/gi, `<meta property="og:description" content="${meta.description}">`);
  html = html.replace(/<meta property="og:image" content="[^"]*">/gi, `<meta property="og:image" content="${meta.image}">`);
  html = html.replace(/<meta name="twitter:image" content="[^"]*">/gi, `<meta name="twitter:image" content="${meta.image}">`);
  html = html.replace(/<title[^>]*>[^<]*<\/title>/i, `<title id="page-title">${meta.title} — SapaTamu.Ku</title>`);
  return html;
}
