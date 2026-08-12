// api/marketplace.js
// Consolidated Serverless Function for Sapatamu Marketplace (Vercel Hobby 12-Function Limit Optimization)

import { sbFetch, sbServiceFetch, setCors, handleOptions, normalizeWA, generateSlug } from '../lib/mp-config.js';

const SB_URL = 'https://llrapesaaoliyjrrrsjh.supabase.co';

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

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  setCors(res);

  const endpoint = req.query.endpoint || (req.url.split('?')[0].split('/').pop());

  try {
    switch (endpoint) {
      // ── 1. CATEGORIES ──
      case 'categories': {
        if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
        const catRes = await sbFetch(`/mp_categories?is_active=eq.true&order=sort_order.asc&select=id,name,slug,icon,description`);
        if (!catRes.ok) return res.status(502).json({ error: 'Database error' });
        const categories = await catRes.json();

        if (req.query.with_count === 'true') {
          const countRes = await sbFetch(`/mp_vendors?is_active=eq.true&select=category_id`);
          if (countRes.ok) {
            const vendors = await countRes.json();
            const countMap = vendors.reduce((acc, v) => {
              acc[v.category_id] = (acc[v.category_id] || 0) + 1;
              return acc;
            }, {});
            return res.status(200).json(categories.map(c => ({ ...c, vendor_count: countMap[c.id] || 0 })));
          }
        }
        res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
        return res.status(200).json(categories);
      }

      // ── 2. VENDORS BROWSE ──
      case 'vendors': {
        if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
        const {
          kategori, provinsi, kota, kecamatan, min_price, max_price,
          rating, verified, sort = 'rating_avg',
          order = 'desc', page = '1', limit = '16', q
        } = req.query;

        const pageNum  = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(48, Math.max(1, parseInt(limit) || 16));
        const offset   = (pageNum - 1) * limitNum;

        const allowedSort = ['rating_avg', 'created_at', 'view_count', 'price_from'];
        const sortCol  = allowedSort.includes(sort) ? sort : 'rating_avg';
        const sortDir  = order === 'asc' ? 'asc' : 'desc';

        let path = `/mp_vendor_public?select=*`;
        if (kategori) path += `&category_slug=eq.${encodeURIComponent(kategori)}`;
        if (provinsi) path += `&province=ilike.${encodeURIComponent(`%${provinsi}%`)}`;
        if (kota) path += `&city=ilike.${encodeURIComponent(`%${kota}%`)}`;
        if (kecamatan) path += `&city=ilike.${encodeURIComponent(`%${kecamatan}%`)}`;
        if (rating) path += `&rating_avg=gte.${parseFloat(rating)}`;
        if (verified === 'true') path += `&is_verified=eq.true`;
        if (min_price) path += `&price_from=gte.${parseInt(min_price)}`;
        if (max_price) path += `&price_from=lte.${parseInt(max_price)}`;

        if (q) {
          const cleanQ = encodeURIComponent(`%${q.trim()}%`);
          path += `&or=(business_name.ilike.${cleanQ},category_name.ilike.${cleanQ},city.ilike.${cleanQ},province.ilike.${cleanQ},description.ilike.${cleanQ})`;
        }

        path += `&order=${sortCol}.${sortDir}&limit=${limitNum}&offset=${offset}`;

        const dataRes = await sbFetch(path, { headers: { 'Prefer': 'count=exact' } });
        if (!dataRes.ok) return res.status(502).json({ error: 'Database error' });

        const data  = await dataRes.json();
        const total = parseInt(dataRes.headers.get('content-range')?.split('/')[1] || '0');

        return res.status(200).json({
          data,
          pagination: { page: pageNum, limit: limitNum, total, total_pages: Math.ceil(total / limitNum) }
        });
      }

      // ── 3. VENDOR DETAIL ──
      case 'vendor-detail': {
        if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
        const { slug } = req.query;
        if (!slug) return res.status(400).json({ error: 'Parameter "slug" wajib diisi' });

        const vendorRes = await sbFetch(`/mp_vendor_public?slug=eq.${encodeURIComponent(slug)}&limit=1`);
        if (!vendorRes.ok) return res.status(502).json({ error: 'Database error' });
        const vendors = await vendorRes.json();
        if (!vendors.length) return res.status(404).json({ error: 'Vendor tidak ditemukan' });

        const vendor = vendors[0];
        sbFetch(`/rpc/mp_increment_view`, { method: 'POST', body: JSON.stringify({ p_vendor_id: vendor.id }) }).catch(() => {});

        const productsRes = await sbFetch(`/mp_products?vendor_id=eq.${vendor.id}&is_active=eq.true&order=sort_order.asc,price.asc&select=*`);
        const products = productsRes.ok ? await productsRes.json() : [];

        const reviewsRes = await sbFetch(`/mp_reviews?vendor_id=eq.${vendor.id}&status=eq.approved&order=created_at.desc&limit=10&select=*`);
        const reviews = reviewsRes.ok ? await reviewsRes.json() : [];

        return res.status(200).json({ vendor, products, reviews });
      }

      // ── 4. PRODUCT DETAIL ──
      case 'product-detail': {
        if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
        const { slug, id } = req.query;
        if (!slug && !id) return res.status(400).json({ error: 'Parameter "slug" atau "id" wajib diisi' });

        const filter = slug ? `slug=eq.${encodeURIComponent(slug)}` : `id=eq.${encodeURIComponent(id)}`;
        const prodRes = await sbFetch(`/mp_products?${filter}&is_active=eq.true&limit=1&select=*`);
        if (!prodRes.ok) return res.status(502).json({ error: 'Database error' });

        const products = await prodRes.json();
        if (!products.length) return res.status(404).json({ error: 'Produk tidak ditemukan' });
        const product = products[0];

        const vendorRes = await sbFetch(`/mp_vendor_public?id=eq.${product.vendor_id}&limit=1`);
        const vendors = vendorRes.ok ? await vendorRes.json() : [];
        const vendor = vendors[0] || null;

        let otherProducts = [];
        if (vendor) {
          const otherRes = await sbFetch(`/mp_products?vendor_id=eq.${vendor.id}&id=neq.${product.id}&is_active=eq.true&order=sort_order.asc&limit=4&select=*`);
          otherProducts = otherRes.ok ? await otherRes.json() : [];
        }

        return res.status(200).json({ product, vendor, otherProducts });
      }

      // ── 5. INQUIRY ──
      case 'inquiry': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
        const { vendor_id, product_id, client_name, client_whatsapp, client_email, event_date, guest_count, budget_range, message } = req.body;

        if (!vendor_id) return res.status(400).json({ error: 'vendor_id wajib diisi' });
        if (!client_name) return res.status(400).json({ error: 'Nama wajib diisi' });
        if (!client_whatsapp) return res.status(400).json({ error: 'Nomor WhatsApp wajib diisi' });

        const vendorRes = await sbFetch(`/mp_vendors?id=eq.${vendor_id}&is_active=eq.true&select=id,business_name,whatsapp&limit=1`);
        if (!vendorRes.ok) return res.status(502).json({ error: 'Database error' });

        const vendors = await vendorRes.json();
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
        const { business_name, category_id, city, province, owner_name, whatsapp, email, instagram, website, description, cover_image_url, logo_url } = req.body;

        if (!business_name || !category_id || !city || !province || !owner_name || !whatsapp || !email) {
          return res.status(400).json({ error: 'Field wajib belum diisi' });
        }

        let baseSlug = generateSlug(business_name);
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
          slug, business_name: business_name.trim(), category_id,
          city: city.trim(), province: province.trim(), owner_name: owner_name.trim(),
          whatsapp: normalizeWA(whatsapp), email: email.toLowerCase().trim(),
          ...(instagram && { instagram: instagram.replace(/^@/, '') }),
          ...(website && { website }),
          ...(description && { description: description.trim() }),
          ...(cover_image_url && { cover_image_url }),
          ...(logo_url && { logo_url }),
          is_active: false, is_verified: false, commission_rate: 5.00
        };

        const insertRes = await sbServiceFetch('/mp_vendors', {
          method: 'POST',
          body: JSON.stringify(insertPayload),
          headers: { 'Prefer': 'return=representation' }
        });

        if (!insertRes.ok) return res.status(502).json({ error: 'Gagal menyimpan vendor' });
        const [vendor] = await insertRes.json();
        return res.status(201).json({ success: true, vendor_id: vendor.id, slug: vendor.slug });
      }

      // ── 7. UPLOAD IMAGE PROXY ──
      case 'upload-image': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
        const { image, type, vendorId, filename } = req.body;
        if (!image || !type || !vendorId) return res.status(400).json({ error: 'Missing parameters' });

        const GAS_URL = process.env.GAS_MARKETPLACE_URL;
        if (!GAS_URL) return res.status(500).json({ error: 'GAS_MARKETPLACE_URL environment variable not configured' });

        const gasRes = await fetch(GAS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image, type, vendorId, filename: filename || `${vendorId}_${type}_${Date.now()}.webp` })
        });
        const data = await gasRes.json();
        return res.status(200).json(data);
      }

      // ── 8. VENDOR PROFILE (AUTH) ──
      case 'vendor-profile': {
        const user = await verifyAuth(req);
        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        const vendorRes = await sbFetch(`/mp_vendors?user_id=eq.${user.id}&select=*&limit=1`);
        if (!vendorRes.ok) return res.status(502).json({ error: 'Database error' });
        const vendors = await vendorRes.json();
        if (!vendors.length) return res.status(404).json({ error: 'Vendor tidak ditemukan' });
        const vendor = vendors[0];

        if (req.method === 'GET') return res.status(200).json({ vendor });
        if (req.method === 'PATCH') {
          const patchRes = await sbFetch(`/mp_vendors?id=eq.${vendor.id}&user_id=eq.${user.id}`, {
            method: 'PATCH', body: JSON.stringify(req.body), headers: { 'Prefer': 'return=representation' }
          });
          const [updated] = await patchRes.json();
          return res.status(200).json({ success: true, vendor: updated });
        }
        return res.status(405).json({ error: 'Method not allowed' });
      }

      // ── 9. VENDOR PRODUCTS (AUTH) ──
      case 'vendor-products': {
        const user = await verifyAuth(req);
        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        const vendorRes = await sbFetch(`/mp_vendors?user_id=eq.${user.id}&select=id&limit=1`);
        const vendors = vendorRes.ok ? await vendorRes.json() : [];
        if (!vendors.length) return res.status(404).json({ error: 'Vendor tidak ditemukan' });
        const vendorId = vendors[0].id;

        if (req.method === 'GET') {
          const prodRes = await sbFetch(`/mp_products?vendor_id=eq.${vendorId}&order=sort_order.asc,created_at.desc&select=*`);
          const products = prodRes.ok ? await prodRes.json() : [];
          return res.status(200).json({ data: products });
        }
        if (req.method === 'POST') {
          const insertRes = await sbFetch('/mp_products', {
            method: 'POST', body: JSON.stringify({ ...req.body, vendor_id: vendorId, is_active: true }),
            headers: { 'Prefer': 'return=representation' }
          });
          const [product] = await insertRes.json();
          return res.status(201).json({ success: true, product });
        }
        return res.status(405).json({ error: 'Method not allowed' });
      }

      // ── 10. VENDOR INQUIRIES (AUTH) ──
      case 'vendor-inquiries': {
        const user = await verifyAuth(req);
        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        const vendorRes = await sbFetch(`/mp_vendors?user_id=eq.${user.id}&select=id&limit=1`);
        const vendors = vendorRes.ok ? await vendorRes.json() : [];
        if (!vendors.length) return res.status(404).json({ error: 'Vendor tidak ditemukan' });
        const vendorId = vendors[0].id;

        if (req.method === 'GET') {
          const iqRes = await sbFetch(`/mp_inquiries?vendor_id=eq.${vendorId}&order=created_at.desc`);
          const inquiries = iqRes.ok ? await iqRes.json() : [];
          return res.status(200).json(inquiries);
        }
        return res.status(405).json({ error: 'Method not allowed' });
      }

      // ── 11. VENDOR STATS (AUTH) ──
      case 'vendor-stats': {
        const user = await verifyAuth(req);
        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        const vendorRes = await sbFetch(`/mp_vendors?user_id=eq.${user.id}&select=id&limit=1`);
        const vendors = vendorRes.ok ? await vendorRes.json() : [];
        if (!vendors.length) return res.status(404).json({ error: 'Vendor tidak ditemukan' });
        const vendorId = vendors[0].id;

        const statsRes = await sbFetch(`/mp_vendor_stats?vendor_id=eq.${vendorId}&select=*&limit=1`);
        const statsArr = statsRes.ok ? await statsRes.json() : [];
        const recentInqRes = await sbFetch(`/mp_inquiries?vendor_id=eq.${vendorId}&order=created_at.desc&limit=5&select=*`);

        return res.status(200).json({
          stats: statsArr[0] || {},
          recent_inquiries: recentInqRes.ok ? await recentInqRes.json() : []
        });
      }

      default:
        return res.status(404).json({ error: `Endpoint "${endpoint}" not found` });
    }
  } catch (err) {
    console.error(`[marketplace-api:${endpoint}] error:`, err.message);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
