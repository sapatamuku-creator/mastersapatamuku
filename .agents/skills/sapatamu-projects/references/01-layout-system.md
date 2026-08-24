# 01 — Layout System (Grid, Container, Breakpoints, Section)

> Disarikan dari `index.html`, `dashboard.html`, `guestbook.html`, `vendor-dashboard.html`, `formulir_tamu.html`, `analytics.html`, `welcome.html`, `checkin/onsite/kiosk.html`, `tailwind.config.js`, `vercel.json` rewrites

## 1. Breakpoints canon (3 bucket wajib — AGENTS.md)

| Bucket | Media | Perilaku canon |
|--------|-------|----------------|
| Mobile | `<768` | 1 col, `gap-4`, `p-4`, hamburger/drawer/bottom-sheet aktif, nav-scroll, details-row jadi card |
| Tablet | `768–1023` | 2 cols, `gap-6`, `p-6`, station-selector jadi island capsule, sidebar collapsible |
| Desktop| `≥1024` | 3–4 cols / asymmetric, `gap-6–8`, `p-8`, fixed sidebar 260 jika dashboard |

**Aktual extra points di codebase** (jangan tambah tanpa alasan): `520` hide search, `640` 1-col, `900` dash layout switch, `1023.98` max-tablet. Tech debt: banyak file desktop-first `max-width` campur mobile-first — project baru **wajib mobile-first** (`min-width`).

Use `clamp()` untuk judul: `clamp(28px,6vw,36px)` brand, `clamp(10px,3vw,13px)` tagline, `clamp(0.7rem,1.1vw,1.2rem)` time.

Viewport scanner pages: `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no` hanya untuk `kiosk/checkin/onsite` — jangan di marketing.

## 2. Container & gap

```
--container-sm: 680px   /* search card index */
--container-md: 900px   /* dashboard main-wrapper */
--container-lg: 1200px  /* marketplace navbar, content */
--container-xl: 1400px  /* formulir_tamu max */
Gap: 24/16/8 — section padding 80/48/60 — card padding 20–50
```

## 3. Grid per jenis halaman (copy pattern — jangan invent)

**Marketing/Guestbook** (`guestbook.html:2587`)
```css
.hero { display:grid; grid-template-columns: 1.1fr 0.9fr; gap:60px; padding:160px 8% 100px; }
@media(max-width:1024px){ .hero{grid-template-columns:1fr} }
.sim-grid{grid-template-columns:1fr 1fr; gap:18px}
.services{grid-template-columns:repeat(3,1fr); gap:40px}
```

**Marketplace/Index**
```css
.kategori-grid{grid-template-columns:repeat(auto-fit,minmax(110px,1fr)); gap:14px; max-width:900px; margin:auto}
.kota-grid{grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:16px}
.vendor-grid{grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:20px}
.marquee-track{display:flex; width:max-content; animation:marqueeScroll 34s linear infinite}
.marquee-track:hover{animation-play-state:paused}
```

**Dashboard Hub** (`dashboard.html:1613`)
```css
.main-wrapper{max-width:900px; margin:0 auto; padding:100px 20px 50px}
.nav-container{display:grid; grid-template-columns:1fr; gap:20px}
@media(min-width:768px){.nav-container{grid-template-columns:repeat(2,minmax(0,1fr))}}
.nav-item{display:flex; gap:20px; padding:25px; border-radius:24px; background:rgba(255,255,255,0.85); backdrop-filter:blur(15px); border:1px solid var(--border); box-shadow:var(--shadow-sm)}
.nav-item:hover{transform:translateY(-4px); border-color:var(--gold); box-shadow:var(--shadow-md)}
```

**Formulir (admin)** (`formulir_tamu.html:7055`)
```css
.main-layout{display:grid; grid-template-columns:1fr; gap:40px; max-width:1400px; margin:auto}
@media(min-width:1024px){.main-layout{grid-template-columns:450px 1fr} .form-panel{position:sticky; top:80px; border-radius:32px; box-shadow:var(--shadow-lg)}}
@media(max-width:1023px){.form-panel{position:fixed; bottom:0; height:50vh; border-radius:25px 25px 0 0; transform:translateY(calc(100% - 64px)); transition:transform 0.38s var(--ease-drawer)} .form-panel.is-expanded{transform:translateY(0)}}
```

**Vendor Dashboard** (`vendor-dashboard.html:2277`)
```css
.dash-layout{display:grid; grid-template-columns:260px 1fr}
@media(max-width:900px){.dash-layout{grid-template-columns:1fr}}
.sidebar{position:sticky; top:0; height:100vh; background:var(--surface); border-right:1px solid var(--border)}
.stats{grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:20px}
.pkg-grid{grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:24px}
.mobile-tabs{position:sticky; top:0; display:flex; overflow:auto; gap:8px} /* <900 */
```

**Operational (checkin/onsite/kiosk)**
```css
.app-root{display:flex; flex-direction:column; height:100vh; overflow:hidden}
.header{padding:80px 20px 20px; background:rgba(255,255,255,0.65); backdrop-filter:blur(8px); border-bottom:1px solid var(--border)}
.main-content{display:flex; gap:10px; padding:10px; flex:1; overflow:hidden}
.scanner-wrapper{width:250px; aspect-ratio:1; border-radius:24px; border:4px solid #fff; box-shadow:var(--shadow-lg)}
.list-wrapper{display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:12px; overflow:auto}
.details-row{display:flex; gap:10px; padding:8px 12px; background:#fff; border:1px solid var(--border); border-radius:12px; contain:layout style paint; content-visibility:auto; contain-intrinsic-size:44px}
```

**Welcome TV** (`welcome.html`)
```css
.master{position:fixed; inset:0; display:grid; grid-template-columns:1.2fr 2.8fr; height:100vh; background:#000}
@media(max-width:1024px){.master{grid-template-columns:1fr}}
.timeline{background:#0a0a0a; padding:4vh 2.5vw; border-right:1px solid #222}
```

**Analytics** (`analytics.html`)
```css
.master{grid-template-columns:1fr 3.8fr; height:100vh}
.sidebar{background:linear-gradient(#FFFBF9,#FFF5EE); padding:clamp(12px,2vw,32px)}
.dashboard-grid{grid-template-columns:repeat(2,1fr); gap:16px}
@media(max-width:768px){.master{grid-template-columns:1fr} .dashboard-grid{grid-template-columns:1fr}}
```

## 4. Section header canon

```css
.section-header .overline{font-size:0.75rem; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; color:var(--gold)}
.section-header h2{font-size:clamp(1.6rem,3vw,2.2rem); font-weight:800; color:var(--text-main)}
.section-header p{color:var(--text-muted); max-width:65ch}
```

## 5. Card canon

```css
.card{background:var(--card); border:1px solid var(--border); border-radius:14px 20px 24px; /* pilih 1 */ box-shadow:var(--shadow-sm); padding:20px 25px}
.card:hover{transform:translateY(-4px); box-shadow:var(--shadow-md); border-color:var(--border-strong)}
.card.selected{border-color:var(--primary); box-shadow:0 0 0 3px var(--primary-soft)}
```

## 6. Rewrites SEO (jangan hardcode path)

Pakai `vercel.json` rewrites — jangan link langsung ke `marketplace.html?cat=`:

```
/kategori/:slug → /marketplace?cat=:slug
/kota/:kota → /marketplace?kota=:kota
/store/:slug → /store-product?slug=:slug
/vendor/:slug → /vendor-profile?slug=:slug
/product/:id → /vendor-product.html?id=:id
```

Grid marketplace harus baca `?cat` & `?kota` dari URL, bukan hardcode filter.
