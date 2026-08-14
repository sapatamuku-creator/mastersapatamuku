// Vercel Middleware (edge) — preview dinamis untuk crawler sosial di /invitation,
// /vendor/:slug, /vendor-product, dan /product/:id.
// Pengunjung manusia tetap dilayani file statis (cepat + ter-cache); hanya bot
// (WhatsApp/Facebook/Telegram/dll) yang mendapat HTML dengan meta OG per-wedding / per-vendor.
import {
  resolveWeddingData,
  buildOgMeta,
  injectOgMeta,
  ensureOgMeta,
  resolveVendorBySlug,
  resolveProductById,
  buildVendorOgMeta,
  buildProductOgMeta
} from './lib/og-shared.js';

// UA crawler media sosial & mesin pencari (untuk link preview)
const BOT_RE = /whatsapp|facebook|facebot|twitterbot|telegrambot|slackbot|linkedinbot|viber|snapchat|skypeuripreview|discordbot|vkshare|pinterest|googlebot|bingbot|duckduckbot|yandex|baiduspider|applebot|line|instagram|outbrain|embedly|quora|mastodon|tumblr|slack/i;

const SAFETY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://cdn.jsdelivr.net https://unpkg.com https://cdn.tailwindcss.com https://fonts.googleapis.com https://*.supabase.co https://script.google.com https://script.googleusercontent.com https://app.sandbox.midtrans.com https://app.midtrans.com; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdn.tailwindcss.com; font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com https://cdn.jsdelivr.net data:; img-src 'self' data: blob: https: https://img.icons8.com https://lh3.googleusercontent.com https://drive.google.com https://drive.usercontent.google.com https://*.googleusercontent.com; media-src 'self' blob: data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://script.google.com https://script.googleusercontent.com https://cdn.jsdelivr.net https://cdn.tailwindcss.com https://fonts.googleapis.com https://fonts.gstatic.com https://img.icons8.com https://lh3.googleusercontent.com https://drive.google.com https://drive.usercontent.google.com https://*.googleusercontent.com https://api.qrserver.com https://api.midtrans.com https://api.sandbox.midtrans.com https://app.midtrans.com https://app.sandbox.midtrans.com https://*.fonnte.com https://api.fonnte.com https://www.emsifa.com https://emsifa.github.io https://raw.githubusercontent.com; frame-src 'self' blob: https: https://*.sapatamu.id https://sapatamu.id; frame-ancestors 'self' https://*.sapatamu.id https://sapatamu.id;",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

export default async function middleware(request) {
  const reqUrl = new URL(request.url);
  const pathname = reqUrl.pathname;

  // Hanya picu untuk path undangan, vendor, dan produk
  const isInvitation = pathname === '/invitation' || pathname === '/invitation.html';
  const vendorMatch = pathname.match(/^\/vendor\/([a-z0-9-]+)$/i);
  const prodPathMatch = pathname.match(/^\/product\/([^/]+)$/i);
  const isProductPage = pathname === '/vendor-product' || pathname === '/vendor-product.html';
  if (!isInvitation && !vendorMatch && !prodPathMatch && !isProductPage) return;

  // Guard loop: fetch internal salinan file statis memakai query ini
  if (reqUrl.searchParams.get('og-static')) return;

  const ua = request.headers.get('user-agent') || '';
  if (!BOT_RE.test(ua)) return;

  const botHeaders = {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, max-age=300',
    ...SAFETY_HEADERS
  };

  try {
    // ── Halaman vendor (/vendor/:slug) ──
    if (vendorMatch) {
      const vendor = await resolveVendorBySlug(decodeURIComponent(vendorMatch[1]));
      if (!vendor) return;
      const meta = buildVendorOgMeta(vendor);
      const copy = await fetch(`${reqUrl.origin}/vendor-profile.html?og-static=1`);
      if (!copy.ok) return;
      return new Response(ensureOgMeta(await copy.text(), meta), {
        status: 200,
        headers: botHeaders
      });
    }

    // ── Halaman detail produk (/vendor-product?id=… atau /product/:id) ──
    const productId = prodPathMatch
      ? decodeURIComponent(prodPathMatch[1])
      : reqUrl.searchParams.get('id');
    if (isProductPage || prodPathMatch) {
      if (!productId) return;
      let found = await resolveProductById(productId);
      if (!found) {
        // Fallback: lewat API publik (service key) bila RLS/env menghalangi baca langsung
        try {
          const apiRes = await fetch(`${reqUrl.origin}/api/mp/product-detail?id=${encodeURIComponent(productId)}`);
          if (apiRes.ok) {
            const apiJson = await apiRes.json();
            if (apiJson && apiJson.product) found = { product: apiJson.product, vendor: apiJson.vendor || null };
          }
        } catch (e2) { /* biarkan null → pakai meta statis */ }
      }
      if (!found) return;
      const meta = buildProductOgMeta(found.product, found.vendor);
      const copy = await fetch(`${reqUrl.origin}/vendor-product.html?og-static=1`);
      if (!copy.ok) return;
      return new Response(ensureOgMeta(await copy.text(), meta), {
        status: 200,
        headers: botHeaders
      });
    }

    // ── Halaman undangan (/invitation) ──
    const hostParts = (request.headers.get('host') || '').split(':')[0].split('.');
    const sub = (hostParts.length >= 3 && hostParts[0] !== 'www') ? hostParts[0] : null;
    if (!sub || !/^[a-z0-9-]{3,50}$/i.test(sub)) return;

    const data = await resolveWeddingData(sub);
    if (!data) return;

    const guestName = reqUrl.searchParams.get('u') || '';
    const meta = buildOgMeta(data, guestName);

    // Ambil salinan file statis (query og-static = bypass middleware → tanpa loop)
    const copy = await fetch(`${reqUrl.origin}/invitation.html?og-static=1`);
    if (!copy.ok) return;

    const html = injectOgMeta(await copy.text(), meta);

    return new Response(html, {
      status: 200,
      headers: botHeaders
    });
  } catch (e) {
    // Gagal apa pun → biarkan routing normal (file statis)
    return;
  }
}

export const config = {
  matcher: ['/invitation', '/invitation.html', '/vendor/:slug*', '/vendor-product', '/vendor-product.html', '/product/:id*']
};