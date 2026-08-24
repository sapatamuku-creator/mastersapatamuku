---
name: sapatamu-projects
description: SSOT arsitektur SapaTamu — canon UI/layout/modal/transisi/animasi/performance sampai detail terkecil. WAJIB dibaca sebelum buat halaman/project baru agar tidak SLOP generik AI. Enforce tokens, navbar Dynamic Island, skeleton shimmer, live-progress, offline-first, guard, dan 3-bucket responsive.
version: 1.0.0
author: mastersapatamuku — distilled from 15+ html, 12 api, GAS, Supabase, PWA, animations.css/js, ui-ux-pro-max, instant-skeleton, live-progress
license: MIT
---

# Sapatamu-Projects — Project Canon Skill

> **WAJIB** dibaca sebelum membuat halaman baru, komponen baru, atau project turunan SapaTamu.
> Skill ini adalah **Single Source of Truth** dari apa yang *sudah diterapkan* di `mastersapatamuku`.
> Jika melanggar canon ini = SLOP (AI-generik) — ditolak di review.

## Kapan aktif

- Buat `.html` baru, api baru, modal baru, dashboard baru
- Ubah layout/nav/skeleton/offline/auth
- Clone/rebuild project turunan (undangan, marketplace, guestbook, POS, CRM, dsb)
- Review PR yang sentuh UI/performansi

Jika ragu, anggap aktif.

## Cara pakai (60 detik)

1. Baca **references/00-canon-tokens.md** — copy `tokens.css` (warm palette, radius, shadow, font, motion).
2. Pilih layout dari **01-layout-system.md** sesuai jenis halaman (marketing / dashboard / form / operational / marketplace).
3. Pasang **02-navbar-island.md** jika butuh nav, **03-modal-system.md** untuk modal/drawer/bottom-sheet, **04-skeleton-perf.md** untuk data+image, **05-offline-sync.md** jika butuh offline/PWA, **06-auth-guard.md** untuk session/role.
4. Cek **07-preflight-project.md** sebelum emit — harus 0 istilah SLOP, 3 bucket lolos, reduced-motion respected.

> Detail anti-SLOP generik AI (purple gradient, Inter solo, 3 cards) ada di `design-taste-guide` — skill ini **melengkapi** dengan canon spesifik SapaTamu, bukan menggantikan.

## Struktur references

| File | Isi | Wajib kapan |
|------|-----|-------------|
| `00-canon-tokens.md` | Warm palette, typography, radius, shadow, motion, spacing, scrollbar — copy-paste `tokens.css` | Selalu |
| `01-layout-system.md` | Grid, container, breakpoints 520/768/900/1024, section, card, nav-container, form sticky | Saat tentukan layout |
| `02-navbar-island.md` | Dynamic Island 180→960, station selector, scroll fades & arrows | Saat ada nav |
| `03-modal-system.md` | 5 varian modal + drawer + bottom-sheet + form + validation | Saat ada modal/form |
| `04-skeleton-perf.md` | Shimmer 1.4s, async-img lazy, api-cache 5m, Promise.all <120ms, image Drive | Saat load data/gambar |
| `05-offline-sync.md` | IndexedDB 7 stores, SyncEngine 30s, print queue, SW v5, pull/bootstrap | Saat butuh offline/PWA |
| `06-auth-guard.md` | Subdomain 4-step, session dual-store, RBAC client/usher, idle 2m/60m, presence, kick | Saat butuh auth |
| `07-preflight-project.md` | Checklist emit + daftar hitam SLOP spesifik SapaTamu + stamp | Sebelum emit |

## Templates (copy-paste, bukan teori)

`templates/` berisi file siap pakai — copy verbatim, ganti content saja:
- `tokens.css` — `:root` lengkap
- `navbar-island.html` + `navbar-island.css` + `navbar-island.js`
- `modal-system.css` — 5 modal + drawer + sheet
- `skeleton.css` + `skeleton.js`
- `offline-db.stub.js` — schema minimal

## Aturan keras (dilanggar = fail review)

1. **Tokens tidak boleh inline** — semua warna/radius/shadow/font via `var(--*)` dari `00-canon-tokens.md`.
2. **Nav harus Dynamic Island** jika halaman punya nav — jangan N1a generik (wordmark+5 links sticky).
3. **Data page wajib skeleton** — detik 0 shimmer, teks <150ms, image async fade 450ms — jangan `Loading...` mentah.
4. **Progress deterministik** `X/Y %` + gradient fill + micro-yield — jangan spinner infinite jika total diketahui.
5. **3 bucket wajib lolos** (<768 / 768–1023 / ≥1024) — cek `01-layout-system.md`.
6. **Reduced-motion respected** — `prefers-reduced-motion: reduce` kill semua (lihat `00-canon-tokens.md`).
7. **Stamp provenance** di CSS: `/* Sapatamu-Projects · canon v1 · tokens: warm · nav: island · perf: skeleton+cache */`

## Sumber canon

- `animations.css:1` (motion tokens + floating scrollbar 9→7→9)
- `animations.js:1` (hero timeline + staggerReveal 70ms + IO 0.12)
- `config.js:1` (SUPABASE_CONFIG, MIDTRANS_CONFIG, CSRF HMAC, SESSION dual-store + watchdog)
- `offline-db.js:1` (IndexedDB 7 stores + CRUD + deviceId)
- `sync-engine.js:1` + `sync_queue.js` (SyncEngine 30s + fetch intercept 1.5s/5s)
- `subdomain_resolver.js`, `auth_guard.js`, `vercel.json`, `sw.js`, `manifest.json`
- `index.html`, `dashboard.html`, `guestbook.html`, `vendor-dashboard.html`, `formulir_tamu.html`, `checkin/onsite/kiosk/welcome/analytics.html`
- Skills: `ui-ux-pro-max`, `instant-skeleton-loading`, `live-progress-ux`, `design-taste-guide`

Canon = yang sudah terbukti di production SapaTamu. SLOP list ada di `07-preflight-project.md` — jangan diulang di project baru.
