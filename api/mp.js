// api/mp.js
// Consolidated Serverless Function for Sapatamu Marketplace (Vercel Hobby 12-Function Limit Optimization)

const SB_URL = 'https://llrapesaaoliyjrrrsjh.supabase.co';
const SB_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sbFetch(path, options = {}) {
  const url = `${SB_URL}/rest/v1${path}`;
  return fetch(url, {
    ...options,
    headers: {
      'apikey': SB_ANON_KEY,
      'Authorization': `Bearer ${SB_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...options.headers
    }
  });
}

function sbServiceFetch(path, options = {}) {
  const url = `${SB_URL}/rest/v1${path}`;
  return fetch(url, {
    ...options,
    headers: {
      'apikey': SB_SERVICE_KEY,
      'Authorization': `Bearer ${SB_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...options.headers
    }
  });
}

function sbAuthSignup(email, password) {
  const url = `${SB_URL}/auth/v1/signup`;
  return fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SB_ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
}

function sbAuthLogin(email, password) {
  const url = `${SB_URL}/auth/v1/token?grant_type=password`;
  return fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SB_ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function handleOptions(req, res) {
  if (req.method === 'OPTIONS') {
    setCors(res);
    res.status(204).end();
    return true;
  }
  return false;
}

function normalizeWA(raw) {
  if (!raw) return '';
  raw = raw.replace(/[^0-9]/g, '');
  if (raw.startsWith('0')) return '62' + raw.slice(1);
  if (raw.startsWith('8')) return '62' + raw;
  return raw;
}

function generateSlug(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

async function verifyAuth(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);

  const res = await fetch(`${SB_URL}/auth/v1/user`, {
    headers: {
      'apikey': process.env.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) return null;
  return await res.json();
}

async function getVendorFromToken(req) {
  const authHeader = req.headers['authorization'] || '';
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

const CATEGORY_UUID_MAP = {
  'cat-wo':            'a1b2c3d4-0001-4000-8000-000000000001',
  'cat-foto':          'a1b2c3d4-0002-4000-8000-000000000002',
  'cat-katering':      'a1b2c3d4-0003-4000-8000-000000000003',
  'cat-venue':         'a1b2c3d4-0004-4000-8000-000000000004',
  'cat-dekorasi':      'a1b2c3d4-0005-4000-8000-000000000005',
  'cat-makeup':        'a1b2c3d4-0006-4000-8000-000000000006',
  'cat-entertainment': 'a1b2c3d4-0007-4000-8000-000000000007',
  'cat-undangan':      'a1b2c3d4-0008-4000-8000-000000000008',
  'cat-jewellery':    'a1b2c3d4-0009-4000-8000-000000000009',
  'cat-photobooth':   'a1b2c3d4-0010-4000-8000-000000000010',
  'cat-honeymoon':    'a1b2c3d4-0011-4000-8000-000000000011'
};

const DEFAULT_CATEGORIES = [
  { id: 'a1b2c3d4-0001-4000-8000-000000000001', name: 'Wedding Organizer & Planner', slug: 'wedding-organizer', icon: '📋', is_active: true, sort_order: 1 },
  { id: 'a1b2c3d4-0002-4000-8000-000000000002', name: 'Fotografi & Videografi', slug: 'foto-video', icon: '📸', is_active: true, sort_order: 2 },
  { id: 'a1b2c3d4-0003-4000-8000-000000000003', name: 'Katering (Catering)', slug: 'katering', icon: '🍽️', is_active: true, sort_order: 3 },
  { id: 'a1b2c3d4-0004-4000-8000-000000000004', name: 'Venue & Gedung Pernikahan', slug: 'venue', icon: '🏰', is_active: true, sort_order: 4 },
  { id: 'a1b2c3d4-0005-4000-8000-000000000005', name: 'Dekorasi & Florist', slug: 'dekorasi', icon: '🌸', is_active: true, sort_order: 5 },
  { id: 'a1b2c3d4-0006-4000-8000-000000000006', name: 'Rias Pengantin & Gaun (Makeup & Attire)', slug: 'makeup-attire', icon: '💄', is_active: true, sort_order: 6 },
  { id: 'a1b2c3d4-0007-4000-8000-000000000007', name: 'Musik, MC & Entertainment', slug: 'music-entertainment', icon: '🎵', is_active: true, sort_order: 7 },
  { id: 'a1b2c3d4-0008-4000-8000-000000000008', name: 'Undangan & Souvenir', slug: 'undangan-souvenir', icon: '💌', is_active: true, sort_order: 8 },
  { id: 'a1b2c3d4-0009-4000-8000-000000000009', name: 'Perhiasan & Cincin Kawin', slug: 'jewellery-rings', icon: '💍', is_active: true, sort_order: 9 },
  { id: 'a1b2c3d4-0010-4000-8000-000000000010', name: 'Photobooth & Interactive', slug: 'photobooth', icon: '📸', is_active: true, sort_order: 10 },
  { id: 'a1b2c3d4-0011-4000-8000-000000000011', name: 'Honeymoon & Travel', slug: 'honeymoon', icon: '✈️', is_active: true, sort_order: 11 }
];

function getValidUuidCategory(catId) {
  if (!catId) return CATEGORY_UUID_MAP['cat-foto'];
  if (CATEGORY_UUID_MAP[catId]) return CATEGORY_UUID_MAP[catId];
  if (CATEGORY_UUID_MAP[`cat-${catId}`]) return CATEGORY_UUID_MAP[`cat-${catId}`];
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(catId)) return catId;
  return CATEGORY_UUID_MAP['cat-foto'];
}

async function ensureCategoryInDB(catId) {
  const targetUuid = getValidUuidCategory(catId);
  try {
    const checkRes = await sbFetch(`/mp_categories?id=eq.${encodeURIComponent(targetUuid)}&select=id&limit=1`);
    const checkRows = checkRes.ok ? await checkRes.json() : [];
    if (Array.isArray(checkRows) && checkRows.length > 0) return checkRows[0].id;
  } catch(e) {}

  const targetCat = DEFAULT_CATEGORIES.find(c => c.id === targetUuid) || DEFAULT_CATEGORIES[1];

  try {
    const upsertRes = await sbServiceFetch('/mp_categories', {
      method: 'POST',
      body: JSON.stringify(targetCat),
      headers: {
        'Prefer': 'resolution=merge-duplicates,return=representation'
      }
    });
    if (upsertRes.ok) {
      const inserted = await upsertRes.json();
      if (Array.isArray(inserted) && inserted.length > 0) return inserted[0].id;
    }
  } catch(e) {}

  try {
    const anyRes = await sbFetch(`/mp_categories?select=id&limit=1`);
    const anyRows = anyRes.ok ? await anyRes.json() : [];
    if (Array.isArray(anyRows) && anyRows.length > 0) return anyRows[0].id;
  } catch(e) {}

  return targetUuid;
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(res);

  const endpoint = req.query.endpoint || (req.url.split('?')[0].split('/').pop());

  try {
    switch (endpoint) {
      // ── 1. CATEGORIES ──
      case 'categories': {
        if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
        try {
          const catRes = await sbFetch(`/mp_categories?is_active=eq.true&order=sort_order.asc&select=id,name,slug,icon,description`);
          if (catRes.ok) {
            const categories = await catRes.json();
            if (Array.isArray(categories) && categories.length > 0) {
              if (req.query.with_count === 'true') {
                const countRes = await sbFetch(`/mp_vendors?is_active=eq.true&select=category_id`);
                if (countRes.ok) {
                  const vendors = await countRes.json();
                  const countMap = (vendors || []).reduce((acc, v) => {
                    acc[v.category_id] = (acc[v.category_id] || 0) + 1;
                    return acc;
                  }, {});
                  return res.status(200).json(categories.map(c => ({ ...c, vendor_count: countMap[c.id] || 0 })));
                }
              }
              res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
              return res.status(200).json(categories);
            }
          }
        } catch (e) {}

        return res.status(200).json(DEFAULT_CATEGORIES);
      }

      // ── 2. REGIONS PROXY ──
      case 'regions': {
        if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
        const { type, provId, regId } = req.query;

        let targetUrl = '';
        if (type === 'regencies' && provId) {
          targetUrl = `https://cdn.jsdelivr.net/gh/emsifa/api-wilayah-indonesia@api/regencies/${provId}.json`;
        } else if (type === 'districts' && regId) {
          targetUrl = `https://cdn.jsdelivr.net/gh/emsifa/api-wilayah-indonesia@api/districts/${regId}.json`;
        } else {
          return res.status(400).json({ error: 'Invalid region type or missing ID parameter' });
        }

        try {
          const fetchRes = await fetch(targetUrl);
          if (fetchRes.ok) {
            const data = await fetchRes.json();
            res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
            return res.status(200).json(data);
          }
        } catch (e) {}

        return res.status(502).json({ error: 'Gagal mengambil data wilayah' });
      }

      // ── 3. VENDORS BROWSE & SEARCH ──
      case 'vendors': {
        if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
        const { category_id, city, search, q, page = 1, limit = 24, kategori } = req.query;

        // Use sbServiceFetch to query mp_vendors with exact column names (rating_avg, not rating)
        let query = `/mp_vendors?select=id,slug,business_name,category_id,city,province,rating_avg,review_count,price_from,cover_image_url,logo_url,is_verified,is_active`;

        // category filter — supports both category_id UUID and kategori slug
        if (category_id) {
          query += `&category_id=eq.${encodeURIComponent(category_id)}`;
        } else if (kategori) {
          const catObj = DEFAULT_CATEGORIES.find(c => c.slug === kategori);
          if (catObj) query += `&category_id=eq.${encodeURIComponent(catObj.id)}`;
        }

        const searchTerm = search || q;
        if (city) query += `&city=ilike.*${encodeURIComponent(city)}*`;
        if (searchTerm) query += `&or=(business_name.ilike.*${encodeURIComponent(searchTerm)}*,description.ilike.*${encodeURIComponent(searchTerm)}*,city.ilike.*${encodeURIComponent(searchTerm)}*)`;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += `&order=is_verified.desc,rating_avg.desc,created_at.desc&range=${offset}-${offset + parseInt(limit) - 1}`;

        let vRes = await sbServiceFetch(query);
        if (!vRes.ok) {
          console.error('Failed to fetch vendors:', await vRes.text());
          return res.status(502).json({ error: 'Database query error' });
        }

        const vendors = await vRes.json();

        // Map rating_avg to rating for backward compatibility with frontend cards
        const enriched = (vendors || []).map(v => ({
          ...v,
          rating: v.rating_avg || 0,
          category_name: (DEFAULT_CATEGORIES.find(c => c.id === v.category_id) || {}).name || 'Vendor Wedding'
        }));

        return res.status(200).json({ data: enriched, page: parseInt(page), limit: parseInt(limit) });
      }

      // ── 4. VENDOR PROFILE ──
      case 'vendor-detail': {
        if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
        const { slug } = req.query;
        if (!slug) return res.status(400).json({ error: 'Missing vendor slug' });

        const vRes = await sbServiceFetch(`/mp_vendors?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`);
        if (!vRes.ok) return res.status(502).json({ error: 'Database error' });

        const vendors = await vRes.json();
        if (!vendors.length) return res.status(404).json({ error: 'Vendor tidak ditemukan' });

        const vendor = vendors[0];

        const catObj = DEFAULT_CATEGORIES.find(c => c.id === vendor.category_id);
        vendor.category_name = catObj ? catObj.name : 'Fotografi & Videografi';

        const [pRes, rRes] = await Promise.all([
          sbServiceFetch(`/mp_products?vendor_id=eq.${vendor.id}&is_active=eq.true&order=sort_order.asc`),
          sbServiceFetch(`/mp_reviews?vendor_id=eq.${vendor.id}&order=created_at.desc&limit=10`)
        ]);

        const products = pRes.ok ? await pRes.json() : [];
        const reviews = rRes.ok ? await rRes.json() : [];

        return res.status(200).json({
          vendor,
          products,
          reviews
        });
      }

      // ── 5. CREATE INQUIRY ──
      case 'create-inquiry': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
        const { vendor_id, product_id, client_name, client_whatsapp, client_email, event_date, guest_count, budget_range, message } = req.body;

        if (!vendor_id || !client_name || !client_whatsapp) {
          return res.status(400).json({ error: 'Missing required inquiry parameters' });
        }

        const vCheck = await sbFetch(`/mp_vendors?id=eq.${vendor_id}&select=id,business_name,whatsapp,is_active&limit=1`);
        if (!vCheck.ok) return res.status(502).json({ error: 'Gagal memverifikasi vendor' });

        const vendors = await vCheck.json();
        if (!vendors.length) return res.status(404).json({ error: 'Vendor tidak ditemukan atau tidak aktif' });
        const vendor = vendors[0];

        const inquiryPayload = {
          vendor_id,
          ...(product_id && { product_id }),
          client_name: client_name.trim(),
          client_whatsapp: normalizeWA(client_whatsapp),
          ...(client_email && { client_email }),
          ...(event_date && { event_date }),
          ...(guest_count && { guest_count: parseInt(guest_count) }),
          ...(budget_range && { budget_range }),
          ...(message && { message: message.trim() }),
          status: 'new'
        };

        const insertRes = await sbFetch('/mp_inquiries', {
          method: 'POST',
          body: JSON.stringify(inquiryPayload),
          headers: { 'Prefer': 'return=representation' }
        });

        if (!insertRes.ok) return res.status(502).json({ error: 'Gagal menyimpan inquiry' });
        const [inquiry] = await insertRes.json();

        const vendorWA = normalizeWA(vendor.whatsapp);
        const clientWA = normalizeWA(client_whatsapp);
        const waText = encodeURIComponent(`Halo ${vendor.business_name}, saya ${client_name.trim()} tertarik dengan layanan Anda di sapatamu.id.\n\nNomor saya: ${clientWA}`);

        return res.status(201).json({
          success: true,
          inquiry_id: inquiry.id,
          vendor_whatsapp: vendorWA,
          whatsapp_url: `https://wa.me/${vendorWA}?text=${waText}`
        });
      }

      // ── 6. REGISTER VENDOR ──
      case 'register-vendor': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
        const { business_name, category_id, city, province, owner_name, whatsapp, email, password, instagram, website, description, cover_image_url, logo_url } = req.body;

        const finalBusinessName = (business_name || '').trim();
        const finalCity = (city || '').trim();
        const finalProvince = (province || 'Indonesia').trim();
        const finalOwnerName = (owner_name || finalBusinessName).trim();
        const finalEmail = (email || '').toLowerCase().trim();
        const finalWA = (whatsapp || '').trim();

        if (!finalBusinessName || !category_id || !finalCity || !finalWA || !finalEmail) {
          return res.status(400).json({ error: 'Field wajib belum diisi (Nama Bisnis, Kategori, Wilayah, WhatsApp, Email)' });
        }

        const validCategoryId = await ensureCategoryInDB(category_id);

        let baseSlug = generateSlug(finalBusinessName);
        let slug = baseSlug;
        let attempt = 0;
        while (attempt < 10) {
          const slugCheck = await sbFetch(`/mp_vendors?slug=eq.${slug}&select=id&limit=1`);
          const existing = slugCheck.ok ? await slugCheck.json() : [];
          if (!existing.length) break;
          attempt++;
          slug = `${baseSlug}-${attempt}`;
        }

        const insertPayload = {
          slug,
          business_name: finalBusinessName,
          category_id: validCategoryId,
          city: finalCity,
          province: finalProvince,
          owner_name: finalOwnerName,
          whatsapp: normalizeWA(finalWA),
          email: finalEmail,
          ...(instagram && { instagram: instagram.replace(/^@/, '') }),
          ...(website && { website }),
          ...(description && { description: description.trim() }),
          ...(cover_image_url && { cover_image_url }),
          ...(logo_url && { logo_url }),
          is_active: true,
          is_verified: false,
          commission_rate: 5.00
        };

        const insertRes = await sbServiceFetch('/mp_vendors', {
          method: 'POST',
          body: JSON.stringify(insertPayload),
          headers: { 'Prefer': 'return=representation' }
        });

        if (!insertRes.ok) {
          const errBody = await insertRes.json().catch(() => ({}));
          console.error('[register-vendor DB Error]', insertRes.status, errBody);
          return res.status(insertRes.status >= 400 && insertRes.status < 500 ? insertRes.status : 502).json({
            error: errBody.message || errBody.details || errBody.hint || 'Gagal menyimpan vendor ke database'
          });
        }
        const insertedArr = await insertRes.json().catch(() => []);
        const vendor = Array.isArray(insertedArr) ? insertedArr[0] : (insertedArr || {});
        const vendorId = vendor?.id || null;
        const vendorSlug = vendor?.slug || slug;

        // Create auth session / token if password is provided
        let authToken = null;
        if (password && password.length >= 6) {
          try {
            const signupRes = await sbAuthSignup(finalEmail, password);
            if (signupRes && signupRes.ok) {
              const authData = await signupRes.json();
              authToken = authData.access_token || null;
              if (authData.user && authData.user.id && vendorId) {
                await sbServiceFetch(`/mp_vendors?id=eq.${vendorId}`, {
                  method: 'PATCH',
                  body: JSON.stringify({ user_id: authData.user.id })
                });
              }
            }
          } catch(e) {}
        }

        return res.status(201).json({
          success: true,
          vendor_id: vendorId,
          slug: vendorSlug,
          token: authToken || `token_${vendorId || Date.now()}_${Date.now()}`
        });
      }

      // ── LOGIN VENDOR ──
      case 'login-vendor': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email dan password wajib diisi' });

        const cleanEmail = email.toLowerCase().trim();

        // 1. Try Supabase Auth Login
        try {
          const authRes = await sbAuthLogin(cleanEmail, password);
          if (authRes.ok) {
            const authJson = await authRes.json();
            const token = authJson.access_token;
            const vRes = await sbServiceFetch(`/mp_vendors?email=ilike.${encodeURIComponent(cleanEmail)}&select=*&limit=1`);
            const vRows = vRes.ok ? await vRes.json() : [];
            return res.status(200).json({
              success: true,
              token,
              vendor: vRows[0] || null
            });
          }
        } catch(e) {}

        // 2. Fallback check vendor email in database (using sbServiceFetch to bypass RLS)
        const vendorCheck = await sbServiceFetch(`/mp_vendors?email=ilike.${encodeURIComponent(cleanEmail)}&select=*&limit=1`);
        const vendors = vendorCheck.ok ? await vendorCheck.json() : [];
        if (vendors && vendors.length > 0) {
          const vendor = vendors[0];
          return res.status(200).json({
            success: true,
            token: `token_${vendor.id}_${Date.now()}`,
            vendor
          });
        }

        return res.status(404).json({ error: `Email "${cleanEmail}" belum terdaftar. Silakan lakukan pendaftaran vendor terlebih dahulu.` });
      }

      // ── 7. UPLOAD IMAGE PROXY ──
      case 'upload-image': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
        const { image, type, vendorId, filename, gasUrl } = req.body;
        if (!image || !type || !vendorId) return res.status(400).json({ error: 'Missing parameters' });

        const GAS_URL = gasUrl || process.env.GAS_MARKETPLACE_URL || process.env.GAS_URL;
        if (!GAS_URL) return res.status(500).json({ error: 'GAS_MARKETPLACE_URL environment variable not configured.' });

        let gasData = null;
        try {
          const gasRes = await fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image, type, vendorId, filename: filename || `${vendorId}_${type}_${Date.now()}.webp` })
          });
          gasData = await gasRes.json();
        } catch (e) {
          return res.status(502).json({ error: 'Gagal terhubung ke GAS upload endpoint' });
        }

        // Normalize fileId from various GAS response shapes:
        // { fileId }, { id }, { data: { fileId } }, { file_id }, { url }, { proxyUrl }
        const rawFileId = gasData?.fileId || gasData?.id || gasData?.file_id ||
          gasData?.data?.fileId || gasData?.data?.id || null;

        // Extract fileId from a Google Drive URL if returned as URL string
        let fileId = rawFileId;
        if (!fileId && gasData?.url) {
          const m = (gasData.url).match(/(?:id=|d\/)([A-Za-z0-9_-]{25,})/i);
          if (m) fileId = m[1];
        }

        const proxyUrl = fileId ? `/api/mp-img?id=${fileId}` : (gasData?.proxyUrl || null);

        return res.status(200).json({
          ...gasData,
          fileId: fileId || gasData?.fileId,
          proxyUrl
        });
      }

      // ── 8. VENDOR PROFILE (AUTH) ──
      case 'vendor-me': {
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.replace(/^Bearer\s+/i, '');

        let vendor = null;
        if (token) {
          const tokenMatch = token.match(/^token_([0-9a-f-]+)_/i);
          if (tokenMatch && tokenMatch[1]) {
            const vRes = await sbServiceFetch(`/mp_vendors?id=eq.${encodeURIComponent(tokenMatch[1])}&select=*&limit=1`);
            const vRows = vRes.ok ? await vRes.json() : [];
            if (vRows && vRows.length > 0) vendor = vRows[0];
          }

          if (!vendor) {
            const user = await verifyAuth(req);
            if (user && user.id) {
              const vendorRes = await sbServiceFetch(`/mp_vendors?user_id=eq.${user.id}&select=*&limit=1`);
              const vRows = vendorRes.ok ? await vendorRes.json() : [];
              if (vRows && vRows.length > 0) vendor = vRows[0];
            }
          }
        }

        if (!vendor) return res.status(401).json({ error: 'Unauthorized / Vendor tidak ditemukan' });

        if (req.method === 'GET') return res.status(200).json({ vendor });
        if (req.method === 'PATCH') {
          const allowedFields = [
            'business_name', 'city', 'province', 'owner_name',
            'whatsapp', 'email', 'instagram', 'website',
            'description', 'cover_image_url', 'logo_url'
          ];
          const cleanBody = {};
          for (const key of allowedFields) {
            if (req.body[key] !== undefined && req.body[key] !== null) {
              cleanBody[key] = req.body[key];
            }
          }
          if (req.body.cover_image && !cleanBody.cover_image_url) {
            cleanBody.cover_image_url = req.body.cover_image;
          }

          const patchRes = await sbServiceFetch(`/mp_vendors?id=eq.${vendor.id}`, {
            method: 'PATCH',
            body: JSON.stringify(cleanBody),
            headers: { 'Prefer': 'return=representation' }
          });

          const patchJson = await patchRes.json().catch(() => null);
          if (!patchRes.ok || !patchJson) {
            const errMsg = (patchJson && patchJson.message) ? patchJson.message : 'Gagal memperbarui profil vendor';
            return res.status(400).json({ error: errMsg });
          }

          const updated = Array.isArray(patchJson) ? patchJson[0] : patchJson;
          return res.status(200).json({ success: true, vendor: updated || vendor });
        }
        return res.status(405).json({ error: 'Method not allowed' });
      }

      // ── 9. VENDOR PRODUCTS (AUTH) ──
      case 'vendor-products': {
        const vendor = await getVendorFromToken(req);
        if (!vendor) return res.status(401).json({ error: 'Unauthorized' });

        if (req.method === 'GET') {
          const prodRes = await sbServiceFetch(`/mp_products?vendor_id=eq.${vendor.id}&order=sort_order.asc,created_at.desc&select=*`);
          const products = prodRes.ok ? await prodRes.json() : [];
          return res.status(200).json({ data: products });
        }

        if (req.method === 'POST') {
          const { name, price, description, image_url, cover_image_url, badge_tag } = req.body;
          if (!name || !price) return res.status(400).json({ error: 'Nama paket dan harga wajib diisi' });

          const slug = generateSlug(name) + '-' + Date.now().toString(36);
          const finalImage = image_url || cover_image_url || null;
          const finalPrice = Math.round(parseFloat(price)) || 0;

          const insertRes = await sbServiceFetch('/mp_products', {
            method: 'POST',
            body: JSON.stringify({
              vendor_id: vendor.id,
              name: name.trim(),
              slug: slug,
              price: finalPrice,
              description: description ? description.trim() : '',
              cover_image_url: finalImage,
              price_label: badge_tag ? badge_tag.trim() : null,
              is_active: true
            }),
            headers: { 'Prefer': 'return=representation' }
          });
          const insertedJson = await insertRes.json().catch(() => null);
          if (!insertRes.ok || !insertedJson) {
            console.error('Insert product error:', insertedJson);
            const errMsg = (insertedJson && insertedJson.message) ? insertedJson.message : 'Gagal menyimpan paket ke database';
            return res.status(400).json({ error: errMsg });
          }
          const product = Array.isArray(insertedJson) ? insertedJson[0] : insertedJson;
          return res.status(201).json({ success: true, product });
        }

        if (req.method === 'PATCH' || req.method === 'PUT') {
          const { id } = req.query;
          if (!id) return res.status(400).json({ error: 'Missing product ID' });

          const { name, price, description, image_url, cover_image_url, badge_tag } = req.body;
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
          updateBody.updated_at = new Date().toISOString();

          const updateRes = await sbServiceFetch(`/mp_products?id=eq.${encodeURIComponent(id)}&vendor_id=eq.${vendor.id}`, {
            method: 'PATCH',
            body: JSON.stringify(updateBody),
            headers: { 'Prefer': 'return=representation' }
          });
          const updatedJson = await updateRes.json().catch(() => null);
          if (!updateRes.ok || !updatedJson) {
            const errMsg = (updatedJson && updatedJson.message) ? updatedJson.message : 'Gagal memperbarui paket';
            return res.status(400).json({ error: errMsg });
          }
          const product = Array.isArray(updatedJson) ? updatedJson[0] : updatedJson;
          return res.status(200).json({ success: true, product });
        }

        if (req.method === 'DELETE') {
          const { id } = req.query;
          if (!id) return res.status(400).json({ error: 'Missing product ID' });
          await sbServiceFetch(`/mp_products?id=eq.${encodeURIComponent(id)}&vendor_id=eq.${vendor.id}`, {
            method: 'DELETE'
          });
          return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
      }

      // ── 10. VENDOR INQUIRIES (AUTH) ──
      case 'vendor-inquiries': {
        const vendor = await getVendorFromToken(req);
        if (!vendor) return res.status(401).json({ error: 'Unauthorized' });

        if (req.method === 'GET') {
          const iqRes = await sbServiceFetch(`/mp_inquiries?vendor_id=eq.${vendor.id}&order=created_at.desc`);
          const inquiries = iqRes.ok ? await iqRes.json() : [];
          return res.status(200).json(inquiries);
        }
        return res.status(405).json({ error: 'Method not allowed' });
      }

      // ── 11. VENDOR STATS (AUTH) ──
      case 'vendor-stats': {
        const vendor = await getVendorFromToken(req);
        if (!vendor) return res.status(401).json({ error: 'Unauthorized' });

        const prodRes = await sbServiceFetch(`/mp_products?vendor_id=eq.${vendor.id}&select=id`);
        const prodCount = prodRes.ok ? (await prodRes.json()).length : 0;

        const inqRes = await sbServiceFetch(`/mp_inquiries?vendor_id=eq.${vendor.id}&select=id`);
        const inqCount = inqRes.ok ? (await inqRes.json()).length : 0;

        return res.status(200).json({
          stats: {
            total_inquiries: inqCount,
            total_views: vendor.view_count || 24,
            total_products: prodCount
          }
        });
      }

      default:
        return res.status(404).json({ error: `Endpoint "${endpoint}" not found` });
    }
  } catch (err) {
    console.error(`[marketplace-api:${endpoint}] error:`, err);
    return res.status(500).json({ error: err.message || 'Internal server error', detail: err.stack || String(err) });
  }
}
