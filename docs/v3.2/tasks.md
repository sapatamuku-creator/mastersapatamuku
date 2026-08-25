# Tasks — SapaTamu v3.2 (Guestbook Frontend: UI/UX Layouting & Performa Low–Mid End)

> Fokus: dokumentasi & task khusus **frontend guestbook** — UI/UX layouting 3 breakpoint dan optimasi performa device low–mid end.
> Scope halaman: `checkin.html`, `onsite.html`, `kiosk.html`, `analytics.html`, `welcome.html` (+ aset bersama `assets/guestbook-shared.css`, `lib/guestbook-core.js`, `assets/tailwind.css`).
> **Gate wajib:** Sebelum kerjakan task apapun, jalankan `skill-decision-gate` — jelaskan 5 poin gamblang & jujur, tunggu LANJUT user. Catat di `docs/v3.2/DECISION_LOG.md`.

---

## Prinsip Berlaku

- Tidak mengubah jalur route/backend yang sudah ada (warisan guardrail v3.0).
- Semua layout wajib lolos 3 bucket responsif: **Desktop ≥1024px**, **Tablet 768–1023px**, **Mobile <768px**.
- Tema visual SapaTamu: Warm Sand `#FFF9F5`, Gold `#C8962E`, Rose `#E07B7B`.
- Target performa: 60 FPS scroll/animasi di device RAM rendah, tanpa regress fungsional.

## Standar Teknis Perf (sudah diterapkan, jadi acuan)

| Teknik | Implementasi |
| :--- | :--- |
| CSS Containment | `.guest-item` / `.details-row`: `content-visibility: auto; contain-intrinsic-size: auto 115px/44px; contain: layout style paint;` |
| GPU Layer Promotion | `transform: translateZ(0); will-change: transform; -webkit-overflow-scrolling: touch;` pada bottom sheet, modal card, sticky pinned panel |
| Tap Delay | `touch-action: manipulation;` pada semua tombol, nav-links, kartu, baris tabel |
| Kamera Selfie | stream `{ ideal: 480, max: 720 }`, frameRate `{ ideal: 24, max: 30 }`; capture jpeg 0.75, `imageSmoothingQuality = 'medium'`, context desynchronized |
| Event Listener | Scroll/resize selalu `{ passive: true }` |
| Animasi | `prefers-reduced-motion`, partikel dibatasi, pause saat `document.hidden` |
| Data Loading | Chunked fetch 100/offset + Map lookup O(1), realtime channel singleton |
| CSS Bersama | Drawer/sheet/kartu mobile diekstrak ke `assets/guestbook-shared.css`; Tailwind statis `assets/tailwind.css` (bukan CDN runtime) |

---

## Peta Status Halaman

| ID Task | Halaman | Fitur | Status |
| :--- | :--- | :--- | :--- |
| T1.1–T1.3 | `formulir_tamu.html`, `wa_blast.html`, `sortir.html` | Live progress UX & telemetry (warisan v3.1) | Done |
| T1.4 | `checkin.html`, `onsite.html` | Offline queue telemetry sync (`sync_queue.js`) | Done |
| T1.5–T1.6 | `analytics.html`, `dashboard.html`, `formulir_tamu.html` | Skeleton feedback & hero slideshow | Done |
| T1.7 | `checkin.html`, `onsite.html` | Ambient photo slideshow background scanner | Done |
| T1.8 | `checkin.html`, `onsite.html` | Tablet Dynamic Island station controls | Done |
| T1.9–T1.10 | `checkin.html`, `onsite.html` | Details metadata lengkap + sort/multi-filter dropdown | Done |
| T1.11–T1.14 | `checkin.html`, `onsite.html` | Mobile: alamat visibility, fit-to-screen modal, kamera 1:1, slide-down exit | Done |
| T1.15 | `checkin.html`, `onsite.html` | Sticky pinned guest panel adaptif | Done |
| T1.16 | `checkin.html`, `onsite.html` | Perf hardware low-mid end & 60 FPS | Done |

---

## Task Aktif v3.2

### T2.1 — Pihak Singkatan Mode Kartu Mobile (checkin/onsite)
- **Status:** GATE DISSETUJUI (2026-08-23), implementasi ditunda — user minta docs dulu.
- **Fungsi:** Aktifkan akronim inisial pihak pengundang (`PW`, `PP`, `KIPP`, dst.) di **Card Mode** saat mobile <768px.
- **Kondisi saat ini:** `_formatPihakShort()` sudah dinamis di `checkin.html:2912` & `onsite.html:2823` (menghasilkan persis PW/PP/KIPP/KIPW/KAPP tanpa hardcode). Details Mode mobile sudah singkat. Card Mode masih dipaksa teks penuh oleh `.guest-item .pihak-full { display:inline !important }` (`checkin.html:1807`, `onsite.html:1459`, `assets/guestbook-shared.css:338`).
- **Rencana:** CSS-only — tambah rule di dalam `@media (max-width:767px)` yang sama di 3 lokasi CSS tersebut; pinned panel varian kartu ikut otomatis via class sama. Desktop/tablet tetap penuh.
- **Di luar scope:** dropdown filter Pihak (teks JS polos, bukan dual-span).

### T2.2 — Audit Konsistensi Duplikasi CSS Inline vs Shared
- **Status:** Backlog.
- **Catatan:** Rule `.pihak-full/.pihak-short` ada ganda di inline `<style>` kedua halaman dan `guestbook-shared.css`. Perlu audit agar tidak ada drift cascade saat salah satu diubah.

### T2.3 — Tablet Responsiveness & 60-90 FPS Performance Optimization (Redmi Pad 2 & Chrome Android)
- **Status:** Done (2026-08-25).
- **Fungsi:** 
  1. Penyesuaian breakpoint Mobile `< 680px` dan Tablet `680px – 1023.98px` agar tablet portrait (lebar ~720–750px) otomatis masuk ke **Tablet Mode** (Grid 2-Kolom & Tablet Station Island), bukan lagi layout Bottom Sheet HP.
  2. DOM Render Culling (Windowed Rendering) pada `renderUI()` dan `renderDetails()`: 1.000 data tamu tetap di RAM untuk live search instan (<5ms), namun yang dimasukkan ke DOM HTML dibatasi 40–50 kartu awal (`_renderLimit = 40`) dengan progressive infinite scroll.
  3. Meringankan intensitas `backdrop-filter: blur(...)` pada elemen station selector, navigation island, dan scanner overlays menjadi warna solid semi-transparan berkinerja tinggi agar GPU Mali/Adreno di Android Chrome tidak throttling.
  4. Optimasi Scanner kamera `Html5Qrcode` dari 25 FPS ke 15 FPS (hemat 40% CPU) dan pause animasi background slideshow saat kamera aktif.

### T2.4 — Mobile Mode Low-End Anti-Lag & Camera Constraint
- **Status:** Done (2026-08-25).
- **Fungsi:** 
  1. Eliminasi `backdrop-filter: blur(8px)` pada overlay mobile (`.mob-kartu-overlay`) dan menggantinya dengan `background: rgba(15, 23, 42, 0.65)` agar GPU smartphone budget (RAM 2GB–4GB) bebas lag.
  2. Memasang budget resolusi stream kamera `{ ideal: 480, max: 720 }` pada `Html5Qrcode` di mobile.
  3. Sizing render chunk adaptif di smartphone (`30 kartu/batch`) untuk menekan jumlah node DOM < 300 elemen.
  4. Menetapkan skill baru `perf-ui-ux-3mode` di `.agents/skills/`, `.claude/skills/`, global IDE `~/.gemini/config/skills/`, `skills-lock.json`, dan `AGENT.md`.


