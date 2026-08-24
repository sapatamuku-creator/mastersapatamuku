# 07 — Preflight Checklist & Daftar Hitam SLOP SapaTamu

> Jalankan sebelum emit HTML/API. Lolos = boleh merge. Gagal = tolak.

## 7.1 Checklist emit (copy ke PR)

### Tokens & typography
- [ ] `:root` dari `00-canon-tokens.md` verbatim, semua ref via `var(--*)` — no inline hex
- [ ] 1 body `Plus Jakarta Sans` + 1 display `Lora` (atau 1 alternatif) — max 2 families + mono opsional
- [ ] No `Inter` solo, no `Fraunces` default tanpa alasan editorial (lihat `design-taste-guide/03`)
- [ ] Heading roman, italic hanya body emphasis
- [ ] `font-display:swap`, preload hanya 400/700

### Color 60:30:10
- [ ] 60 bg warm `#FFF9F5` / 30 card/border `#F0E6DE` / 10 `Rose #E07B7B` atau `Gold #C8962E` — 1 accent saja
- [ ] Contrast AA (body 4.5:1, large 3:1) light & dark
- [ ] No purple→blue gradient hero tanpa brand reason (P0)

### Layout & nav
- [ ] Grid sesuai `01-layout-system.md` per jenis halaman — jangan 3 cards identik
- [ ] Nav = Dynamic Island 180→960 (`02-navbar-island.md`) jika ada nav — bukan N1a generik
- [ ] No `rounded-2xl shadow-lg` seragam di semua card — variasi radius = hierarchy

### Modal / drawer / form
- [ ] Modal pakai 1 dari 5 varian `03-modal-system.md` — overlay blur, radius 35, ease-modal
- [ ] Drawer/tab `writing-mode:vertical-rl` + grip-bar 40×4 jika mobile laci
- [ ] Bottom-sheet `<1024` transform `calc(100% - 64px)` + ease-drawer 0.38s
- [ ] Form labels 10px 800 uppercase, error dekat field, `aria-describedby`, helper visible
- [ ] No `alert()` — pakai SapaModal/st-modal

### Skeleton & perf
- [ ] Detik 0 shimmer `shimmerPulse 1.4s` tampil (no Loading...)
- [ ] ~120ms teks terisi via `Promise.all` backend — bukan sequential
- [ ] Image `loading=lazy decoding=async` + `onload parent img-loaded` + fade 450ms, parallel
- [ ] SW precache 12, network-first navigations, cache-first assets, cross-origin bypass
- [ ] CLS <0.1 — width/height atau aspect-ratio declared, `content-visibility:auto` untuk list panjang
- [ ] Tailwind single pipeline `assets/tailwind.input.css → tailwind.css` — no CDN double-load

### Offline / PWA
- [ ] Jika butuh offline: 7 stores `05-offline-sync.md` + SyncEngine 30s + dedup syncLog + retries ≤5
- [ ] Jangan duplikasi DB `offline-db.js` vs `sync_queue.js` — pilih satu

### Auth / security
- [ ] Session dual-store + watchdog 30m, idle 2m/60m, presence `sapatamu-online`, kick polling 15s — jika pakai auth
- [ ] OG middleware bot-only + `?og-static=1` loop guard — jika ada OG
- [ ] CSP single source `vercel.json` — jangan `<meta CSP>` per HTML drifting
- [ ] No `innerHTML = userData` tanpa `sanitizeHTML` (XSS)
- [ ] No secrets hardcode — inject via `window.*_CONFIG` / env

### Responsive 3 bucket
- [ ] 320 / 375 / 414 / 768 px — no horizontal scroll (`overflow-x:clip` html,body), no 2-line clickable text
- [ ] `minmax(0,1fr)` untuk image tracks, `overflow-wrap:anywhere; min-width:0` untuk display headers
- [ ] Section heads 1 col di mobile, hero `min-h-[100dvh]` bukan `h-screen`
- [ ] Scrollbar canon `00-canon-tokens.md` — jangan custom random

### Motion & a11y
- [ ] Motion ≤3 primitives, `var(--ease-*)` + `var(--duration-*)`, stagger 70ms threshold 0.12 — bukan fade-up everywhere
- [ ] `prefers-reduced-motion:reduce` kill all
- [ ] Semantic `button/nav/main/section`, `alt`, `label for`, heading `h1→h6` sequential, focus `outline 2px primary`
- [ ] Touch target ≥44px, gap ≥8px, hover tidak jadi satu-satunya affordance

### Gate SLOP generik AI (dari design-taste-guide)
- [ ] P0 = 0 (gradient purple, Inter everywhere, centered hero+3 cards, untouched shadcn, glass refleks, gradient text)
- [ ] P1 ≤1 (rounded-2xl everywhere, icon chip, emoji bullets, default shell `container mx-auto px-4`)
- [ ] Diversifikasi: macrostructure & theme beda dari 2 build terakhir (hallmark rule)

## 7.2 Daftar hitam SLOP spesifik SapaTamu (jangan diulang di project baru)

| SLOP di repo lama | Kenapa buruk | Fix canon |
|-------------------|--------------|-----------|
| Hardcode `SB_URL/SB_KEY/SCRIPT_URL/Mid-client/CSRF secret` inline 15+ file | secrets leak, rotate mustahil | `config.js` + env `window.*_CONFIG` |
| 5 font families campur (`Montserrat` di katalog vs `Lora` vs `Outfit`) | load penalty, inkonsisten | max 2 families — `00-canon-tokens.md` |
| `cdn.tailwindcss.com` di 80% pages + `assets/tailwind.css` built | double-load 300KB, purge miss | single pipeline `assets/tailwind.input.css` |
| `tailwind.config content hanya 5 files` mismatch 20+ html pakai Tailwind | purge hilangkan class, style hilang random | `content: ["./*.html","./assets/**/*.js","./lib/**/*.js"]` |
| Hearts CSS `dynamic-bg`/`dynamic-bg-main` copy-paste 10 variasi 60+ li | 600 lines drift, maintain hell | 1 mixin/file `hearts.css` import |
| 40% CSS inline `style=` di semua HTML | tidak bisa theming, CSP unsafe-inline terpaksa | extract ke tokens.css |
| Dua IndexedDB `sapatamu_offline_db` vs `SapaTamuOfflineDB` + encrypt vs plain | race, confusing | satu `offline-db.js` |
| CSP duplikat 3 sumber (`vercel.json` vs `<meta>` vs `middleware`) drifting | policy inkonsisten, bypass | single `vercel.json` |
| Monolith HTML 80k–375k single file (`formulir 7055 lines`) | unmaintainable, no modules | split `lib/` components |
| `react/react-dom/pdf-parse/playwright` unused deps | bundle waste 1377 | hapus deps tidak pakai |
| `el.innerHTML = userData` tanpa sanitize 8+ file | XSS | `sanitizeHTML` everywhere (seperti `welcome.html`) |
| Password/OTP di URL `?ssId&user` | readable, leak via logs | httpOnly cookie |
| Modal fixed 340px tidak responsive | overflow di 320px | `width:min(400px,92vw)` |
| Graphify rules drift `AGENTS.md` vs `AGENT.md` | agent bingung | merge single source |
| `__sapaPerf` 20-entry spamming console tiap page | noise, storage churn | throttle atau hapus di prod |

## 7.3 Stamp provenance (wajib di CSS project baru)

```css
/* Sapatamu-Projects · canon v1 · tokens: warm Rose/Gold · nav: island · perf: skeleton+cache · offline: 7stores · guard: dual */
```

Tambah bersama stamp `design-taste-guide`:

```css
/* Design Taste Guide · direction: <name> · palette: 60:30:10 <dominant>/<secondary>/<accent> */
/* Sapatamu-Projects · canon v1 · layout: <grid> · nav: island · perf: skeleton+cache · offline: 7stores */
```

## 7.4 Deep-dive sources

- `animations.css:1` — motion + scrollbar
- `animations.js:1` — hero + stagger
- `config.js:1` — config/CSRF/session
- `offline-db.js:1` — 7 stores
- `sync-engine.js:1` — 30s engine
- `vercel.json:1` — headers + rewrites
- `sw.js:1` — PWA v5
- `subdomain_resolver.js`, `auth_guard.js`, `middleware.js`
- `index.html`, `dashboard.html`, `guestbook.html`, `vendor-dashboard.html`, `formulir_tamu.html`, `checkin/onsite/kiosk/welcome/analytics.html`
- Skills: `instant-skeleton-loading`, `live-progress-ux`, `ui-ux-pro-max`, `design-taste-guide`
