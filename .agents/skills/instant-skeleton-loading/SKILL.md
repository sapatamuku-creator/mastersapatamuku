---
name: instant-skeleton-loading
description: Standar arsitektur UI/UX Instant Data Hydration (<150ms) dan Async Progressive Image Loading dengan grey shimmer skeleton untuk halaman SapaTamu/Marketplace. Gunakan saat membangun atau memperbaiki loading state halaman apa pun (katalog vendor, dashboard, portfolio, sortir) yang memuat data Supabase + gambar Drive/GAS lambat, agar bebas coldstart blank dan teks "Loading..." mentah.
---

# Instant Skeleton Loading & Async Progressive Image Shimmer

Panduan standar menerapkan **Instant Data Hydration (<150ms)** dan **Async Progressive Image Loading** menggunakan efek *running grey shimmer*. Metode ini memisahkan pemuatan data teks tercepat (Supabase) dari pemuatan gambar lambat (GAS / Drive / CDN) sehingga halaman terasa cepat, responsif, dan bebas delay coldstart (blank page).

Sumber asli: `mp/docs/SKILL_INSTANT_SKELETON_LOADING.md`.

## Prinsip Utama

1. **Perceived Performance 0ms**: skeleton langsung tampil di detik ke-0, tanpa teks mentah "Loading...".
2. **Instant Text Hydration (~120ms)**: teks (nama vendor, harga, lokasi) terisi dari Supabase hampir seketika.
3. **Tanpa Blocking Coldstart**: gambar lambat (1–3 detik) di-load background async.
4. **Smooth Transition**: shimmer memudar halus (fade-in ~450ms) setelah tiap gambar siap.

## Proses Implementasi 4 Langkah

### Langkah 1 — CSS Shimmer & Async Image Class

Salin ke `<style>` halaman target:

```css
/* PROGRESSIVE ASYNC SHIMMER ANIMATION */
@keyframes shimmerPulse {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.img-skeleton-container {
  position: relative;
  overflow: hidden;
  background: #F2EFEA;
}

.img-skeleton-container::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(90deg, rgba(242,239,234,0.4) 0%, rgba(255,255,255,0.9) 50%, rgba(242,239,234,0.4) 100%);
  background-size: 200% 100%;
  animation: shimmerPulse 1.4s ease-in-out infinite;
  z-index: 1;
  pointer-events: none;
  transition: opacity 0.4s ease;
}

.img-skeleton-container.img-loaded::before {
  opacity: 0;
  animation: none;
}

.async-img {
  opacity: 0;
  transition: opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1);
}

.async-img.img-loaded {
  opacity: 1;
}
```

### Langkah 2 — Skeleton Container di Detik ke-0 + Generator JS

HTML awal tanpa teks "Loading...":

```html
<h1 id="vendorName">
  <div class="img-skeleton-container" style="width:220px;height:28px;border-radius:6px;display:inline-block"></div>
</h1>
```

Fungsi generator skeleton + pola load:

```javascript
function renderSkeletons(containerId, count = 6) {
  const container = document.getElementById(containerId);
  if (!container) return;
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="card-skeleton" style="background:#ffffff;border-radius:20px;padding:20px;display:flex;flex-direction:column;align-items:center;text-align:center">
        <div class="img-skeleton-container" style="width:160px;height:160px;border-radius:50%;margin-bottom:16px;flex-shrink:0"></div>
        <div class="img-skeleton-container" style="width:140px;height:20px;border-radius:8px;margin-bottom:8px"></div>
        <div class="img-skeleton-container" style="width:100px;height:14px;border-radius:6px;margin-bottom:6px"></div>
        <div class="img-skeleton-container" style="width:80px;height:12px;border-radius:6px;margin-bottom:16px"></div>
        <div class="img-skeleton-container" style="width:100%;height:40px;border-radius:12px;margin-top:auto"></div>
      </div>
    `;
  }
  container.innerHTML = html;
}

async function loadData() {
  renderSkeletons('dataGrid', 6);              // detik ke-0
  try {
    const res = await fetch('/api/data-endpoint'); // <150ms
    const json = await res.json();
    if (json.data) renderRealCards(json.data);   // teks langsung tampil
  } catch(e) {
    console.error('Failed loading data:', e);
  }
}
```

### Langkah 3 — Gambar Async per-Elemen (`loading="lazy"` + `decoding="async"`)

Bungkus setiap `<img>` dengan `.img-skeleton-container`, handler `onload`/`onerror` independen per gambar:

```javascript
function renderAsyncImage(imgUrl, altText) {
  if (!imgUrl) {
    return `<div style="font-size:2rem;font-weight:800;color:var(--primary)">V</div>`;
  }
  return `
    <div class="img-skeleton-container" style="width:100%;height:100%">
      <img src="${imgUrl}"
           alt="${altText}"
           class="async-img"
           style="width:100%;height:100%;object-fit:cover"
           loading="lazy"
           decoding="async"
           onload="this.classList.add('img-loaded'); this.parentElement.classList.add('img-loaded')"
           onerror="this.style.display='none'; this.parentElement.classList.add('img-loaded')">
    </div>
  `;
}
```

> **Arsitektur lazy & parallel**: dengan `loading="lazy"` + `decoding="async"` browser tidak menunggu semua foto selesai bersamaan — tiap foto yang siap dari Drive/GAS/Supabase tampil independen dan paralel tanpa menahan yang lain.

### Langkah 4 — Backend Serverless Paralel via `Promise.all()` (<120ms)

Di endpoint Vercel/Node (`api/mp.js` dsb.), jalankan query Supabase paralel:

```javascript
// ❌ HINDARI berurutan (delay 1.5–2.5 detik)
// ✅ GUNAKAN paralel (<120ms)
const [vRes, pRes] = await Promise.all([
  sbFetch('/mp_vendors?select=*'),
  sbFetch('/mp_products?select=*')
]);
const vendors = vRes.ok ? await vRes.json() : [];
const products = pRes.ok ? await pRes.json() : [];
return res.status(200).json({ data: vendors });
```

## Checklist Verifikasi

- [ ] Detik ke-0: kartu skeleton grey shimmer tampil instan (tanpa tulisan "Loading...").
- [ ] ~120ms: data teks (nama, harga, kategori, lokasi) terisi tanpa merusak layout.
- [ ] Detik 1–2: gambar selesai dimuat di background dan fade-in halus.
- [ ] Error handling: URL gambar mati → shimmer memudar, gambar disembunyikan, layout utuh.
- [ ] Responsif di 3 breakpoint (desktop ≥1024px, tablet 768–1023px, mobile <768px).

Berlaku untuk seluruh halaman baru (Marketplace, Guestbook, Portfolio, Sortir, Dashboard, dll).
