# 04 — Skeleton, Image Loading & Performance Canon

> Sumber: `instant-skeleton-loading/SKILL.md`, `animations.css:27`, `sw.js`, `offline-db.js`, `api/*.js` Promise.all, audit marketplace/vendor-dashboard

## 4.1 Shimmer Skeleton — detik 0 (wajib untuk semua data page)

**Prinsip:** 0ms skeleton → ~120ms teks dari Supabase → 1–3s gambar async background. Jangan `Loading...` mentah.

```css
@keyframes shimmerPulse{ 0%{background-position:-200% 0} 100%{background-position:200% 0} }
.img-skeleton-container{ position:relative; overflow:hidden; background:#F2EFEA; }
.img-skeleton-container::before{
  content:''; position:absolute; inset:0;
  background: linear-gradient(90deg, rgba(242,239,234,0.4) 0%, rgba(255,255,255,0.9) 50%, rgba(242,239,234,0.4) 100%);
  background-size:200% 100%; animation: shimmerPulse 1.4s ease-in-out infinite; z-index:1; pointer-events:none;
  transition: opacity 0.4s ease;
}
.img-skeleton-container.img-loaded::before{ opacity:0; animation:none; }
.async-img{ opacity:0; transition: opacity 0.45s cubic-bezier(0.4,0,0.2,1); }
.async-img.img-loaded{ opacity:1; }
```

**Skeleton generator (detik 0):**

```html
<h1 id="vendorName"><div class="img-skeleton-container" style="width:220px;height:28px;border-radius:6px;display:inline-block"></div></h1>
```

```js
function renderSkeletons(containerId, count=6){
  const c = document.getElementById(containerId);
  if(!c) return;
  let html='';
  for(let i=0;i<count;i++){
    html+= `<div class="card-skeleton" style="background:#fff;border-radius:20px;padding:20px;display:flex;flex-direction:column;align-items:center;text-align:center">
      <div class="img-skeleton-container" style="width:160px;height:160px;border-radius:50%;margin-bottom:16px;flex-shrink:0"></div>
      <div class="img-skeleton-container" style="width:140px;height:20px;border-radius:8px;margin-bottom:8px"></div>
      <div class="img-skeleton-container" style="width:100px;height:14px;border-radius:6px;margin-bottom:6px"></div>
      <div class="img-skeleton-container" style="width:80px;height:12px;border-radius:6px;margin-bottom:16px"></div>
      <div class="img-skeleton-container" style="width:100%;height:40px;border-radius:12px;margin-top:auto"></div>
    </div>`;
  }
  c.innerHTML = html;
}
async function loadData(){
  renderSkeletons('dataGrid', 6); // detik 0
  const res = await fetch('/api/data-endpoint'); // <150ms via Promise.all di backend
  const json = await res.json();
  if(json.data) renderRealCards(json.data); // teks langsung tampil, gambar async
}
```

## 4.2 Async Progressive Image (per-elemen, parallel)

```js
function renderAsyncImage(imgUrl, altText){
  if(!imgUrl) return `<div style="font-size:2rem;font-weight:800;color:var(--primary)">V</div>`;
  return `<div class="img-skeleton-container" style="width:100%;height:100%">
    <img src="${imgUrl}" alt="${altText}" class="async-img" style="width:100%;height:100%;object-fit:cover"
         loading="lazy" decoding="async"
         onload="this.classList.add('img-loaded'); this.parentElement.classList.add('img-loaded')"
         onerror="this.style.display='none'; this.parentElement.classList.add('img-loaded')">
  </div>`;
}
```

- `loading="lazy"` + `decoding="async"` = parallel, tidak block render.
- Drive thumbs: `https://drive.google.com/thumbnail?id=X&sz=w200` (avatar 200) / `w800` / `w1280` vs `export=download` — jangan full-res untuk grid.
- `img{max-width:100%; display:block}` — cegah CLS.

## 4.3 Backend paralel (<120ms)

```js
// ❌ sequential 1.5–2.5s
// const v = await sbFetch('/mp_vendors'); const p = await sbFetch('/mp_products');

// ✅ parallel <120ms — canon di api/mp*.js
const [vRes, pRes] = await Promise.all([
  sbFetch('/mp_vendors?select=*'),
  sbFetch('/mp_products?select=*')
]);
const vendors = vRes.ok ? await vRes.json() : [];
```

Tambah `?select=*&with_count=true` untuk count tanpa N+1, dan `apiCache` di frontend:

```js
// apiCache 5m — marketplace canon
function apiCacheGet(key, ttlMs=5*60*1000){
  try{ const item=JSON.parse(localStorage.getItem('api-cache:'+key)); if(item && Date.now()-item.t < ttlMs) return item.d; }catch(_){}
  return null;
}
function apiCacheSet(key, data){ localStorage.setItem('api-cache:'+key, JSON.stringify({t:Date.now(), d:data})); }
```

## 4.4 PWA Service Worker (v5 / 4.1.0)

```js
// sw.js — precache 12 lokal saja (CDN tidak di-cache — supply chain risk)
const CACHE_NAME='sapatamu-pwa-v5'; const CACHE_VERSION='4.1.0';
const PRECACHE_ASSETS=['./','./index.html','./formulir_tamu.html','./checkin.html','./onsite.html','./welcome.html','./sortir.html','./offline-db.js','./sync-engine.js','./animations.css','./subdomain_resolver.js','./config.js','./manifest.json'];
self.addEventListener('install', e=>{ e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(PRECACHE_ASSETS).catch(()=>Promise.allSettled(PRECACHE_ASSETS.map(u=>c.add(u).catch(()=>null)))))); self.skipWaiting(); });
self.addEventListener('activate', e=>{ e.waitUntil(caches.keys().then(ns=>Promise.all(ns.filter(n=>n!==CACHE_NAME).map(n=>caches.delete(n))))); self.clients.claim(); });
self.addEventListener('fetch', e=>{
  const url=new URL(e.request.url);
  if(!url.protocol.startsWith('http')) return;
  if(url.origin!==self.location.origin) return; // cross-origin bypass — Drive/Supabase/CDN native
  if(e.request.mode==='navigate' || e.request.headers.get('accept')?.includes('text/html')){
    e.respondWith(fetch(e.request).then(r=>{ if(r.ok) caches.open(CACHE_NAME).then(c=>c.put(e.request, r.clone())); return r; }).catch(()=>caches.match(e.request).then(r=>r||caches.match('./formulir_tamu.html'))));
  } else {
    e.respondWith(caches.match(e.request).then(r=> r ? (fetch(e.request).then(n=>{ if(n.ok) caches.open(CACHE_NAME).then(c=>c.put(e.request, n.clone())); return r; }).catch(()=>r), r) : fetch(e.request)));
  }
});
```

- Navigations: network-first → cache → `formulir_tamu.html` fallback.
- Assets: cache-first + background revalidate.
- `CACHE_IMAGES` message: allowlist `supabase/sapatamu/googleapis/gstatic/youtube`, limit 50.

## 4.5 Animasi canon + stagger reveal

Dari `animations.css:6` + `animations.js:1` (anime.js 4.5.0):

```css
/* Tokens sudah di 00-canon-tokens.md */
```

```js
// Hero timeline — inOutExpo
if(window.anime && !matchMedia('(prefers-reduced-motion: reduce)').matches){
  const {animate, createTimeline, stagger}=window.anime;
  const tl=createTimeline({defaults:{ease:'inOutExpo'}});
  tl.add('.hero-badge',{opacity:[0,1], translateY:[12,0], duration:500})
    .add('.hero h1',{opacity:[0,1], translateY:[26,0], duration:800},'-=350')
    .add('.hero-subtitle',{opacity:[0,1], translateY:[18,0], duration:700},'-=600')
    .add('.hero-search',{opacity:[0,1], translateY:[22,0], duration:700},'-=550');
  function staggerReveal(gridSel, itemSel){
    document.querySelectorAll(gridSel).forEach(grid=>{
      let played=false;
      const play=()=>{ if(played) return; played=true;
        const items=grid.querySelectorAll(itemSel+':not(.skeleton)');
        if(!items.length) return;
        animate(items,{opacity:[0,1], translateY:[24,0], ease:'outCubic', duration:650, delay:stagger(70)});
      };
      const io=new IntersectionObserver(es=>{ es.forEach(e=>{ if(e.isIntersecting){ play(); io.disconnect(); }}); },{threshold:0.12});
      io.observe(grid);
      new MutationObserver(()=>{ if(grid.querySelectorAll(itemSel+':not(.skeleton)').length){ play(); io.disconnect();}}).observe(grid,{childList:true});
    });
  }
  staggerReveal('.kategori-grid','.kategori-card');
  staggerReveal('.kota-grid','.kota-card');
  staggerReveal('.vendor-grid','.vendor-card');
}
```

Gunakan `content-visibility:auto; contain-intrinsic-size:44px; contain:layout style paint` untuk long lists (details-row).

## 4.6 Tailwind build (hindari double-load SLOP)

Canon: **satu pipeline** — jangan `cdn.tailwindcss.com` di 80% pages + `assets/tailwind.css` fallback bareng.

```css
/* assets/tailwind.input.css */
@tailwind base; @tailwind components; @tailwind utilities;
```
```js
// tailwind.config.js — perbaiki content glob
module.exports = { content: ["./*.html","./assets/**/*.js","./lib/**/*.js"], theme:{extend:{}}, corePlugins:{preflight:false} }
// build: tailwindcss -i ./assets/tailwind.input.css -o ./assets/tailwind.css --minify
// watch: tailwindcss -i ./assets/tailwind.input.css -o ./assets/tailwind.css --watch
```

`preflight:false` disengaja — hindari reset clash dengan CSS custom canon. Jangan ubah tanpa audit.

## 4.7 Perf checklist (copy ke PR)

- [ ] Detik 0 skeleton shimmer tampil (tanpa Loading...)
- [ ] ~120ms teks terisi, layout tidak shift (CLS <0.1 — width/height atau aspect-ratio declared)
- [ ] 1–2s gambar fade-in 450ms per elemen, parallel
- [ ] `Promise.all` backend, bukan sequential
- [ ] `loading="lazy" decoding="async"` + `onerror` handler
- [ ] SW precache 12, network-first navigations, cache-first assets, cross-origin bypass
- [ ] Fonts `display:swap`, preload hanya critical 400/700
- [ ] `content-visibility:auto` untuk list panjang
