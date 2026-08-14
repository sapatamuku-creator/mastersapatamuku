// api/mp-public.js
// Edge-runtime (cold start <100ms) handler for PUBLIC + AUTH-GET marketplace endpoints.
// All GET/OPTIONS on /api/mp/:path* are routed here via vercel.json rewrite.
// POST/PATCH/DELETE stay on api/mp.js (Node runtime).

export const config = { runtime: 'edge', regions: ['sin1'] };

const SB_URL = 'https://llrapesaaoliyjrrrsjh.supabase.co';
// SUPABASE_ANON_KEY legacy JWT pada Vercel tidak valid (401 "Invalid API key")
// → gunakan publishable key (valid untuk GoTrue & PostgREST, lihat lib/og-shared.js).
const SB_PUBLISHABLE_KEY = 'sb_publishable_414hQDyPBaFi0fnzmIKyZw_Iwa09Q0u';
const SB_ANON_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || SB_PUBLISHABLE_KEY;
const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sbFetch(path, options = {}) {
  return fetch(`${SB_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: SB_ANON_KEY,
      Authorization: `Bearer ${SB_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...options.headers
    }
  });
}

function sbServiceFetch(path, options = {}) {
  return fetch(`${SB_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: SB_SERVICE_KEY,
      Authorization: `Bearer ${SB_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...options.headers
    }
  });
}

const DEFAULT_CATEGORIES = [
  { id: 'a1b2c3d4-0001-4000-8000-000000000001', name: 'Wedding Organizer & Planner', slug: 'wedding-organizer', icon: 'ðŸ“‹', is_active: true, sort_order: 1 },
  { id: 'a1b2c3d4-0002-4000-8000-000000000002', name: 'Fotografi & Videografi', slug: 'foto-video', icon: 'ðŸ“¸', is_active: true, sort_order: 2 },
  { id: 'a1b2c3d4-0003-4000-8000-000000000003', name: 'Katering (Catering)', slug: 'katering', icon: 'ðŸ½ï¸', is_active: true, sort_order: 3 },
  { id: 'a1b2c3d4-0004-4000-8000-000000000004', name: 'Venue & Gedung Pernikahan', slug: 'venue', icon: 'ðŸ°', is_active: true, sort_order: 4 },
  { id: 'a1b2c3d4-0005-4000-8000-000000000005', name: 'Dekorasi & Florist', slug: 'dekorasi', icon: 'ðŸŒ¸', is_active: true, sort_order: 5 },
  { id: 'a1b2c3d4-0006-4000-8000-000000000006', name: 'Rias Pengantin & Gaun (Makeup & Attire)', slug: 'makeup-attire', icon: 'ðŸ’„', is_active: true, sort_order: 6 },
  { id: 'a1b2c3d4-0007-4000-8000-000000000007', name: 'Musik, MC & Entertainment', slug: 'music-entertainment', icon: 'ðŸŽµ', is_active: true, sort_order: 7 },
  { id: 'a1b2c3d4-0008-4000-8000-000000000008', name: 'Undangan & Souvenir', slug: 'undangan-souvenir', icon: 'ðŸ’Œ', is_active: true, sort_order: 8 },
  { id: 'a1b2c3d4-0009-4000-8000-000000000009', name: 'Perhiasan & Cincin Kawin', slug: 'jewellery-rings', icon: 'ðŸ’', is_active: true, sort_order: 9 },
  { id: 'a1b2c3d4-0010-4000-8000-000000000010', name: 'Photobooth & Interactive', slug: 'photobooth', icon: 'ðŸ“¸', is_active: true, sort_order: 10 },
  { id: 'a1b2c3d4-0011-4000-8000-000000000011', name: 'Honeymoon & Travel', slug: 'honeymoon', icon: 'âœˆï¸', is_active: true, sort_order: 11 }
];

let _catNameMap = null;
async function getCategoryNameMap() {
  if (_catNameMap) return _catNameMap;
  const map = {};
  try {
    const res = await sbServiceFetch('/mp_categories?select=id,name&limit=100');
    const cats = res.ok ? await res.json() : [];
    if (Array.isArray(cats)) {
      for (const c of cats) if (c && c.id && c.name) map[c.id] = c.name;
      if (Object.keys(map).length > 0) _catNameMap = map;
    }
  } catch (e) {}
  return map;
}

async function resolveCategoryName(categoryId) {
  if (!categoryId) return '';
  const seeded = DEFAULT_CATEGORIES.find(c => c.id === categoryId);
  if (seeded) return seeded.name;
  const map = await getCategoryNameMap();
  return map[categoryId] || '';
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const CACHE_PUBLIC = { 'Cache-Control': 'public, max-age=60, s-maxage=3600, stale-while-revalidate=1800' };
const CACHE_LONG = { 'Cache-Control': 'public, max-age=86400, s-maxage=604800' };
const NO_CACHE = { 'Cache-Control': 'no-store' };

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS, ...headers }
  });
}

async function verifyAuth(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const res = await fetch(`${SB_URL}/auth/v1/user`, {
    headers: {
      apikey: SB_ANON_KEY,
      Authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) return null;
  return await res.json();
}

async function getVendorFromToken(req) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return null;

  const tokenMatch = token.match(/^token_([0-9a-f-]+)_/i);
  if (tokenMatch && tokenMatch[1]) {
    const vRes = await sbServiceFetch(`/mp_vendors?id=eq.${encodeURIComponent(tokenMatch[1])}&select=*&limit=1`);
    const vRows = vRes.ok ? await vRes.json() : [];
    if (vRows && vRows.length > 0) return vRows[0];
  }

  const user = await verifyAuth(req);
  if (user && user.id) {
    const vendorRes = await sbServiceFetch(`/mp_vendors?user_id=eq.${user.id}&select=*&limit=1`);
    const vRows = vendorRes.ok ? await vendorRes.json() : [];
    if (vRows && vRows.length > 0) return vRows[0];
  }

  return null;
}

function generateSlug(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

function normalizeWA(raw) {
  if (!raw) return '';
  raw = String(raw).replace(/[^0-9]/g, '');
  if (raw.startsWith('0')) return '62' + raw.slice(1);
  if (raw.startsWith('8')) return '62' + raw;
  return raw;
}

// ── Phase 2: promo & OTP helpers (edge) ──

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

function genOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Promo aktif ⇔ discount_price < price dan sekarang dalam periode
function enrichPromo(p) {
  const price = Number(p && p.price) || 0;
  const dp = Number(p && p.discount_price) || 0;
  const now = Date.now();
  const start = p.promo_start_at ? new Date(p.promo_start_at).getTime() : null;
  const end = p.promo_end_at ? new Date(p.promo_end_at).getTime() : null;
  const active = price > 0 && dp > 0 && dp < price && start !== null && start <= now && end !== null && now <= end;
  return {
    ...p,
    has_promo: active,
    price_display: active ? dp : price,
    price_original: active ? price : null,
    promo_start_at: active ? p.promo_start_at : null,
    promo_end_at: active ? p.promo_end_at : null
  };
}

async function sendWA(target, message) {
  const token = process.env.FONNTE_TOKEN;
  if (!token) throw new Error('FONNTE_TOKEN tidak dikonfigurasi');
  return fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: { 'Authorization': token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ target, message, countryCode: '62' })
  });
}

async function latestOtp(vendorId, purpose) {
  const res = await sbServiceFetch(`/vendor_otp?vendor_id=eq.${vendorId}&purpose=eq.${purpose}&order=created_at.desc&limit=1&select=*`);
  const rows = res.ok ? await res.json() : [];
  return (Array.isArray(rows) && rows[0]) ? rows[0] : null;
}

async function issueOtp(vendor, purpose, channel, target) {
  await sbServiceFetch(`/vendor_otp?vendor_id=eq.${vendor.id}&purpose=eq.${purpose}&verified_at=is.null`, { method: 'DELETE' });
  const code = genOtpCode();
  await sbServiceFetch('/vendor_otp', {
    method: 'POST',
    body: JSON.stringify({
      vendor_id: vendor.id,
      channel,
      purpose,
      target,
      code,
      expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString()
    }),
    headers: { 'Prefer': 'return=representation' }
  });
  return code;
}

// Validasi & simpan field promo (harga diskon harus < harga normal)
function sanitizePromoFields(body) {
  const out = {};
  if (body.discount_price === undefined) return out;
  const dp = Math.round(parseFloat(body.discount_price));
  const price = Math.round(parseFloat(body.price));
  if (Number.isFinite(dp) && Number.isFinite(price) && dp > 0 && dp < price) {
    out.discount_price = dp;
    out.promo_start_at = body.promo_start_at || null;
    out.promo_end_at = body.promo_end_at || null;
  } else {
    out.discount_price = null;
    out.promo_start_at = null;
    out.promo_end_at = null;
  }
  return out;
}

function maskTarget(channel, target) {
  const s = String(target || '');
  if (channel === 'email') {
    const [user, dom] = s.split('@');
    if (!dom) return s;
    return `${user.slice(0, 2)}***@${dom}`;
  }
  return s.length > 7 ? s.slice(0, 4) + '****' + s.slice(-2) : s;
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const url = new URL(req.url);
  const endpoint = url.searchParams.get('endpoint') || url.pathname.split('/').pop();
  const q = url.searchParams;
  const body = (req.method !== 'GET' && req.method !== 'HEAD') ? await req.json().catch(() => ({})) : {};

  try {
    switch (endpoint) {
      // === CATEGORIES (public, cacheable) ===
      case 'categories': {
        if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
        try {
          const catRes = await sbServiceFetch(`/mp_categories?is_active=eq.true&order=sort_order.asc&select=id,name,slug,icon,description`);
          if (catRes.ok) {
            const categories = await catRes.json();
            if (Array.isArray(categories) && categories.length > 0) {
              if (q.get('with_count') === 'true') {
                const [countRes, prodsRes] = await Promise.all([
                  sbServiceFetch(`/mp_vendors?select=id,category_id,is_active`),
                  sbServiceFetch(`/mp_products?select=vendor_id,cover_image_url&limit=1000`)
                ]);
                const vendors = countRes.ok ? await countRes.json() : [];
                const products = prodsRes.ok ? await prodsRes.json() : [];
                const catOf = (vendors || []).reduce((m, v) => { m[v.id] = v.category_id; return m; }, {});
                const byCat = {};
                for (const p of products || []) {
                  if (!p.cover_image_url) continue;
                  const cid = catOf[p.vendor_id];
                  if (!cid) continue;
                  (byCat[cid] = byCat[cid] || []).push(p.cover_image_url);
                }
                const countMap = (vendors || []).reduce((acc, v) => {
                  if (v.is_active) acc[v.category_id] = (acc[v.category_id] || 0) + 1;
                  return acc;
                }, {});
                return json(categories.map(c => ({
                  ...c,
                  vendor_count: countMap[c.id] || 0,
                  photos: byCat[c.id] ? byCat[c.id].sort(() => Math.random() - 0.5).slice(0, 8) : []
                })), 200, CACHE_PUBLIC);
              }
              return json(categories, 200, CACHE_PUBLIC);
            }
          }
        } catch (e) {}
        return json(DEFAULT_CATEGORIES, 200, CACHE_PUBLIC);
      }

      // === REGIONS PROXY (public, cacheable) ===
      case 'regions': {
        if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
        const type = q.get('type');
        const provId = q.get('provId');
        const regId = q.get('regId');

        let targetUrl = '';
        if (type === 'regencies' && provId) {
          targetUrl = `https://cdn.jsdelivr.net/gh/emsifa/api-wilayah-indonesia@api/regencies/${provId}.json`;
        } else if (type === 'districts' && regId) {
          targetUrl = `https://cdn.jsdelivr.net/gh/emsifa/api-wilayah-indonesia@api/districts/${regId}.json`;
        } else {
          return json({ error: 'Invalid region type or missing ID parameter' }, 400);
        }

        try {
          const fetchRes = await fetch(targetUrl);
          if (fetchRes.ok) {
            const data = await fetchRes.json();
            return json(data, 200, CACHE_LONG);
          }
        } catch (e) {}
        return json({ error: 'Gagal mengambil data wilayah' }, 502);
      }

      // === VENDORS BROWSE & SEARCH (public, cacheable) ===
      case 'vendors': {
        if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
        const category_id = q.get('category_id');
        const city = q.get('city');
        const search = q.get('search');
        const q2 = q.get('q');
        const page = parseInt(q.get('page') || '1', 10) || 1;
        const limit = parseInt(q.get('limit') || '24', 10) || 24;
        const kategori = q.get('kategori');

        let query = `/mp_vendors?select=id,slug,business_name,category_id,city,province,rating_avg,review_count,price_from,cover_image_url,logo_url,is_verified,is_active`;

        if (category_id) {
          query += `&category_id=eq.${encodeURIComponent(category_id)}`;
        } else if (kategori) {
          const catObj = DEFAULT_CATEGORIES.find(c => c.slug === kategori);
          if (catObj) query += `&category_id=eq.${encodeURIComponent(catObj.id)}`;
        }

        const searchTerm = search || q2;
        if (city) query += `&city=ilike.*${encodeURIComponent(city)}*`;
        if (searchTerm) query += `&or=(business_name.ilike.*${encodeURIComponent(searchTerm)}*,description.ilike.*${encodeURIComponent(searchTerm)}*,city.ilike.*${encodeURIComponent(searchTerm)}*)`;

        query += `&limit=50`;

        let allProducts = [];
        let vendors = [];
        const [vRes, prodRes] = await Promise.all([
          sbServiceFetch(query),
          sbServiceFetch(`/mp_products?select=vendor_id,price,discount_price,promo_start_at,promo_end_at,status,cover_image_url,image_url&limit=500&status=eq.publish`)
        ]);
        vendors = vRes.ok ? await vRes.json() : [];
        allProducts = prodRes.ok ? await prodRes.json() : [];

        if (!Array.isArray(vendors) || vendors.length === 0) {
          const fallbackRes = await sbServiceFetch(`/mp_vendors?select=id,slug,business_name,category_id,city,province,rating_avg,review_count,price_from,cover_image_url,logo_url,is_verified,is_active&limit=50`);
          if (fallbackRes.ok) {
            vendors = await fallbackRes.json();
          }
        }

        if ((!vendors || vendors.length === 0)) {
          const vendorMap = {};
          for (const p of allProducts) {
            if (!p.vendor_id) continue;
            if (!vendorMap[p.vendor_id]) {
              vendorMap[p.vendor_id] = {
                id: p.vendor_id,
                business_name: 'Knowhere Studio',
                slug: 'knowhere-studio',
                city: 'Kota Cirebon',
                province: 'Jawa Barat',
                price_from: p.price || 1900000,
                cover_image_url: p.cover_image_url || p.image_url,
                category_id: DEFAULT_CATEGORIES[1].id,
                rating_avg: 5.0,
                review_count: 1,
                is_verified: true
              };
            }
          }
          vendors = Object.values(vendorMap);
        }

        const catNameMap = await getCategoryNameMap();
        const enriched = (vendors || [])
          .sort((a, b) => {
            if ((b.is_verified ? 1 : 0) !== (a.is_verified ? 1 : 0)) return (b.is_verified ? 1 : 0) - (a.is_verified ? 1 : 0);
            if ((b.rating_avg || 0) !== (a.rating_avg || 0)) return (b.rating_avg || 0) - (a.rating_avg || 0);
            return String(b.created_at || '').localeCompare(String(a.created_at || ''));
          })
          .slice((page - 1) * limit, (page - 1) * limit + limit)
          .map(v => {
          const vProds = (allProducts || []).filter(p => p.vendor_id === v.id);
          let minPrice = v.price_from || 0;
          let coverImg = v.cover_image_url || null;
          let logoImg = v.logo_url || null;
          let priceFromDisplay = minPrice;
          let priceFromOriginal = null;

          if (vProds.length > 0) {
            const prices = vProds.map(p => p.price).filter(p => p > 0);
            if (prices.length > 0) minPrice = Math.min(...prices);

            // Phase 2: harga termurah promo-aware (paket termurah sedang promo → tampil coret)
            const effPrices = vProds
              .map(enrichPromo)
              .filter(p => p.price_display > 0);
            if (effPrices.length > 0) {
              const eff = Math.min(...effPrices.map(p => p.price_display));
              const normal = Math.min(...effPrices.map(p => p.price_original || p.price));
              if (eff < normal) {
                priceFromDisplay = eff;
                priceFromOriginal = normal;
              } else {
                priceFromDisplay = normal;
              }
            } else {
              priceFromDisplay = minPrice;
            }

            const prodWithImg = vProds.find(p => p.cover_image_url || p.image_url);
            if (prodWithImg) {
              if (!coverImg) coverImg = prodWithImg.cover_image_url || prodWithImg.image_url;
              if (!logoImg) logoImg = prodWithImg.cover_image_url || prodWithImg.image_url;
            }
          }

          return {
            ...v,
            price_from: minPrice,
            price_from_display: priceFromDisplay,
            price_from_original: priceFromOriginal,
            cover_image_url: coverImg,
            logo_url: logoImg,
            rating: v.rating_avg || 0,
            category_name: (DEFAULT_CATEGORIES.find(c => c.id === v.category_id) || {}).name || catNameMap[v.category_id] || ''
          };
        });

        return json({ data: enriched, page, limit }, 200, CACHE_PUBLIC);
      }

      // === VENDOR PROFILE (public, cacheable) ===
      case 'vendor-detail': {
        if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
        const slug = q.get('slug');
        if (!slug) return json({ error: 'Missing vendor slug' }, 400);

        const VENDOR_COLS = 'id,slug,business_name,city,province,whatsapp,description,cover_image_url,logo_url,category_id,is_verified,rating_avg,review_count';

        let vRes = await sbServiceFetch(`/mp_vendors?slug=eq.${encodeURIComponent(slug)}&select=${VENDOR_COLS}&limit=1`);
        let vendors = vRes.ok ? await vRes.json() : [];
        if (!Array.isArray(vendors) || !vendors.length) {
          const vSearchRes = await sbServiceFetch(`/mp_vendors?or=(slug.ilike.*${encodeURIComponent(slug)}*,business_name.ilike.*${encodeURIComponent(slug.replace(/-/g, ' '))}*)&select=${VENDOR_COLS}&limit=1`);
          vendors = vSearchRes.ok ? await vSearchRes.json() : [];
        }

        const vendor = (Array.isArray(vendors) && vendors.length > 0) ? vendors[0] : null;
        if (!vendor) return json({ error: 'Vendor tidak ditemukan' }, 404);

        vendor.category_name = await resolveCategoryName(vendor.category_id);

        const PRODUCT_COLS = '*';
        const [pRes, rRes] = await Promise.all([
          sbServiceFetch(`/mp_products?vendor_id=eq.${vendor.id}&status=eq.publish&order=created_at.desc&select=${PRODUCT_COLS}`),
          sbServiceFetch(`/mp_reviews?vendor_id=eq.${vendor.id}&order=created_at.desc&limit=10`)
        ]);

        const products = (pRes.ok ? await pRes.json() : []).map(enrichPromo);
        const reviews = rRes.ok ? await rRes.json() : [];

        return json({
          vendor,
          products: Array.isArray(products) ? products : [],
          reviews: Array.isArray(reviews) ? reviews : []
        }, 200, CACHE_PUBLIC);
      }

      // === PRODUCT COVER (public) — serve og:image untuk produk yang
      // cover_image_url-nya berupa data: URI (crawler sosial tidak bisa fetch).
      // URL lain → redirect 302 biar crawler ikut ke sumber asli.
      case 'product-cover': {
        if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
        const id = q.get('id');
        if (!id) return json({ error: 'Missing product ID' }, 400);

        const pRes = await sbServiceFetch(`/mp_products?id=eq.${encodeURIComponent(id)}&status=eq.publish&select=id,cover_image_url&limit=1`);
        const rows = pRes.ok ? await pRes.json() : [];
        const product = (Array.isArray(rows) && rows[0]) ? rows[0] : null;
        if (!product) return json({ error: 'Produk tidak ditemukan' }, 404);

        const cover = product.cover_image_url;
        if (!cover) return json({ error: 'Produk tanpa foto' }, 404);

        const isData = /^data:/i.test(String(cover));
        if (isData) {
          const m = String(cover).match(/^data:(image\/[\w.+-]+);base64,([A-Za-z0-9+/=]+)$/);
          if (!m) return json({ error: 'Format cover tidak didukung' }, 422);
          const bytes = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0));
          return new Response(bytes, {
            status: 200,
            headers: {
              'Content-Type': m[1],
              'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
              ...CORS
            }
          });
        }

        return Response.redirect(new URL(cover, req.url).toString(), 302);
      }

      // === PRODUCT DETAIL (public, cacheable) ===
      case 'product-detail': {
        if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
        const id = q.get('id');
        const slug = q.get('slug');
        if (!id && !slug) return json({ error: 'Missing product ID or slug' }, 400);

        const PRODUCT_COLS = '*';
        let pQuery = id
          ? `/mp_products?id=eq.${encodeURIComponent(id)}&status=eq.publish&select=${PRODUCT_COLS}&limit=1`
          : `/mp_products?slug=eq.${encodeURIComponent(slug)}&status=eq.publish&select=${PRODUCT_COLS}&limit=1`;
        const pRes = await sbServiceFetch(pQuery);
        let products = pRes.ok ? await pRes.json() : [];

        if (!Array.isArray(products) || !products.length) {
          return json({ error: 'Paket produk tidak ditemukan' }, 404);
        }

        const product = enrichPromo(products[0]);

        const [vRes, otherProdsRes, rRes] = await Promise.all([
          sbServiceFetch(`/mp_vendors?id=eq.${product.vendor_id}&select=id,slug,business_name,city,province,whatsapp,description,cover_image_url,logo_url,category_id,is_verified,rating_avg,review_count&limit=1`),
          sbServiceFetch(`/mp_products?vendor_id=eq.${product.vendor_id}&id=neq.${product.id}&status=eq.publish&order=created_at.desc&select=${PRODUCT_COLS}`),
          sbServiceFetch(`/mp_reviews?vendor_id=eq.${product.vendor_id}&order=created_at.desc&limit=10`)
        ]);

        const vendorRows = vRes.ok ? await vRes.json() : [];
        const vendor = (Array.isArray(vendorRows) && vendorRows.length > 0) ? vendorRows[0] : {
          id: product.vendor_id,
          business_name: 'Knowhere Studio',
          slug: 'knowhere-studio',
          city: 'Kab. Cirebon (Weru)',
          whatsapp: '6287864752163'
        };

        vendor.category_name = await resolveCategoryName(vendor.category_id);

        const otherProducts = (otherProdsRes.ok ? await otherProdsRes.json() : []).map(enrichPromo);
        const reviews = rRes.ok ? await rRes.json() : [];

        return json({ product, vendor, otherProducts, reviews }, 200, CACHE_PUBLIC);
      }

      // === VENDOR ME (auth GET/PATCH) ===
      case 'vendor-me': {
        const vendor = await getVendorFromToken(req);
        if (!vendor) return json({ error: 'Unauthorized / Vendor tidak ditemukan' }, 401, NO_CACHE);

        if (req.method === 'GET') {
          // Phase 2: bila email sudah dikonfirmasi di Supabase Auth, tandai verified
          if (!vendor.email_verified_at && vendor.user_id) {
            try {
              const uRes = await fetch(`${SB_URL}/auth/v1/admin/users/${vendor.user_id}`, {
                headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}` }
              });
              if (uRes.ok) {
                const u = await uRes.json();
                if (u && u.email_confirmed_at) {
                  await sbServiceFetch(`/mp_vendors?id=eq.${vendor.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ email_verified_at: new Date().toISOString() })
                  });
                  vendor.email_verified_at = u.email_confirmed_at;
                }
              }
            } catch(e) {}
          }
          return json({ vendor }, 200, NO_CACHE);
        }
        if (req.method === 'PATCH') {
          const allowedFields = [
            'business_name', 'city', 'province', 'owner_name',
            'whatsapp', 'email', 'instagram', 'website',
            'description', 'cover_image_url', 'logo_url'
          ];
          const cleanBody = {};
          for (const key of allowedFields) {
            if (body[key] !== undefined && body[key] !== null) {
              cleanBody[key] = body[key];
            }
          }
          if (body.cover_image && !cleanBody.cover_image_url) {
            cleanBody.cover_image_url = body.cover_image;
          }

          // Phase 2: ganti nomor WhatsApp → wajib verify ulang, paket kembali pending
          let waReverifyOtp = false;
          if (cleanBody.whatsapp !== undefined) {
            const newWA = normalizeWA(cleanBody.whatsapp);
            if (newWA && newWA !== vendor.whatsapp) {
              cleanBody.whatsapp = newWA;
              cleanBody.whatsapp_verified_at = null;
              await sbServiceFetch(`/mp_products?vendor_id=eq.${vendor.id}&status=eq.publish`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'pending' })
              });
              try {
                const code = await issueOtp({ id: vendor.id }, 'wa_reverify', 'whatsapp', newWA);
                await sendWA(newWA, `Kode verifikasi WhatsApp SapaTamu.id Anda: ${code}\nBerlaku 5 menit. Jangan bagikan kode ini kepada siapa pun.`);
                waReverifyOtp = true;
              } catch(e) { console.error('[vendor-me wa-reverify OTP Error]', e); }
            } else {
              delete cleanBody.whatsapp;
            }
          }

          const patchRes = await sbServiceFetch(`/mp_vendors?id=eq.${vendor.id}`, {
            method: 'PATCH',
            body: JSON.stringify(cleanBody),
            headers: { 'Prefer': 'return=representation' }
          });

          const patchJson = await patchRes.json().catch(() => null);
          if (!patchRes.ok || !patchJson) {
            const errMsg = (patchJson && patchJson.message) ? patchJson.message : 'Gagal memperbarui profil vendor';
            return json({ error: errMsg }, 400, NO_CACHE);
          }

          const updated = Array.isArray(patchJson) ? patchJson[0] : patchJson;
          return json({ success: true, vendor: updated || vendor, wa_reverify_required: waReverifyOtp }, 200, NO_CACHE);
        }
        return json({ error: 'Method not allowed' }, 405);
      }

      // === VENDOR PRODUCTS (auth GET/POST/PATCH/DELETE) ===
      case 'vendor-products': {
        const vendor = await getVendorFromToken(req);
        if (!vendor) return json({ error: 'Unauthorized' }, 401, NO_CACHE);

        if (req.method === 'GET') {
          const prodRes = await sbServiceFetch(`/mp_products?vendor_id=eq.${vendor.id}&order=sort_order.asc,created_at.desc&select=*`);
          const products = prodRes.ok ? await prodRes.json() : [];
          products.forEach(p => {
            p.category_name = p.category_name || p.short_desc || '';
          });
          return json({ data: products }, 200, NO_CACHE);
        }

        if (req.method === 'POST') {
          const { name, price, description, image_url, cover_image_url, badge_tag, category_name } = body;
          if (!name || !price) return json({ error: 'Nama paket dan harga wajib diisi' }, 400);

          const slug = generateSlug(name) + '-' + Date.now().toString(36);
          const finalImage = image_url || cover_image_url || null;
          const finalPrice = Math.round(parseFloat(price)) || 0;
          const catVal = category_name ? category_name.trim() : '';

          // Phase 2: vendor yang WhatsApp-nya belum verified → paket pending
          const promo = sanitizePromoFields({ ...body, price: finalPrice });

          const insertRes = await sbServiceFetch('/mp_products', {
            method: 'POST',
            body: JSON.stringify({
              vendor_id: vendor.id,
              name: name.trim(),
              slug: slug,
              price: finalPrice,
              description: description ? description.trim() : '',
              short_desc: catVal,
              cover_image_url: finalImage,
              price_label: badge_tag ? badge_tag.trim() : null,
              is_active: true,
              status: vendor.whatsapp_verified_at ? 'publish' : 'pending',
              ...promo
            }),
            headers: { 'Prefer': 'return=representation' }
          });
          const insertedJson = await insertRes.json().catch(() => null);
          if (!insertRes.ok || !insertedJson) {
            const errMsg = (insertedJson && insertedJson.message) ? insertedJson.message : 'Gagal menyimpan paket ke database';
            return json({ error: errMsg }, 400);
          }
          const product = Array.isArray(insertedJson) ? insertedJson[0] : insertedJson;
          if (product) product.category_name = product.category_name || product.short_desc || '';
          return json({ success: true, product }, 201);
        }

        if (req.method === 'PATCH' || req.method === 'PUT') {
          const id = q.get('id');
          if (!id) return json({ error: 'Missing product ID' }, 400);

          const { name, price, description, image_url, cover_image_url, badge_tag, category_name, discount_price, promo_start_at, promo_end_at } = body;
          const updateBody = {};

          if (name) {
            updateBody.name = name.trim();
            updateBody.slug = generateSlug(name) + '-' + Date.now().toString(36);
          }
          if (price !== undefined) updateBody.price = Math.round(parseFloat(price)) || 0;
          if (description !== undefined) updateBody.description = description ? description.trim() : '';
          const finalImage = image_url || cover_image_url;
          if (finalImage !== undefined) updateBody.cover_image_url = finalImage || null;
          if (badge_tag !== undefined) updateBody.price_label = badge_tag ? badge_tag.trim() : null;
          if (category_name !== undefined) updateBody.short_desc = category_name ? category_name.trim() : '';

          // Phase 2: field promo (diskon). Validasi harga diskon < harga normal.
          if (discount_price !== undefined) {
            const current = price !== undefined
              ? Math.round(parseFloat(price)) || 0
              : await sbServiceFetch(`/mp_products?id=eq.${encodeURIComponent(id)}&vendor_id=eq.${vendor.id}&select=price&limit=1`)
                  .then(r => r.ok ? r.json() : []).then(r => (Array.isArray(r) && r[0] && r[0].price) || 0);
            Object.assign(updateBody, sanitizePromoFields({ discount_price, promo_start_at, promo_end_at, price: current }));
          } else {
            if (promo_start_at !== undefined) updateBody.promo_start_at = promo_start_at || null;
            if (promo_end_at !== undefined) updateBody.promo_end_at = promo_end_at || null;
          }
          updateBody.updated_at = new Date().toISOString();

          const updateRes = await sbServiceFetch(`/mp_products?id=eq.${encodeURIComponent(id)}&vendor_id=eq.${vendor.id}`, {
            method: 'PATCH',
            body: JSON.stringify(updateBody),
            headers: { 'Prefer': 'return=representation' }
          });
          const updatedJson = await updateRes.json().catch(() => null);
          if (!updateRes.ok || !updatedJson) {
            const errMsg = (updatedJson && updatedJson.message) ? updatedJson.message : 'Gagal memperbarui paket';
            return json({ error: errMsg }, 400);
          }
          const product = Array.isArray(updatedJson) ? updatedJson[0] : updatedJson;
          if (product) product.category_name = product.category_name || product.short_desc || '';
          return json({ success: true, product }, 200);
        }

        if (req.method === 'DELETE') {
          const id = q.get('id');
          if (!id) return json({ error: 'Missing product ID' }, 400);
          await sbServiceFetch(`/mp_products?id=eq.${encodeURIComponent(id)}&vendor_id=eq.${vendor.id}`, {
            method: 'DELETE'
          });
          return json({ success: true }, 200);
        }

        return json({ error: 'Method not allowed' }, 405);
      }

      // === VENDOR INQUIRIES (auth GET) ===
      case 'vendor-inquiries': {
        if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
        const vendor = await getVendorFromToken(req);
        if (!vendor) return json({ error: 'Unauthorized' }, 401, NO_CACHE);
        const iqRes = await sbServiceFetch(`/mp_inquiries?vendor_id=eq.${vendor.id}&order=created_at.desc`);
        const inquiries = iqRes.ok ? await iqRes.json() : [];
        return json(inquiries, 200, NO_CACHE);
      }

      default:
        return json({ error: `Endpoint "${endpoint}" not found` }, 404);
    }
  } catch (err) {
    console.error(`[mp-public:${endpoint}] error:`, err);
    return json({ error: err.message || 'Internal server error', detail: String(err) }, 500);
  }
}
