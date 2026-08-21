# Technical Implementation Plan — SapaTamu Guestbook v3.0
## Scope: `kiosk.html` + `checkin.html` + `onsite.html` + `analytics.html` + `welcome.html`

> **Wajib baca:** `docs/v3.0/skill-decision-gate/SKILL.md` (`guestbook-v3-gate`). Setiap task/todo harus lewat GATE 5 poin (fungsi, asal kode, mengarah kemana, cabang routing terdampak, risiko jujur) dan tunggu persetujuan user sebelum implementasi. Log di `docs/v3.0/DECISION_LOG.md`.

> Fokus: performa, UX konsisten 3 breakpoint, DRY, realtime & offline resilience. Tidak menyentuh `formulir_tamu.html` (sudah stabil v2.7).
> **Prinsip v3.0: Tidak mengubah jalur route/backend yang sudah ada.** Semua optimasi hanya di layer frontend/code: kompresi, DRY, debounce, lifecycle — bukan migrasi storage atau ganti endpoint. Contoh: selfie tetap ke Drive via GAS `action=confirm_checkin` yang sudah ada; hanya optimasi kompresi/resize di sisi client sebelum kirim. Jika ada backend baru, harus via RFC terpisah.

---

### 1) Architecture Decisions

**A1 — Shared Core Module**
- Buat `lib/guestbook-core.js` (ES module, tanpa bundler dulu) yang mengekspos: `createScanner({ facingMode, fps, onScan })`, `createRealtimeTamu(ssId, onEvent)`, `createSelfie({ videoEl, canvasEl })`, `jalurStore`, `printerBridge`.
- Alasan: `kiosk.html:597-615`, `checkin.html:665-676`, `onsite.html:1142+` duplikasi ~70%. Satu sumber kebenaran untuk lifecycle kamera & channel Supabase.

**A2 — Tailwind Build-time**
- Hentikan `https://cdn.tailwindcss.com` (`kiosk.html:10`, `checkin.html:10`, `analytics.html:11`, `welcome.html:11`). Ganti `assets/tailwind.css` yang di-build dengan `content: ["./kiosk.html","./checkin.html","./onsite.html","./analytics.html","./welcome.html"]` + `--minify`. Runtime compiler hilang, -60% CSS.

**A3 — Data Loading Strategy (Dual View, bukan paginasi halaman)**
- `fetchData()` saat ini `kiosk.html:545` `GET /tamu?ssid=eq.X&order=row.desc` tanpa `Range`. Untuk 1500 tamu ~1.5MB JSON. Ganti ke **chunked fetch** `select=row,nama,kode,status_hadir,jam_datang,real_hadir,kategori,alamat,pihak_pengundang,sesi,rencana_hadir&order=row.desc&limit=100&offset=0` (next chunk saat scroll) — **tanpa UI paginasi halaman**.
- `checkin.html` & `onsite.html` tambah **2 mode view File Explorer**: **Kartu** (grid yang sudah ada, default) ↔ **Details** (list rapat 1 baris/tamu, windowed virtual 30-40 row visible). Infinite lazy load = chunked fetch yang di-auto saat scroll dekat bawah. `kiosk.html` tetap 1 mode Kartu (fokus scan). `barcode` (`qrserver.com`) generate lazy saat render, bukan saat map.

**A4 — Realtime Singleton**
- Satu `supabaseClient` singleton per halaman, channel `tamu_changes`, `welcome_queue`, `wishes_queue` di-subscribe sekali. `unsubscribe` di `visibilitychange`/`beforeunload`. Di `welcome.html:866-909` pattern realtime + fallback polling 30s/5s sudah bagus — jadikan template untuk `checkin`/`onsite`.

**A5 — Welcome Mirror & Kiosk Idle**
- `kiosk.html:209-214` iframe `welcome.html?mode=kiosk` double-load (config, supabase, slideshow). Ganti dengan komponen ringan: `welcome` expose `postMessage` snapshot atau `kiosk` render static hero + `fetch welcome_queue` 30s. Iframe hanya jika `deviceMemory > 4`.

**A6 — Animation Budget**
- `analytics.html:73-122` & `147-197` 20 hearts x2 panel = 40 animasi `linear 15-25s` + `pulseHeart`. Di TV stick jank. Terapkan `prefers-reduced-motion`, `will-change: transform`, kurangi ke 6 hearts, matikan saat `document.hidden`.

---

### 2) Implementation Phases

#### Phase 0 — Baseline & Observability (1 hari)
- Tambah `performance.mark` di `fetchData`, `initScanner`, `renderUI`. Log ke `console` + `localStorage.sapatamu_perf`.
- Ukur bundle: `cdn.tailwindcss.com` vs build, ukuran JSON tamu, FPS scanner.
- Verifikasi RLS Supabase `tamu` (anon key hanya `select` by `ssid`).

#### Phase 1 — Quick Wins P0 (1-2 hari)
- Build Tailwind statis.
- Debounce search 250ms + `requestAnimationFrame` (`kiosk.html:827`, `checkin.html:520`).
- `cursor: none` hanya saat `fullscreen` (`analytics.html:47`, `welcome.html:34`).
- `prefers-reduced-motion` untuk hearts & `charRotateIn` (`welcome.html:381-397`).
- Normalisasi `input,select` global agar `radio/checkbox` tidak `width:100%` (pelajaran `formulir_tamu.html:fix c06a1a3`).

#### Phase 2 — Core Extraction + Dual View P1 (3-4 hari)
- Buat `lib/guestbook-core.js` + `lib/jalur-store.js` (termasuk `chunkedFetchTamu` limit/offset).
- Migrasi `kiosk` dulu (tetap 1 mode Kartu), lalu `checkin`, lalu `onsite` (onsite tab SCAN reuse checkin + toggle Card/Details).
- Ganti `fetchData` ke **chunked** + `Map<code, guest>` untuk lookup O(1) (ganti `find` linear `kiosk.html:666`, `checkin.html:736`).
- Tambah toggle `Card ↔ Details` di `checkin`/`onsite` (Details = windowed 30-40 row, infinite chunk saat scroll). Simpan pilihan di `localStorage`.
- Centralize `localStorage` keys (`checkin_cam_on`, `kiosk_cam_on` → `gb:cam:checkin`).

#### Phase 3 — UX & Resilience (2-3 hari) — tanpa ubah route/backend
- Kiosk idle: optimasi tanpa ganti route — kurangi beban iframe `welcome.html?mode=kiosk` (lazy `postMessage` / `display:none` saat tidak idle, atau ganti hero statis) tapi tetap pakai URL `welcome.html?mode=kiosk` yang sudah ada.
- Bottom sheet & laci: unify breakpoint `768 / 1024` sudah ada, audit `guest-sheet-grip` & `mob-kartu-tab` agar konsisten di `checkin`/`onsite` (hanya CSS/JS, tidak ubah route navigasi).
- Selfie: **tetap ke Drive via GAS yang sudah ada** (`SCRIPT_URL` `action=confirm_checkin`). Optimasi hanya kompresi client: `canvas.toBlob` + resize max 480-600px + `image/jpeg 0.7` sebelum `base64` ke GAS. Tidak pindah ke Supabase Storage.
- Offline: sambungkan `sw.js` + `offline-db.js` + `sync_queue.js` untuk queue `confirm_checkin` (tetap ke endpoint GAS yang sama) saat offline, tanpa endpoint baru.

#### Phase 4 — Analytics & Welcome Polish (2 hari)
- Analytics mirror: ganti `iframe 1280x720 scale` (`analytics.html:211-220` + `1188-1198`) dengan snapshot polling atau `canvas` thumbnail.
- Flow monitoring `analytics.html:1068-1143` grouping per interval — memoize, hindari re-render full `innerHTML` tiap `setIntervalTime`.
- Welcome slideshow `welcome.html:1036-1119` preload hanya `current+1`, Drive `sz=w800` untuk foto, `w1280` untuk TV saja. YouTube autoplay fallback ke poster.

---

### 3) Risks & Mitigations
- Kamera permission churn: selalu `try { stop() }` sebelum `start()` (sudah ada fallback di `kiosk.html:606-613`, standarisasi).
- Supabase Realtime `SUBSCRIBED` flakiness: fallback polling 5s (sudah di `welcome.html:898`, replikasi).
- Tailwind build break: keep `cdn` sebagai fallback via `onerror` loader selama migrasi.

### 4) Verification Checkpoints
- CP1: Lighthouse Performance >90 di kiosk/checkin mobile, CSS <50kb.
- CP2: Search 1000 tamu, keystroke <50ms frame, no freeze.
- CP3: Scanner start/stop 10x tanpa leak `MediaStreamTrack`.
- CP4: Offline checkin 3 tamu, online kembali → sinkron ke Supabase & welcome_queue tampil <3s.

### 5) Out of Scope / Guardrails v3.0
- **Tidak mengubah jalur route/backend yang sudah ada**: URL halaman (`kiosk.html`, `checkin.html`, `onsite.html`, `analytics.html`, `welcome.html?mode=kiosk`), `SCRIPT_URL` GAS, `SB_URL` Supabase, `welcome_queue`/`wishes_queue` flow tetap. Seluruh update adalah optimasi code frontend agar tidak ada bug & ketidak-selaras antar halaman.
- **Selfie tetap ke Drive**: tidak ada migrasi `selfie` ke Supabase Storage. Optimasi hanya kompresi (`toBlob` + resize) sebelum kirim ke endpoint Drive yang sama.
- Tidak ubah schema `tamu` / `welcome_queue` / `wishes_queue`.
- Tidak ubah routing `subdomain_resolver.js` & `auth_guard.js`.
- Tidak sentuh `formulir_tamu.html` kecuali share `guestbook-core.js` (jika dibutuhkan).
