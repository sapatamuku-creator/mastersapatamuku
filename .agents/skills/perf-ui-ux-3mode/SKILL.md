---
name: perf-ui-ux-3mode
description: Standard arsitektur dan optimasi performa UI & UX 3-Mode (Desktop ≥1024px, Tablet 680–1023px, Mobile <680px) untuk web app dan guestbook SapaTamu agar bebas lag (60–90 FPS) di semua device (low–mid end smartphone, Android Chrome, dan tablet 2K).
---

# Performance UI & UX 3-Mode Optimization Skill (Desktop, Tablet, Mobile)

Skill ini adalah **Single Source of Truth (SSOT)** untuk standardisasi layouting responsif 3-bucket dan optimasi performa *hardware-friendly* (60–90 FPS) di seluruh ekosistem web app SapaTamu, khususnya perangkat *low-to-mid end* (smartphone Android 2GB–4GB RAM, tablet 11" 2K Redmi Pad / iPad, dan Google Chrome Android).

---

## 1. 📐 Tiga Bucket Responsif Global (SSOT Breakpoint)

Standar batas breakpoint wajib digunakan seragam di seluruh stylesheet (`guestbook-shared.css`, inline styles, dan `matchMedia` JS):

| Mode | Breakpoint CSS | Target Device Nyata | Perilaku Layout |
| :--- | :--- | :--- | :--- |
| 📱 **Mobile** | `@media (max-width: 679.98px)` | Smartphone handheld (iPhone 11–16, Galaxy S/A, Redmi, POCO: lebar **360px – 430px**). | *Bottom Sheet* geser ke atas, drawer samping vertikal, 1-kolom kartu, tombol ringkas, DOM chunk 30 kartu. |
| 📲 **Tablet** | `@media (min-width: 680px) and (max-width: 1023.98px)` | Tablet posisi Portrait (Redmi Pad 2/SE **~720–750px**, iPad Mini **744px**, iPad 10th Gen **820px**, Galaxy Tab **800px**). | **Tablet Mode Murni**: Grid 2-kolom seimbang, Dynamic Island floating capsule di pojok kiri atas, bukan layout HP. |
| 💻 **Desktop** | `@media (min-width: 1024px)` | Tablet Landscape (**1200px – 1280px**), Laptop (**1366px – 1920px**), Monitor PC. | Multi-kolom penuh, tabel rincian lebar 10 kolom, header stasiun stasioner. |

> [!IMPORTANT]
> **Anti-Pattern Terlarang:** Jangan pernah menggunakan `@media (max-width: 767.98px)` sebagai batas Mobile murni, karena akan menyebabkan tablet 11 inci dalam posisi portrait terdeteksi sebagai HP smartphone.

---

## 2. ⚡ DOM Render Culling (Windowed Rendering Engine)

Ketika menangani data 1.000–5.000 tamu:
* **Prinsip:** Simpan seluruh data di RAM (`masterData` & `Map`) agar fitur live search/filter berjalan instan (**< 5ms**).
* **DOM Culling:** Jangan pernah memasukkan 1.000 elemen HTML sekaligus ke `innerHTML` (yang menghasilkan 12.000+ node DOM dan memicu freeze di Chrome Android).
* **Chunk Windowing Rule:**
  * Inisialisasi limit render dinamis berdasarkan layar:
    ```javascript
    var _renderChunkSize = window.innerWidth < 680 ? 30 : 40;
    var _currentRenderLimit = _renderChunkSize;
    window.resetRenderLimit = function() {
        _currentRenderLimit = window.innerWidth < 680 ? 30 : 40;
    };
    ```
  * Potong array filtered saat render:
    ```javascript
    const visibleSlice = filtered.slice(0, _currentRenderLimit);
    listBody.innerHTML = visibleSlice.map(row => renderCard(row)).join('');
    ```
  * Pasang passive scroll listener pada container:
    ```javascript
    function onListScroll(e) {
        const el = e.target;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 300) {
            const filtered = getFilteredAndSortedGuests();
            if (_currentRenderLimit < filtered.length) {
                _currentRenderLimit += _renderChunkSize;
                renderUI();
            }
        }
    }
    listWrap.addEventListener('scroll', onListScroll, { passive: true });
    ```
  * Reset `resetRenderLimit()` setiap kali user mengetik di search bar atau mengganti filter.

---

## 3. 🛡️ GPU Shading & Glassmorphism Budget (Anti-Lag Chrome Android)

Pada GPU *entry-level* (Mali-G52/G57, Adreno 610, PowerVR), rendering Gaussian blur (`backdrop-filter: blur(...)`) di atas video camera stream memicu *GPU fill-rate throttling* berat (FPS drop ke 10–15 FPS).

### Aturan Shading:
1. **Mobile Overlay (`< 680px`)**:
   * Hapus `backdrop-filter: blur(...)` pada overlay layar penuh (`.mob-kartu-overlay`, `#modalConfirm`, `.st-modal-overlay`).
   * Gunakan warna solid semi-transparan berkinerja tinggi:
     ```css
     .mob-kartu-overlay {
         position: fixed; inset: 0;
         background: rgba(15, 23, 42, 0.65);
         backdrop-filter: none;
         -webkit-backdrop-filter: none;
         transition: opacity 0.25s ease;
     }
     ```
2. **Tablet Capsule (`680px – 1023px`)**:
   * Batasi blur maksimal `blur(12px)` dipadukan dengan latar belakang opacity tinggi (`rgba(255, 253, 251, 0.95)`).
3. **Background Animasi Ambient**:
   * Jeda (*pause*) atau sembunyikan animasi background hero slideshow HD saat pemindai kamera aktif di layar smartphone/tablet.

---

## 4. 📷 Scanner & Camera Stream Budget

Untuk mencegah *memory leak* dan *CPU throttling* saat pemindaian QR code:
* **Constraint Resolusi Video:** Kunci resolusi kamera di 480p–720p:
  ```javascript
  videoConstraints: {
      facingMode: mode,
      width: { min: 360, ideal: 480, max: 720 },
      height: { min: 360, ideal: 480, max: 720 }
  }
  ```
* **Scanning Frame Rate:** Set `fps: 15` (bukan 25–30 FPS). Kecepatan baca QR tetap instan namun menghemat 40% beban CPU.
* **Canvas Capture:** Gunakan `imageSmoothingQuality = 'medium'` dan format JPEG kualitas 0.75 dengan canvas `desynchronized: true`.

---

## 5. 🚀 CSS Containment & Hardware Layering

1. **CSS Containment:**
   ```css
   .guest-item {
       content-visibility: auto;
       contain-intrinsic-size: auto 115px;
       contain: layout style paint;
       touch-action: manipulation;
   }
   .details-row {
       content-visibility: auto;
       contain-intrinsic-size: auto 44px;
       contain: layout style paint;
       touch-action: manipulation;
   }
   ```
2. **Transform Hierarchy Rule (Zero Overwrite):**
   * Jangan pernah menuliskan `transform: translateZ(0);` global di luar media query pada elemen yang posisinya bergeser via `translateY(...)` (seperti bottom sheet mobile), karena akan menimpa posisi collapse.
   * Gabungkan hardware acceleration langsung di dalam transisinya:
     * *Collapsed:* `transform: translateY(calc(100% - 64px)) translateZ(0); will-change: transform;`
     * *Expanded:* `transform: translateY(0) translateZ(0);`
3. **Touch Latency 0ms:**
   * Pasang `touch-action: manipulation;` dan `-webkit-tap-highlight-color: transparent;` pada seluruh elemen interaktif.

---

## 6. ✅ Verification & Quality Checklist

Sebelum menyelesaikan optimasi tampilan / performa:
- [ ] Mode Desktop (≥1024px) teruji layout tabel multi-kolom dan kartu lega.
- [ ] Mode Tablet (680px–1023px) teruji pada resolusi 720px–820px (Redmi Pad/iPad Portrait) masuk layout tablet, bukan layout bottom sheet HP.
- [ ] Mode Mobile (<680px) teruji bebas lag blur dan membuka drawer/sheet 60 FPS.
- [ ] Scroll 1.000 data tamu berjalan mulus 60–90 FPS tanpa freeze memory.
- [ ] Live search mengetik instan (<5ms) dan mereset render chunk secara akurat.
- [ ] Decision Gate 5 poin dicatat di `DECISION_LOG.md`.
