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

// Sama seperti injectOgMeta, tapi MENYISIPKAN tag OG bila belum ada di <head>
// (dipakai halaman vendor/product yang tidak punya meta OG statis).
export function ensureOgMeta(html, meta) {
  let out = html.replace(/<title[^>]*>[^<]*<\/title>/i, `<title id="page-title">${meta.title}</title>`);
  const defs = [
    ['property="og:title"', meta.title],
    ['property="og:description"', meta.description],
    ['property="og:image"', meta.image],
    ['property="og:image:width"', '1200'],
    ['property="og:image:height"', '630'],
    ['property="og:type"', 'website'],
    ['name="twitter:image"', meta.image]
  ];
  for (const [attr, content] of defs) {
    const attrEsc = attr.replace(/"/g, '\\"');
    const re = new RegExp(`<meta ${attrEsc} content="[^"]*">`, 'i');
    const tag = `<meta ${attr} content="${content}">`;
    if (re.test(out)) {
      out = out.replace(re, tag);
    } else {
      out = out.replace(/<head>/i, (m) => m + '\n    ' + tag);
    }
  }
  return out;
}

// ── Marketplace: vendor & product OG ──

function sbFetchPublic(path) {
  // Preferensi service key (di-set di Vercel) — mp_vendors tidak terbaca role anon.
  // Fallback publishable key untuk dev lokal.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || SB_KEY;
  const headers = { apikey: key, Authorization: 'Bearer ' + key };
  return fetch(`${SB_URL}/rest/v1${path}`, { headers });
}

export async function resolveVendorBySlug(slug) {
  if (!slug) return null;
  const cols = 'id,slug,business_name,city,province,description,cover_image_url,logo_url,category_id,rating_avg,review_count';
  const res = await sbFetchPublic(`/mp_vendors?slug=eq.${encodeURIComponent(slug)}&select=${cols}&limit=1`);
  const rows = await res.json();
  return (Array.isArray(rows) && rows[0]) ? rows[0] : null;
}

export async function resolveProductById(id) {
  if (!id) return null;
  const pRes = await sbFetchPublic(`/mp_products?id=eq.${encodeURIComponent(id)}&select=*&limit=1`);
  const pRows = await pRes.json();
  const product = (Array.isArray(pRows) && pRows[0]) ? pRows[0] : null;
  if (!product) return null;

  let vendor = null;
  if (product.vendor_id) {
    const vRes = await sbFetchPublic(`/mp_vendors?id=eq.${encodeURIComponent(product.vendor_id)}&select=id,slug,business_name,city,province,cover_image_url,logo_url,category_id&limit=1`);
    const vRows = await vRes.json();
    if (Array.isArray(vRows) && vRows[0]) vendor = vRows[0];
  }
  return { product, vendor };
}

// Kartu generik statis (api/og edge tidak ter-deploy di Vercel → pakai asset PNG)
function ogGenericCard(kind, name, sub) {
  return 'https://sapatamu.id/assets/og-vendor.png';
}

export function buildVendorOgMeta(vendor) {
  const name = cleanMeta(vendor.business_name) || 'Vendor Wedding';
  const city = cleanMeta(vendor.city);
  const category = cleanMeta(vendor.category_name);

  let description = `Temukan ${category || 'vendor wedding'} terbaik di SapaTamu.id.`;
  if (city) description = `${name} — ${category || 'vendor wedding'} di ${city}.`;
  const descRaw = cleanMeta(vendor.description);
  if (descRaw) description += ' ' + descRaw.slice(0, 110);
  description = description.slice(0, 160);

  const image = normaliseImageUrl(vendor.cover_image_url)
    || normaliseImageUrl(vendor.logo_url)
    || ogGenericCard('vendor', name, `${category || 'Vendor Wedding'}${city ? ' di ' + city : ''}`);

  const title = `${name} — ${category || 'Vendor Wedding'} | SapaTamu.id`;
  return { title, description, image };
}

export function buildProductOgMeta(product, vendor) {
  const pName = cleanMeta(product.name) || 'Paket Wedding';
  const vName = cleanMeta(vendor && vendor.business_name) || 'Vendor Wedding';
  const price = Number(product.price || 0);
  const priceTxt = price > 0 ? `Rp ${price.toLocaleString('id-ID')}` : 'harga menarik';

  let description = `${pName} — ${priceTxt} oleh ${vName} di SapaTamu.id.`;
  const descRaw = cleanMeta(product.description);
  if (descRaw) description += ' ' + descRaw.slice(0, 80);
  description = description.slice(0, 160);

  const image = normaliseImageUrl(product.cover_image_url)
    || normaliseImageUrl(product.image_url)
    || normaliseImageUrl(vendor && (vendor.cover_image_url || vendor.logo_url))
    || ogGenericCard('vendor', vName, 'Daftar Paket');

  const title = `${pName} — ${vName} | SapaTamu.id`;
  return { title, description, image };
}
