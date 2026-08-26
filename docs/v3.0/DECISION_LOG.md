# Decision Log — SapaTamu Guestbook v3.0

> Catat setiap GATE `guestbook-v3-gate` di sini. Satu baris per task. Jujur, ringkas.

| Tanggal | Task | Keputusan | Alasan / Risiko yang disetujui |
|---------|------|-----------|--------------------------------|
| 2026-05-13 | T0.1 Instrumentasi performa | LANJUT | Overhead <1ms, 20 entri terakhir di localStorage, jujur tanpa ubah route. User: lanjut |
| 2026-05-13 | T2.5 Dual View vs Paginasi | LANJUT (ubah) | Ganti paginasi halaman → Card (default) + Details windowed infinite + chunked fetch 100/offset di checkin/onsite; kiosk tetap 1 mode. Alasan: UX lapangan butuh scan padat tanpa ingat halaman. Tidak ubah backend route. |
| 2026-05-13 | T0.2 Audit RLS & payload | LANJUT | Hanya baca & catat baseline, tidak ubah RLS/endpoint. Jika longgar, RFC terpisah. User: lanjut Phase 0 |
| 2026-05-13 | T1.1 Tailwind build statis | LANJUT | Ganti cdn.tailwindcss.com → assets/tailwind.css 19KB (fallback onerror ke CDN). Risiko purge miss: mitigasi staging visual check. Tidak ubah route. User: lanjut |
| 2026-05-13 | T1.2 Debounce search 250ms | LANJUT | Debounce input only (rAF+250ms), global renderUI tetap immediate untuk programmatic. Risiko delay 250ms terasa nggantung tapi anti-freeze. Tidak ubah route. User: lanjut |
| 2026-05-13 | T1.3 Cursor & reduced-motion | LANJUT | Cursor none hanya saat fullscreen (is-fullscreen), reduce-motion matikan hearts/char. Risiko sangat rendah, debug jadi mudah. Tidak ubah route. User: setuju |
| 2026-05-13 | T1.4 Fix radio/checkbox 14px | LANJUT | Scoped 14px untuk guest-item/#guest-list/#kiosk-search-list, cegah melar 100%. Risiko sangat rendah, tidak ubah cam-toggle. Tidak ubah route. User: lanjut |
| 2026-05-13 | T2.1 Shared core + kiosk migrasi | LANJUT | Buat lib/guestbook-core.js + jalur-store.js, kiosk delegate fetch/scanner ke core (fallback inline). Risiko sedang: 1 file baru, blast radius hanya kiosk dulu, checkin/onsite tetap lama. Tidak ubah route. User: lanjut |
| 2026-05-13 | T2.2 Checkin migrasi + Map | LANJUT | Checkin delegate ke core + Map O(1) untuk scan, realtime sync Map. Risiko rendah-sedang, core sudah teruji di kiosk. Tidak ubah route. User: lanjut |
| 2026-05-13 | T2.4 Onsite migrasi + Map | LANJUT | Onsite tab SCAN delegate ke core + Map O(1), realtime sync Map, tab REG tetap. Risiko rendah, reuse core. Tidak ubah route. User: lanjut |
| 2026-05-13 | T2.6 Realtime kiosk | LANJUT | Tambah createRealtimeTamu di core + kiosk guestMap + initKioskRealtime (onInsert/Update/Delete + refresh search). Risiko rendah, 1 channel WS ekstra. Tidak ubah route. User: ya terapkan |
| 2026-05-13 | T2.5 Dual View Card↔Details + chunked | LANJUT | Checkin/onsite: toggle Card/Details windowed, chunked fetch 100/offset + infinite sentinel + view-aware render/toggle/realtime. Kiosk tetap Card. Risiko sedang-tinggi, fallback Card. Tidak ubah route. User: lanjut |
| 2026-05-13 | Fix mobile bulk-btn overflow | LANJUT | checkin/onsite search-container flex-wrap + bulk-btn 100% width di <768px agar KONFIRMASI tidak keluar frame. Risiko sangat rendah. Tidak ubah route. User: lanjut |
| 2026-08-21 | Pihak Singkatan Mobile | LANJUT | CSS .pihak-full/.pihak-short + _formatPihakShort() murni dinamis inisial kata (tanpa hardcode map) di checkin.html & onsite.html. Mobile <768px tampil akronim, desktop/tablet full. User: lanjut |
| 2026-08-21 | T3.1 Kiosk Idle iframe | LANJUT | postMessage 'pause'/'play' ke #welcome-frame saat scan/idle. Route welcome.html?mode=kiosk tidak berubah. User: lanjut |
| 2026-08-21 | T3.2 Unify CSS Drawer | LANJUT | Ekstrak CSS mob-kartu, sheet, drawer dari checkin/onsite ke assets/guestbook-shared.css. User: lanjut |
| 2026-08-21 | T3.3 Selfie Kompresi | LANJUT | resizeAndCompress() di kiosk/onsite: resize max 480px + jpeg 0.7 via canvas.toBlob. Endpoint SCRIPT_URL tetap sama. User: lanjut |
| 2026-08-21 | T3.4 Offline Queue | LANJUT | Guard sync_queue.js intercept fetch Supabase & GAS offline, auto-replay on online. User: lanjut |
| 2026-08-21 | T4.1 Analytics Mirror Ringan | LANJUT | Kurangi floating hearts ke 6 partikel + lazy load iframe welcome mirror via IntersectionObserver. User: lanjut |
| 2026-08-21 | T4.2 Memoize Flow Monitoring | LANJUT | Memoize komputasi grouping renderFlow() di analytics.html via _cachedFlowKey. User: lanjut |
| 2026-08-21 | T4.3 Welcome Slideshow Preload | LANJUT | Resolusi adaptive Drive sz=w800 (kiosk) / w1280 (TV) + preloading next slide memanfaatkan browser HTTP cache. User: lanjut |
| 2026-08-26 | BUG-FETCH-001 Full Fetch Loop | LANJUT | Tambah fetchAllTamu() di guestbook-core.js: loop offset 1000 sampai habis. Ganti fetchTamu({limit:1000}) di kiosk/checkin/onsite dengan fetchAllTamu(). Tambah race-condition guard (retry 100ms×20) di fetchData() ketiga halaman. Fix: search/scan miss tamu >1000 & data kosong saat reload di Android. User: lanjut |
| 2026-08-26 | FIX-STATS-AND-PWA-CACHE | LANJUT | Tambah updateStatsOnsite() di renderDetailsOnsite() & updateStats() di renderDetails() (checkin/onsite) agar stats 0 guest ter-update di tablet mode. Update sw.js ke sapatamu-pwa-v6 + strategi Network-First untuk semua aset lokal agar update JS/CSS langsung aktif tanpa stale-cache. User: lanjut |
| 2026-08-26 | FIX-ANALYTICS-DATA-SYNC | LANJUT | Fix CURRENT_SS_ID resolution di analytics.html, fetchAllTamu loop offset, normalisasi status_hadir/jam_datang & fallback real_hadir, serta tambah realtime subscription pada tabel tamu. User: lanjut |
| 2026-08-26 | FEAT-SOUVENIR-AND-CHECKOUT | LANJUT | Buat souvenir.html (pos scanner souvenir & check-out) dengan HID Barcode Anti-Burst Protection (120ms debounce + 9-char slice + auto claim), integrasi stok & kapasitas ballroom di config.html, live Ballroom Occupancy & Souvenir Disbursement widget di analytics.html, dan backend action claim_souvenir_checkout. User: lanjut semua |
| 2026-08-26 | FEAT-LUCKYDRAW-CHECKOUT-FILTER | LANJUT | Update luckydraw.html: hanya undi kandidat tamu yang hadir dan BELUM checkout (masih di ballroom), loop pagination fetchAllTamuRows (cegah cap 1000 baris), Supabase Realtime sync pool undian, dan 4-metric monitor bar. User: lanjut, perbaiki luckydraw setelah normal, push semua |
| 2026-08-26 | FIX-ANGPAO-FULLFETCH-AND-BARCODE | LANJUT | Update angpao.html: ganti hardcoded URL Supabase ke SB_URL, terapkan fetchAllTamuRows loop offset (anti cap 1000), sanitasi 9-char barcode slicer di onScanSuccess & handleSearchKey, dan lengkapi mapping jam_pulang di realtime sync. User: lanjut |
| 2026-08-26 | FEAT-SOUVENIR-LUXURY-REDESIGN | LANJUT | Redesain luxury Glassmorphism souvenir.html: background slideshow foto prewedding klien (Ken Burns 8.5s), frost glass overlay, floating particles, event hero header nama pengantin, dan konsol scanner laser beam 3-mode responsive. User: lanjut |
| 2026-08-26 | UPGRADE-SOUVENIR-EDITORIAL-UI | LANJUT | Transformasi estetika editorial souvenir.html: tipografi Lora display, kartu st-card ala wa_blast/analytics, boutique scanner arena, 3 KPI card ber-progress bar, dan arrival-style claim list. User: lanjut |
| 2026-08-26 | FIX-SOUVENIR-CALCULATION-AND-CANON-UI | LANJUT | Fix formula status souvenir (isGuestClaimed berbasis jam_pulang / statusSouvenir, bukan field entitlement souvenir=ya) agar tidak false 100%, serta tata ulang tata letak kartu dan tipografi canon sapatamu-projects. User: lanjut |
| 2026-08-26 | UPGRADE-SOUVENIR-MOBILE-GLASSMORPHISM | LANJUT | Rombak UI mobile mode souvenir.html: Frosted Glassmorphism blur(20px), iOS-style segmented pill control, penataan micro-typography kartu KPI anti-overflow, flex scanner input anti-truncate tombol PROSES, dan Dynamic Island compact. User: lanjut |
| 2026-08-26 | FEAT-PROFILE-SOUVENIR-LOGISTICS-PANEL | LANJUT | Tambahkan tab Logistik & Souvenir di profile.html: input Total Stok Souvenir & Kapasitas Ballroom dengan auto-load/save ke config_welcome Supabase & GAS, serta link pintasan langsung ke souvenir.html & analytics.html. User: lanjut dan push |
| 2026-08-26 | FIX-PROFILE-LOGISTICS-PERSISTENCE-AND-RESOLVER | LANJUT | Fix race condition subdomain_resolver di profile.html (tunggu SAPATAMU_RESOLVED sebelum fetch), perbaiki session ID resolution, tambahkan instant hydration local cache (sapatamu_logistics_ssId), dan update GAS action ke saveWelcomePhotos. User: lanjut dan push |
| 2026-08-26 | FEAT-ANGPAO-MOBILE-BOTTOM-SHEET | LANJUT | Terapkan sistem Mobile Bottom Sheet (<680px) pada dialog input angpao & kado fisik di angpao.html: grip handle bar, slide-up 60 FPS, touch-friendly numpad/shortcuts, safe area padding, dan swipe down dismiss. User: lanjut |

## Cara pakai
- Saat GATE disetujui user (`LANJUT`), tambahkan baris di tabel atas.
- Jika `TOLAK`/`TUNDA`, tulis alasan (mis. "butuh RFC backend baru").
- Jangan hapus baris lama — ini audit trail.

## Guardrail v3.0 (diulang agar jelas)
- Tidak ubah jalur route/backend yang sudah ada.
- Selfie tetap ke Drive via GAS `action=confirm_checkin` — hanya kompresi client.
- Optimasi hanya anti-bug & selaras antar halaman (kiosk, checkin, onsite, analytics, welcome).
