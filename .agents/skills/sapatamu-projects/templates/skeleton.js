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

// ──

function renderAsyncImage(imgUrl, altText){
  if(!imgUrl) return `<div style="font-size:2rem;font-weight:800;color:var(--primary)">V</div>`;
  return `<div class="img-skeleton-container" style="width:100%;height:100%">
    <img src="${imgUrl}" alt="${altText}" class="async-img" style="width:100%;height:100%;object-fit:cover"
         loading="lazy" decoding="async"
         onload="this.classList.add('img-loaded'); this.parentElement.classList.add('img-loaded')"
         onerror="this.style.display='none'; this.parentElement.classList.add('img-loaded')">
  </div>`;
}

// ──

// âŒ sequential 1.5â€“2.5s
// const v = await sbFetch('/mp_vendors'); const p = await sbFetch('/mp_products');

// âœ… parallel <120ms â€” canon di api/mp*.js
const [vRes, pRes] = await Promise.all([
  sbFetch('/mp_vendors?select=*'),
  sbFetch('/mp_products?select=*')
]);
const vendors = vRes.ok ? await vRes.json() : [];

// ──

// apiCache 5m â€” marketplace canon
function apiCacheGet(key, ttlMs=5*60*1000){
  try{ const item=JSON.parse(localStorage.getItem('api-cache:'+key)); if(item && Date.now()-item.t < ttlMs) return item.d; }catch(_){}
  return null;
}
function apiCacheSet(key, data){ localStorage.setItem('api-cache:'+key, JSON.stringify({t:Date.now(), d:data})); }

// ──

// sw.js â€” precache 12 lokal saja (CDN tidak di-cache â€” supply chain risk)
const CACHE_NAME='sapatamu-pwa-v5'; const CACHE_VERSION='4.1.0';
const PRECACHE_ASSETS=['./','./index.html','./formulir_tamu.html','./checkin.html','./onsite.html','./welcome.html','./sortir.html','./offline-db.js','./sync-engine.js','./animations.css','./subdomain_resolver.js','./config.js','./manifest.json'];
self.addEventListener('install', e=>{ e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(PRECACHE_ASSETS).catch(()=>Promise.allSettled(PRECACHE_ASSETS.map(u=>c.add(u).catch(()=>null)))))); self.skipWaiting(); });
self.addEventListener('activate', e=>{ e.waitUntil(caches.keys().then(ns=>Promise.all(ns.filter(n=>n!==CACHE_NAME).map(n=>caches.delete(n))))); self.clients.claim(); });
self.addEventListener('fetch', e=>{
  const url=new URL(e.request.url);
  if(!url.protocol.startsWith('http')) return;
  if(url.origin!==self.location.origin) return; // cross-origin bypass â€” Drive/Supabase/CDN native
  if(e.request.mode==='navigate' || e.request.headers.get('accept')?.includes('text/html')){
    e.respondWith(fetch(e.request).then(r=>{ if(r.ok) caches.open(CACHE_NAME).then(c=>c.put(e.request, r.clone())); return r; }).catch(()=>caches.match(e.request).then(r=>r||caches.match('./formulir_tamu.html'))));
  } else {
    e.respondWith(caches.match(e.request).then(r=> r ? (fetch(e.request).then(n=>{ if(n.ok) caches.open(CACHE_NAME).then(c=>c.put(e.request, n.clone())); return r; }).catch(()=>r), r) : fetch(e.request)));
  }
});

// ──

// Hero timeline â€” inOutExpo
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

// ──

// tailwind.config.js â€” perbaiki content glob
module.exports = { content: ["./*.html","./assets/**/*.js","./lib/**/*.js"], theme:{extend:{}}, corePlugins:{preflight:false} }
// build: tailwindcss -i ./assets/tailwind.input.css -o ./assets/tailwind.css --minify
// watch: tailwindcss -i ./assets/tailwind.input.css -o ./assets/tailwind.css --watch
