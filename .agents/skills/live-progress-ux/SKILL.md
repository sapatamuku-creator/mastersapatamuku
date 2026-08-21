---
name: live-progress-ux
description: Standar UI/UX untuk proses background, loading bertahap, sinkronisasi data, import/export, copy, dan batch deletion dengan visual progress deterministik, live telemetry counter (X dari Y), micro-yielding, dan tema SapaTamu (Warm Sand / Rose / Gold / Dark Brown).
---

# Live Progress & Telemetry UX Standard

Pedoman implementasi UX & UI untuk operasi pemrosesan data (sync, import, export, delete batch, duplicate merge, copy) di lingkungan SapaTamu agar user tidak hanya melihat spinner statis yang memicu rasa cemas (anxiety), melainkan progres deterministik dengan telemetri live realtime.

---

## 1. Prinsip UX Inti

1. **Determinate over Indeterminate**:
   - Jika jumlah data diketahui (misal: 150 tamu), **WAJIB** menampilkan angka progress: `Current / Total` dan persentase (`%`), bukan spinner berputar tanpa akhir.
2. **Main-Thread Non-Blocking (Micro-Yielding)**:
   - Setiap pemrosesan batch (per 5–25 item), wajib melakukan *micro-delay / yield* menggunakan `await new Promise(r => setTimeout(r, 0))` atau `requestAnimationFrame()` agar browser rendering engine dapat meng-update DOM secara halus tanpa freezing.
3. **Live Status Labeling**:
   - Berikan teks progres dinamis berdasarkan fase yang sedang berjalan:
     - *"Menyiapkan payload..."* → *"Memproses tamu ke-15 dari 120..."* → *"Memperbarui database lokal..."* → *"Selesai!"*
4. **Resilience & Cancellation UX**:
   - Jika proses gagal di tengah jalan, tampilkan item ke berapa yang gagal dan sediakan opsi **Coba Lagi (Retry)** dari titik kegagalan tersebut tanpa mengulang dari indeks 0.

---

## 2. Design System & Theme Integration (SapaTamu Warm Palette)

Komponen modal/card progress harus menggunakan token tema standar SapaTamu (`formulir_tamu.html`, `guestbook-shared.css`, `dashboard.html`):

```css
:root {
  --primary: #E07B7B;      /* Rose */
  --bg: #FFF9F5;           /* Warm White */
  --card: #FFFFFF;         /* Pure Card White */
  --text-main: #4A3F35;    /* Warm Dark Brown */
  --text-muted: #8C7560;   /* Warm Brown */
  --border: #F0E6DE;       /* Soft Sand Border */
  --gold: #C8962E;         /* Accent Gold */
}

/* ── Live Progress Overlay & Card ── */
.sapatamu-progress-overlay {
  position: fixed;
  inset: 0;
  background: rgba(74, 63, 53, 0.4);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  padding: 20px;
}

.sapatamu-progress-card {
  background: #FFFFFF;
  border: 1px solid var(--border);
  border-radius: 28px;
  padding: 32px 28px;
  width: 100%;
  max-width: 440px;
  box-shadow: 0 25px 50px -12px rgba(74, 63, 53, 0.18);
  text-align: center;
}

/* Smooth Animated Progress Bar */
.sapatamu-progress-track {
  width: 100%;
  height: 8px;
  background: var(--border);
  border-radius: 999px;
  overflow: hidden;
  margin: 18px 0 12px;
}

.sapatamu-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--gold) 0%, var(--primary) 100%);
  width: 0%;
  border-radius: 999px;
  transition: width 0.25s cubic-bezier(0.32, 0.72, 0, 1);
}

.sapatamu-telemetry-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 20px;
  background: #FDF8F4;
  border: 1px solid var(--border);
  font-size: 11px;
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: 0.5px;
}
```

---

## 3. Template HTML / DOM Component

```html
<div id="liveProgressOverlay" class="sapatamu-progress-overlay" style="display: none;">
  <div class="sapatamu-progress-card">
    <!-- Icon / Lottie / Animation -->
    <div class="w-12 h-12 mx-auto mb-4 rounded-2xl bg-amber-50 flex items-center justify-center text-[#C8962E]">
      <svg class="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
      </svg>
    </div>

    <h3 id="progressTitle" class="text-base font-extrabold text-[#4A3F35] tracking-tight">Memproses Data</h3>
    <p id="progressSubtitle" class="text-xs text-[#8C7560] font-medium mt-1">Mohon jangan menutup halaman ini...</p>

    <!-- Progress Track & Fill -->
    <div class="sapatamu-progress-track">
      <div id="progressBarFill" class="sapatamu-progress-fill"></div>
    </div>

    <!-- Live Telemetry Stats -->
    <div class="flex justify-between items-center mt-2">
      <span id="progressCountText" class="sapatamu-telemetry-badge">0 / 0 Data</span>
      <span id="progressPercentText" class="text-xs font-black text-[#C8962E]">0%</span>
    </div>

    <!-- Current Item Detail Stream -->
    <p id="progressCurrentItem" class="text-[10px] text-[#8C7560] font-semibold truncate mt-3 italic opacity-80">
      Menyiapkan antrean...
    </p>
  </div>
</div>
```

---

## 4. Reusable JavaScript Helper Pattern

Gunakan controller ini di halaman manapun (`formulir_tamu.html`, `dashboard.html`, `onsite.html`, dll.):

```javascript
/**
 * SapaTamu Live Progress Runner
 * @param {Array} items - Array data yang akan diproses
 * @param {Function} processor - async function(item, index)
 * @param {Object} options - { title, batchSize, delayMs }
 */
async function runWithLiveProgress(items, processor, options = {}) {
  const {
    title = 'Sinkronisasi Data',
    batchSize = 10,
    delayMs = 15 // micro delay to let UI repaint smoothly
  } = options;

  const overlay = document.getElementById('liveProgressOverlay');
  const titleEl = document.getElementById('progressTitle');
  const barFill = document.getElementById('progressBarFill');
  const countText = document.getElementById('progressCountText');
  const percentText = document.getElementById('progressPercentText');
  const itemText = document.getElementById('progressCurrentItem');

  if (titleEl) titleEl.textContent = title;
  if (overlay) overlay.style.display = 'flex';

  const total = items.length;
  let processed = 0;

  try {
    for (let i = 0; i < total; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      // Process current batch
      await Promise.all(batch.map((item, idx) => processor(item, i + idx)));

      processed = Math.min(i + batch.length, total);
      const percent = Math.round((processed / total) * 100);

      // Update UI Telemetry
      if (barFill) barFill.style.width = `${percent}%`;
      if (countText) countText.textContent = `${processed} / ${total} Diproses`;
      if (percentText) percentText.textContent = `${percent}%`;
      if (itemText && batch[batch.length - 1]?.nama) {
        itemText.textContent = `Memproses: ${batch[batch.length - 1].nama}`;
      }

      // Micro yield to main thread
      if (delayMs > 0) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  } catch (err) {
    console.error('[LiveProgress] Error during execution:', err);
    throw err;
  } finally {
    setTimeout(() => {
      if (overlay) overlay.style.display = 'none';
    }, 400);
  }
}
```

---

## 5. Kapan Menggunakan Skill Ini?

- **Import Tamu dari Excel/CSV** (`formulir_tamu.html`): Menampilkan progress pembacaan baris Excel & pengiriman ke Supabase.
- **Bulk Delete / Filter Duplicate** (`formulir_tamu.html` / `checkin.html`): Menampilkan eliminasi data duplikat per batch.
- **Sinkronisasi Massal GAS / Supabase Offline Sync**: Menampilkan upload antrean offline queue satu per satu dengan konfirmasi status live.
- **Copy Template / Cloning Event**: Menampilkan migrasi tabel dan aset.

---

## 6. Verifikasi & Acceptance

- [ ] Progress bar bergerak proporsional dari 0% hingga 100% tanpa lonjakan liar.
- [ ] Angka realtime `X / Y` tertera jelas dan dapat terbaca di layar mobile (<768px).
- [ ] UI tidak pernah mengalami unresponsive/freeze saat proses berjalan.
- [ ] Warna dan tipografi sesuai dengan warm palette SapaTamu (`--gold`, `--text-main`, `--border`).
