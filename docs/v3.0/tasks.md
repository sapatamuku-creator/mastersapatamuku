# Tasks Breakdown — SapaTamu Guestbook v3.0
> Sumber: `docs/v3.0/plan.md`. Estimasi: S kecil (<4 jam), M (0.5-1 hari), L (1-2 hari)
> **Gate wajib:** Sebelum kerjakan task apapun, jalankan `skill-decision-gate` (`docs/v3.0/skill-decision-gate/SKILL.md`) — jelaskan 5 poin gamblang & jujur, tunggu LANJUT user. Catat di `DECISION_LOG.md`.

## Phase 0 — Baseline & Observability
- [ ] **T0.1 S — Instrumentasi performa**
  - Tambah `performance.mark/measure` di `fetchData`, `renderUI`, `initScanner`.
  - Simpan ringkas ke `localStorage.sapatamu_perf` untuk debugging onsite.
  - Files: `kiosk.html`, `checkin.html`, `onsite.html`, `analytics.html`, `welcome.html`

- [ ] **T0.2 S — Audit RLS & payload tamu**
  - Verifikasi `tamu` RLS: anon hanya `select` where `ssid = auth?` atau `eq` di API.
  - Ukur ukuran JSON `tamu` untuk 500/1000/2000 row. Catat di `docs/v3.0/perf-baseline.md`.

## Phase 1 — Quick Wins (P0)
- [ ] **T1.1 M — Tailwind build statis**
  - Buat `tailwind.config.js` dengan `content` 5 halaman, build `assets/tailwind.css`.
  - Ganti `<script src="https://cdn.tailwindcss.com">` di `kiosk.html:10`, `checkin.html:10`, `analytics.html:11`, `welcome.html:11`.
  - Acceptance: tidak ada runtime `tailwindcss` di Network, CSS <50kb gz.

- [ ] **T1.2 S — Debounce search**
  - Bungkus `renderKioskSearch()` (`kiosk.html:827`) & `renderUI()` (`checkin.html:520`) dengan `debounce(250)` + `requestAnimationFrame`.
  - Files: `kiosk.html`, `checkin.html`, `onsite.html`

- [ ] **T1.3 S — Cursor & motion**
  - `cursor: none` hanya saat `document.fullscreenElement` (`analytics.html:47`, `welcome.html:34`).
  - Tambah `@media (prefers-reduced-motion: reduce) { .dynamic-bg, .char-span { animation: none !important; } }` di `analytics.html`, `welcome.html:381-397`.

- [ ] **T1.4 S — Fix global input width**
  - Pastikan `input[type=radio], input[type=checkbox] { width:14px; height:14px; }` tidak ter-override `input,select{width:100%}` di kiosk/checkin/onsite (replikasi fix `formulir_tamu.html:c06a1a3`).

## Phase 2 — Core Extraction (P1)
- [ ] **T2.1 L — Buat `lib/guestbook-core.js`**
  - Exports: `createScanner(opts)`, `createRealtimeTamu(ssId, handlers)`, `createSelfie(opts)`, `jalurStore`.
  - Handle: `facingMode user/environment`, `Html5Qrcode` lifecycle, `getUserMedia` cleanup, `transform scaleX(-1)` mirror.
  - Acceptance: 1 file import di `kiosk.html` menggantikan ~300 baris inline.

- [ ] **T2.2 M — Migrasi Kiosk**
  - Ganti `initScanner`, `toggleScanner`, `toggleFrontcamMode`, `fetchData` di `kiosk.html:448-615` dengan core.
  - Acceptance: scanner start/stop 10x tanpa leak, `html5QrCode` null setelah `stop`.

- [ ] **T2.3 M — Migrasi Checkin**
  - Sama untuk `checkin.html:665-785`, plus `renderUI` pakai `Map` lookup bukan `find` linear.

- [ ] **T2.4 M — Migrasi Onsite (tab SCAN)**
  - Onsite tab SCAN reuse checkin render; tab REG tetap terpisah.
  - Unifikasi `JALUR_ID` + `localStorage` keys (`gb:jalur:checkin`, `gb:jalur:onsite`).

- [ ] **T2.5 M — Chunked fetch + Dual View Card/Details (checkin/onsite)**
  - Ganti `fetch /tamu?ssid=eq.X` → `select=...&limit=100&offset=0` + chunk next saat scroll (bukan paginasi halaman).
  - Tambah toggle `Card ↔ Details` di `checkin.html`/`onsite.html` (Details = list rapat windowed 30-40 row, infinite lazy). `kiosk.html` tetap 1 mode Kartu.
  - Lazy `barcode` QR: `https://api.qrserver.com/...` hanya saat kartu/baris visible (`IntersectionObserver`).
  - Acceptance: 1500 tamu chunked <2s di 4G, scroll infinite tanpa freeze, toggle sinkron `selectedIDs`.

## Phase 3 — UX & Resilience (tanpa ubah route/backend)
> Guardrail: tidak ganti URL/endpoint. Semua tetap ke jalur yang sudah ada.

- [x] **T3.1 M — Kiosk idle (optimasi tanpa ganti route)**
  - Optimasi `<iframe id="welcome-frame" src="welcome.html?mode=kiosk">` (`kiosk.html:211`) tanpa hapus route: lazy `postMessage`/`display:none` saat tidak idle atau hero statis sebagai placeholder, tetap pakai `welcome.html?mode=kiosk` yang sama.
  - Acceptance: kiosk idle memory -30-40% di DevTools, route `welcome.html?mode=kiosk` tetap dipakai.

- [x] **T3.2 S — Unify bottom sheet & drawer**
  - Audit `mob-kartu-tab`, `mob-kartu-panel`, `guest-sheet-grip`, `sheet-chevron` di `checkin.html:235-360` & `onsite.html:895-1021` agar breakpoint 768/1024 konsisten. Ekstrak CSS ke `assets/guestbook-shared.css` (tidak ubah navigasi/route).

- [x] **T3.3 M — Selfie kompresi (tetap ke Drive via GAS)**
  - Tetap ke Drive via `SCRIPT_URL` `action=confirm_checkin` yang sudah ada — **tidak pindah ke Supabase Storage**.
  - Ganti `canvas.toDataURL('image/jpeg',0.8)` (`kiosk.html:773`) → `canvas.toBlob` + resize max 480px + `jpeg 0.7` lalu base64 ke GAS (kompresi saja).
  - Acceptance: ukuran payload selfie -50-70%, tetap masuk Drive, flow GAS tidak berubah.

- [x] **T3.4 M — Offline queue (endpoint tetap)**
  - Hubungkan `sync_queue.js` + `offline-db.js` ke `executeCheckin()`/`submitOnsite()` — queue saat `navigator.onLine===false`, replay ke endpoint GAS yang sama saat `online` (tanpa endpoint baru).
  - Acceptance: 3 checkin offline → online → muncul di Supabase & analytics <5s.

## Phase 4 — Analytics & Welcome Polish
- [x] **T4.1 M — Analytics mirror ringan**
  - Ganti `mirror-iframe 1280x720 scale` (`analytics.html:200-220`, `1188-1198`) dengan lazy loading via IntersectionObserver. Kurangi hearts ke 6.

- [x] **T4.2 S — Memoize flow monitoring**
  - `renderFlow()` (`analytics.html:1068-1143`) grouping per `selectedInterval` di-memoize; hanya re-render kolom yang berubah.

- [x] **T4.3 M — Welcome slideshow preload**
  - `initSlideshow()` (`welcome.html:1036-1119`) preload `current+next` saja, Drive `sz=w800` (foto/kiosk) / `w1280` (TV) dengan pemanfaatan cache browser otomatis.

## Verification
- [ ] **V1** Lighthouse >90 (Performance) di kiosk mobile.
- [ ] **V2** Search 1000 tamu <50ms/frame.
- [ ] **V3** 10x scanner start/stop tanpa `getUserMedia` leak.
- [ ] **V4** 3 offline checkin → sync <5s saat online.
