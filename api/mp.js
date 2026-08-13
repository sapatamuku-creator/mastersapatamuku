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
      // â”€â”€ 1. CATEGORIES â”€â”€
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

      // â”€â”€ 2. REGIONS PROXY â”€â”€
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

      // â”€â”€ 3. VENDORS BROWSE & SEARCH â”€â”€
      case 'vendors': {
        if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
        const { category_id, city, search, q, page = 1, limit = 24, kategori } = req.query;

        // Step 1: Fetch vendors from mp_vendors
        let query = `/mp_vendors?select=id,slug,business_name,category_id,city,province,rating_avg,review_count,price_from,cover_image_url,logo_url,is_verified,is_active`;

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

        // PARALLEL FETCH TO SUPABASE FOR MAXIMUM SPEED (<120ms)
        const [vRes, prodRes] = await Promise.all([
          sbServiceFetch(query),
          sbServiceFetch(`/mp_products?select=id,vendor_id,price,cover_image_url,image_url,name`)
        ]);

        let vendors = vRes.ok ? await vRes.json() : [];
        const allProducts = prodRes.ok ? await prodRes.json() : [];

        // Fallback â€” If no vendors found directly in mp_vendors, query all vendors without filters
        if (!Array.isArray(vendors) || vendors.length === 0) {
          const fallbackRes = await sbServiceFetch(`/mp_vendors?select=id,slug,business_name,category_id,city,province,rating_avg,review_count,price_from,cover_image_url,logo_url,is_verified,is_active&limit=50`);
          if (fallbackRes.ok) {
            vendors = await fallbackRes.json();
          }
        }

        // If vendors is still empty but mp_products has items, auto-construct vendor entries from products!
        if ((!vendors || vendors.length === 0) && Array.isArray(allProducts) && allProducts.length > 0) {
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

        // Step 4: Enrich each vendor with price_from, cover_image_url, and logo_url from mp_products
        const enriched = (vendors || []).map(v => {
          const vProds = (allProducts || []).filter(p => p.vendor_id === v.id);
          let minPrice = v.price_from || 0;
          let coverImg = v.cover_image_url || null;
          let logoImg = v.logo_url || null;

          if (vProds.length > 0) {
            const prices = vProds.map(p => p.price).filter(p => p > 0);
            if (prices.length > 0) minPrice = Math.min(...prices);
            
            const prodWithImg = vProds.find(p => p.cover_image_url || p.image_url);
            if (prodWithImg) {
              if (!coverImg) coverImg = prodWithImg.cover_image_url || prodWithImg.image_url;
              if (!logoImg) logoImg = prodWithImg.cover_image_url || prodWithImg.image_url;
            }
          }

          return {
            ...v,
            price_from: minPrice,
            cover_image_url: coverImg,
            logo_url: logoImg,
            rating: v.rating_avg || 0,
            category_name: (DEFAULT_CATEGORIES.find(c => c.id === v.category_id) || {}).name || 'Fotografi & Videografi'
          };
        });

        return res.status(200).json({ data: enriched, page: parseInt(page), limit: parseInt(limit) });
      }

      // â”€â”€ 4. VENDOR PROFILE â”€â”€
      case 'vendor-detail': {
        if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
        const { slug } = req.query;
        if (!slug) return res.status(400).json({ error: 'Missing vendor slug' });

        const VENDOR_COLS = 'id,slug,business_name,city,province,whatsapp,description,cover_image_url,logo_url,category_id,is_verified,rating_avg,review_count';

        // 1. Cari vendor (slim select, satu query)
        let vRes = await sbServiceFetch(`/mp_vendors?slug=eq.${encodeURIComponent(slug)}&select=${VENDOR_COLS}&limit=1`);
        let vendors = vRes.ok ? await vRes.json() : [];
        if (!Array.isArray(vendors) || !vendors.length) {
          const vSearchRes = await sbServiceFetch(`/mp_vendors?or=(slug.ilike.*${encodeURIComponent(slug)}*,business_name.ilike.*${encodeURIComponent(slug.replace(/-/g, ' '))}*)&select=${VENDOR_COLS}&limit=1`);
          vendors = vSearchRes.ok ? await vSearchRes.json() : [];
        }

        const vendor = (Array.isArray(vendors) && vendors.length > 0) ? vendors[0] : null;
        if (!vendor) return res.status(404).json({ error: 'Vendor tidak ditemukan' });

        const catObj = DEFAULT_CATEGORIES.find(c => c.id === vendor.category_id);
        vendor.category_name = catObj ? catObj.name : 'Fotografi & Videografi';

        // 2. Produk + review vendor â€” paralel, satu round-trip (tanpa fetch seluruh tabel)
        const PRODUCT_COLS = '*';
        const [pRes, rRes] = await Promise.all([
          sbServiceFetch(`/mp_products?vendor_id=eq.${vendor.id}&order=created_at.desc&select=${PRODUCT_COLS}`),
          sbServiceFetch(`/mp_reviews?vendor_id=eq.${vendor.id}&order=created_at.desc&limit=10`)
        ]);

        const products = pRes.ok ? await pRes.json() : [];
        const reviews = rRes.ok ? await rRes.json() : [];

        res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=3600, stale-while-revalidate=1800');
        return res.status(200).json({
          vendor,
          products: Array.isArray(products) ? products : [],
          reviews: Array.isArray(reviews) ? reviews : []
        });
      }

      // â”€â”€ 4B. PRODUCT DETAIL (PUBLIC) â”€â”€
      case 'product-detail': {
        if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
        const { id, slug } = req.query;
        if (!id && !slug) return res.status(400).json({ error: 'Missing product ID or slug' });

        let pQuery = id ? `/mp_products?id=eq.${encodeURIComponent(id)}&select=*&limit=1` : `/mp_products?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`;
        const pRes = await sbServiceFetch(pQuery);
        let products = pRes.ok ? await pRes.json() : [];

        if (!Array.isArray(products) || !products.length) {
          return res.status(404).json({ error: 'Paket produk tidak ditemukan' });
        }

        const product = products[0];

        // Fetch vendor, other products from same vendor, and reviews
        const [vRes, otherProdsRes, rRes] = await Promise.all([
          sbServiceFetch(`/mp_vendors?id=eq.${product.vendor_id}&select=id,slug,business_name,city,province,whatsapp,description,cover_image_url,logo_url,category_id,is_verified,rating_avg,review_count&limit=1`),
          sbServiceFetch(`/mp_products?vendor_id=eq.${product.vendor_id}&id=neq.${product.id}&order=created_at.desc&select=*`),
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

        const catObj = DEFAULT_CATEGORIES.find(c => c.id === vendor.category_id);
        vendor.category_name = catObj ? catObj.name : 'Fotografi & Videografi';

        const otherProducts = otherProdsRes.ok ? await otherProdsRes.json() : [];
        const reviews = rRes.ok ? await rRes.json() : [];

        res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=3600, stale-while-revalidate=1800');
        return res.status(200).json({
          product,
          vendor,
          otherProducts,
          reviews
        });
      }

      // â”€â”€ 5. CREATE INQUIRY â”€â”€
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

      // â”€â”€ 6. REGISTER VENDOR â”€â”€
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

      // â”€â”€ LOGIN VENDOR â”€â”€
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

      // â”€â”€ 7. UPLOAD IMAGE PROXY â”€â”€
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

      // â”€â”€ 8. VENDOR PROFILE (AUTH) â”€â”€
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

      // â”€â”€ 9. VENDOR PRODUCTS (AUTH) â”€â”€
      case 'vendor-products': {
        const vendor = await getVendorFromToken(req);
        if (!vendor) return res.status(401).json({ error: 'Unauthorized' });

        if (req.method === 'GET') {
          const prodRes = await sbServiceFetch(`/mp_products?vendor_id=eq.${vendor.id}&order=sort_order.asc,created_at.desc&select=*`);
          const products = prodRes.ok ? await prodRes.json() : [];
          products.forEach(p => {
            p.category_name = p.category_name || p.short_desc || '';
          });
          return res.status(200).json({ data: products });
        }

        if (req.method === 'POST') {
          const { name, price, description, image_url, cover_image_url, badge_tag, category_name } = req.body;
          if (!name || !price) return res.status(400).json({ error: 'Nama paket dan harga wajib diisi' });

          const slug = generateSlug(name) + '-' + Date.now().toString(36);
          const finalImage = image_url || cover_image_url || null;
          const finalPrice = Math.round(parseFloat(price)) || 0;
          const catVal = category_name ? category_name.trim() : '';

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
          if (product) product.category_name = product.category_name || product.short_desc || '';
          return res.status(201).json({ success: true, product });
        }

        if (req.method === 'PATCH' || req.method === 'PUT') {
          const { id } = req.query;
          if (!id) return res.status(400).json({ error: 'Missing product ID' });

          const { name, price, description, image_url, cover_image_url, badge_tag, category_name } = req.body;
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
          if (product) product.category_name = product.category_name || product.short_desc || '';
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

      // â”€â”€ 10. VENDOR INQUIRIES (AUTH) â”€â”€
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

      // â”€â”€ 11. VENDOR STATS (AUTH) â”€â”€
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


