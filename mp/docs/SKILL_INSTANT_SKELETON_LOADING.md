# ⚡ Skill: Instant Skeleton Loading & Async Progressive Image Shimmer

Panduan lengkap dan standar arsitektur UI/UX untuk menerapkan **Instant Data Hydration (<150ms)** dan **Async Progressive Image Loading** menggunakan efek *running grey shimmer*.

Metode ini memisahkan pemuatan data teks tercepat (Supabase) dengan pemuatan gambar lambat (Google Apps Script / Drive / CDN), sehingga tampilan halaman terasa **sangat cepat, responsif, dan bebas dari delay coldstart (blank page)**.

---

## 🎯 Manfaat Arsitektur & Prinsip Utama

1. **Perceived Performance Super Cepat (0ms Delay)**: Komponen dan balok skeleton langsung tampil di detik ke-0 saat pengguna pertama kali membuka halaman (tanpa teks mentah "Loading...").
2. **Instant Text Hydration (<120ms)**: Teks (Nama Vendor, Harga, Lokasi, Deskripsi) langsung di-inject dari Supabase dan muncul di layar dalam **~120ms**.
3. **Tanpa Blocking Coldstart**: Foto/gambar yang membutuhkan waktu 1-3 detik dari Google Drive / GAS di-load secara *background async*.
4. **Smooth UI Transition**: Efek animasi *grey shimmer* memudar halus (*fade-in 450ms*) setelah gambar selesai di-load.

---

## 🛠️ Standar Implementasi 4-Langkah

### Langkah 1: Tambahkan CSS Animasi Shimmer & Async Image Class

Salin CSS ini ke dalam tag `<style>` pada halaman target:

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

---

### Langkah 2: Set Skeleton Container pada HTML Awal (Detik ke-0) & Fungsi Skeleton JS

**A. HTML awal tanpa teks "Loading...":**
```html
<!-- ❌ HINDARI: Teks mentah yang kedip -->
<!-- <h1 id="vendorName">Loading Vendor...</h1> -->

<!-- ✅ GUNAKAN: Container Skeleton Shimmer Instan -->
<h1 id="vendorName">
  <div class="img-skeleton-container" style="width:220px;height:28px;border-radius:6px;display:inline-block"></div>
</h1>
```

**B. Fungsi Skeleton Generator JS:**
```javascript
function renderSkeletons(containerId, count = 6) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="card-skeleton" style="background:#ffffff;border-radius:20px;padding:20px;display:flex;flex-direction:column;align-items:center;text-align:center">
        <!-- Skeleton Foto Avatar / Cover -->
        <div class="img-skeleton-container" style="width:160px;height:160px;border-radius:50%;margin-bottom:16px;flex-shrink:0"></div>
        <!-- Skeleton Judul Teks -->
        <div class="img-skeleton-container" style="width:140px;height:20px;border-radius:8px;margin-bottom:8px"></div>
        <!-- Skeleton Subtitle / Kategori -->
        <div class="img-skeleton-container" style="width:100px;height:14px;border-radius:6px;margin-bottom:6px"></div>
        <!-- Skeleton Lokasi -->
        <div class="img-skeleton-container" style="width:80px;height:12px;border-radius:6px;margin-bottom:16px"></div>
        <!-- Skeleton Tombol Aksi -->
        <div class="img-skeleton-container" style="width:100%;height:40px;border-radius:12px;margin-top:auto"></div>
      </div>
    `;
  }
  container.innerHTML = html;
}

async function loadData() {
  // 1. Tampilkan Skeleton Segera (Detik ke-0)
  renderSkeletons('dataGrid', 6);
  
  // 2. Fetch API Data (Sub-150ms Response)
  try {
    const res = await fetch('/api/data-endpoint');
    const json = await res.json();
    if (json.data) {
      // 3. Ganti Skeleton dengan Data Asli & Teks Langsung Muncul
      renderRealCards(json.data);
    }
  } catch(e) {
    console.error('Failed loading data:', e);
  }
}
```

---

### Langkah 3: Render Gambar secara Asynchronous dengan Event `onload` & `onerror`

Saat membuat element `<img>` pada template string JS, bungkus dengan `.img-skeleton-container` dan tambahkan handler event `onload` & `onerror`:

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
           onload="this.classList.add('img-loaded'); this.parentElement.classList.add('img-loaded')"
           onerror="this.style.display='none'; this.parentElement.classList.add('img-loaded')">
    </div>
  `;
}
```

---

### Langkah 4: Optimasi API Backend Serverless dengan `Promise.all()` (<120ms)

Pada endpoint backend Vercel/Node.js (`api/mp.js`), pastikan query ke Supabase dijalankan secara **paralel**:

```javascript
// ❌ HINDARI: Eksekusi berurutan (Menyebabkan delay 1.5 - 2.5 detik)
// const vRes = await sbFetch('/mp_vendors');
// const pRes = await sbFetch('/mp_products');

// ✅ GUNAKAN: Eksekusi Paralel (Hanya butuh <120ms)
const [vRes, pRes] = await Promise.all([
  sbFetch('/mp_vendors?select=*'),
  sbFetch('/mp_products?select=*')
]);

const vendors = vRes.ok ? await vRes.json() : [];
const products = pRes.ok ? await pRes.json() : [];

return res.status(200).json({ data: vendors });
```

---

## 📌 Checklist Pengujian Kualitas UI/UX

- [x] Detik ke-0: Kartu skeleton grey shimmer langsung muncul di layar (bebas dari tulisan "Loading...").
- [x] Detik ke-0.1 (~120ms): Data teks (Nama, Harga, Kategori, Lokasi) langsung terisi dan tampil seketika tanpa merusak tata letak.
- [x] Detik ke 1-2: Foto/gambar selesai dimuat di background dan memudar halus (*fade-in*).
- [x] Penanganan Error: Jika URL gambar mati/error, shimmer memudar dan menyembunyikan gambar tanpa merusak layout.

---
*Dokumentasi ini dapat diterapkan di seluruh halaman baru (Guestbook, Portfolio, Sortir, Dashboard, dll).*
