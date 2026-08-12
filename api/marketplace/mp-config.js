// mp-config.js — Konfigurasi Supabase untuk Marketplace API
// Dipakai oleh semua api/marketplace/*.js endpoints

export const SB_URL = 'https://llrapesaaoliyjrrrsjh.supabase.co';
export const SB_ANON_KEY  = process.env.SUPABASE_ANON_KEY;
export const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Helper: fetch ke Supabase REST API dengan anon key (public data)
 */
export async function sbFetch(path, options = {}) {
  const url = `${SB_URL}/rest/v1${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'apikey': SB_ANON_KEY,
      'Authorization': `Bearer ${SB_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...options.headers
    }
  });
  return res;
}

/**
 * Helper: fetch ke Supabase REST API dengan service role key (bypass RLS)
 * Hanya untuk operasi server-side yang butuh akses penuh
 */
export async function sbServiceFetch(path, options = {}) {
  const url = `${SB_URL}/rest/v1${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'apikey': SB_SERVICE_KEY,
      'Authorization': `Bearer ${SB_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...options.headers
    }
  });
  return res;
}

/**
 * Helper: set CORS headers untuk semua API response
 */
export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/**
 * Helper: handle OPTIONS preflight
 */
export function handleOptions(req, res) {
  if (req.method === 'OPTIONS') {
    setCors(res);
    res.status(204).end();
    return true;
  }
  return false;
}

/**
 * Helper: normalize nomor WA ke format 628xxx
 */
export function normalizeWA(raw) {
  if (!raw) return '';
  raw = raw.replace(/[^0-9]/g, '');
  if (raw.startsWith('0'))  return '62' + raw.slice(1);
  if (raw.startsWith('8'))  return '62' + raw;
  return raw;
}

/**
 * Helper: generate slug dari teks
 */
export function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Helper: format harga Rupiah
 */
export function formatRupiah(num) {
  if (!num) return 'Hubungi Vendor';
  return 'Rp ' + Number(num).toLocaleString('id-ID');
}
