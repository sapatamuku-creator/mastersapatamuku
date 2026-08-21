# Todo Checklist — SapaTamu Guestbook v3.0
> Halaman: `kiosk.html` · `checkin.html` · `onsite.html` · `analytics.html` · `welcome.html`
> Prinsip: **Tidak mengubah jalur route/backend yang sudah ada** — optimasi code saja (anti-bug & selaras antar halaman). Selfie tetap ke Drive (hanya kompresi).
> **Gate wajib:** Tiap todo lewat `skill-decision-gate` (`docs/v3.0/skill-decision-gate/SKILL.md`) — jelaskan fungsi, asal kode, mengarah kemana, cabang routing terdampak, risiko jujur. Tunggu LANJUT.
> Ikuti urutan fase. Centang jika acceptance terpenuhi & sudah log di `DECISION_LOG.md`.

## Phase 0 — Baseline
- [ ] **0.1** Pasang `performance.mark` di `fetchData`/`renderUI`/`initScanner` (5 halaman)
- [ ] **0.2** Catat ukuran JSON tamu 500/1000/2000 row + waktu fetch 4G
- [ ] **0.3** Verifikasi RLS `tamu` (anon tidak bisa `select` tanpa `ssid` filter)

## Phase 1 — Quick Wins
- [ ] **1.1** Build `assets/tailwind.css` dan hapus `cdn.tailwindcss.com` (4 file)
- [ ] **1.2** Debounce search 250ms (`kiosk.html:827`, `checkin.html:renderUI`, `onsite.html:renderUI`)
- [ ] **1.3** `cursor:none` hanya saat fullscreen + `prefers-reduced-motion` untuk hearts/char
- [ ] **1.4** Fix `radio/checkbox width 14px` (replikasi `c06a1a3`) di kiosk/checkin/onsite

## Phase 2 — Core Extraction
- [ ] **2.1** Buat `lib/guestbook-core.js` (scanner, realtime, selfie, jalurStore)
- [ ] **2.2** Migrasi `kiosk.html` ke core — scanner 10x start/stop tanpa leak
- [ ] **2.3** Migrasi `checkin.html` — `Map<code,guest>` bukan `find` linear
- [ ] **2.4** Migrasi `onsite.html` tab SCAN — unifikasi `JALUR_ID` keys
- [ ] **2.5** `fetchData` chunked `limit=100` + Dual View `Card↔Details` (Details windowed infinite, checkin/onsite; kiosk tetap Kartu) + lazy QR

## Phase 3 — UX & Resilience (tanpa ubah route/backend)
- [ ] **3.1** Kiosk idle: optimasi `welcome.html?mode=kiosk` (lazy/`postMessage`/placeholder) — route tetap
- [ ] **3.2** Unify bottom sheet & laci (`768`/`1024`) — ekstrak `guestbook-shared.css` (tidak ubah navigasi)
- [ ] **3.3** Selfie — tetap ke Drive via GAS; hanya kompresi `toBlob` 480-600px `jpeg 0.7` sebelum kirim
- [ ] **3.4** Offline queue (`sync_queue.js` + `offline-db.js`) untuk `confirm_checkin` — endpoint GAS tetap

## Phase 4 — Analytics & Welcome
- [ ] **4.1** Analytics mirror: ganti `iframe 1280x720 scale` dengan snapshot polling; hearts 20→6
- [ ] **4.2** Memoize `renderFlow()` grouping per interval
- [ ] **4.3** Welcome slideshow preload `current+1` saja, `sz=w800`/`w1280` adaptif

## Verification
- [ ] **V1** Lighthouse Performance >90 (kiosk mobile)
- [ ] **V2** Search 1000 tamu <50ms/frame (no jank)
- [ ] **V3** Scanner 10x start/stop tanpa `MediaStreamTrack` leak
- [ ] **V4** 3 offline checkin → sync <5s saat online

## Next
- [ ] Pilih fase eksekusi pertama (P0/P1) dan buat branch `feat/guestbook-v3.0-phase-1`
