const fs = require('fs');
const path = require('path');
import { resolveSortirEventBySlug, buildSortirOgMeta, injectOgMeta, ensureOgMeta } from '../lib/og-shared.js';

export default async function handler(req, res) {
  const { event, slug, id } = req.query;
  const targetSlug = event || slug || id || '';

  // Baca sortir.html
  const filePath = path.join(process.cwd(), 'sortir.html');
  let html = fs.readFileSync(filePath, 'utf8');

  // Pastikan asset relatif tetap mengarah ke root
  if (!html.includes('<base href="/">')) {
    html = html.replace(/<head>/i, '<head><base href="/">');
  }

  // Jika ada slug event, coba ambil data event dari Supabase untuk menyisipkan Open Graph dinamis
  if (targetSlug && /^[a-z0-9-_]+$/i.test(targetSlug)) {
    try {
      const eventData = await resolveSortirEventBySlug(targetSlug);
      if (eventData) {
        const meta = buildSortirOgMeta(eventData);
        html = ensureOgMeta(html, meta);
      }
    } catch (e) {
      console.error('[sortir-view OG error]:', e);
    }
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400');
  res.status(200).send(html);
}
