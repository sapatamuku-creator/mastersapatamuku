# 05 — Layout: Komposisi Rasio per Vertikal (SaaS / POS / CRM / eCommerce / ERP / HR)

> Sumber: Eleken SaaS patterns, SaaSFrame June/Stripe, 925studios 35 dashboards, AdminLTE 22 templates
> + hallmark 21 macrostructures + structure.md + component-cookbook (50 archetypes)
> Prinsip: Tiap vertikal punya "hero" yang berbeda. Struktur harus encode job-to-be-done, bukan template.

---

## 5.0 Aturan umum senior frontend (berlaku semua vertikal)

- **One layout = one job.** Jangan dump semua metric ke wall of tiles. Mulai minimal, biarkan user tambah complexity (modular > rigid).
- **5–9 metric di default view** (Plausible 6, Stripe 3–4). Lebih = customizable widgets, bukan default.
- **Hierarchy = size × position × whitespace.** Metric terpenting = paling besar, paling atas (full-width summary bar sebelum grid — HubSpot pattern).
- **Asymmetry > symmetry** untuk interest; symmetry hanya jika intentional (Luxury/Art Deco).
- **Container ≠ satu width selamanya.** Variasi width per section role; beberapa full-bleed, beberapa narrow editorial.
- **Grid > flex-math.** `grid grid-cols-1 md:grid-cols-3 gap-6` bukan `w-[calc(33%-1rem)]`.
- **Nav & footer adalah fingerprint.** Jangan default N1a (wordmark+5 links+CTA sticky) & Ft3 (4 kolom). Pilih dari routing table hallmark sesuai genre.

---

## 5.1 SaaS (default untuk SapaTamu — guestbook/undangan adalah SaaS + marketplace hybrid)

**Job:** activation & operational control — tunjukkan value dalam detik, bantu action bukan cuma observe.

**Rasio komposisi area:**
```
60% data surface (metric cards, charts, tables) — canvas putih/light
30% nav & chrome (sidebar/topbar, filter bar, secondary nav)
10% CTA & status (primary action, trend indicators, anomaly dots)
```

**Layout patterns (pick one — jangan mix tanpa alasan):**

| Pattern | Cocok untuk | Struktur Tailwind |
|---------|-------------|-------------------|
| **Fixed Sidebar + Scrollable Main** (Stripe/Linear/Notion) — most common | SaaS full app, SapaTamu dashboard/owner/vendor | `flex h-screen` · sidebar 240–280px fixed · main `overflow-auto` |
| **Executive Snapshot** — stat cards top | Overview / Analytics | Full-width summary bar (1 metric besar) → grid KPI tiles → charts → activity feed |
| **Operational Control Panel** — filters visible | Sortir / tamu / monitoring | Filter sidebar visible (bukan hidden icon) + KPI top + table main |
| **Bento Grid** (Apple-style) | Marketing page, dashboard overview | Irregular tiles, large spans for primary metric — hanya jika importance beda & size encode itu |
| **Client Dashboard** (presentation-ready) | Vendor profile / katalog publik | Calm, single-metric hero, explain movement bukan display saja |

**Hierarchy SaaS:**
1. Top: KPI tiles dengan trend vs last month + anomaly signals
2. Middle: charts (1 chart yang user paham tanpa hover = success; 5–9 elements max)
3. Bottom: activity feed / table dengan progressive disclosure (count → drill-down)
4. Filter: visible sidebar bukan hidden icon; global filter update semua widgets

**Contoh SapaTamu mapping:**
- Dashboard owner: Executive snapshot (total tamu + hadir + pending di top bar besar) → grid 3 KPI → chart kehadiran → tabel tamu
- Sortir: Operational control (filter kategori di sidebar visible + label) → grid tamu dengan drag-drop
- Vendor-dashboard: Modular — user rearrange widgets, global date filter

**Anti-pattern SaaS:**
- Wall of cards identik 3×N (L2/P0) — vary size/density
- Stat strip invented numbers (L4/P1) — pakai angka real atau `—`
- Fixed layout tanpa role-awareness — admin vs member vs billing-owner beda controls (RBAC)

---

## 5.2 eCommerce / Marketplace (SapaTamu marketplace & katalog undangan)

**Job:** browse → decide → buy. Product canvas harus hero, bukan chrome.

**Rasio:**
```
60% product canvas (putih, product cards & detail)
30% filter & card chrome (sidebar filter, card border, nav)
10% price & CTA (price, badge, Add to Cart / Pilih Paket)
```

**Layout:**
- **Listing:** sidebar filter (visible, dengan label — jangan icon-only) + product grid 2–4 cols (responsive: 1 col mobile). Cards: thumbnail besar (visual recognition > text), price mono, 1 CTA. Jangan icon-in-rounded-square (K6) — pakai foto product real.
- **Detail (store-product / vendor-product):** split — left gallery besar, right info + price + CTA sticky. Tabs untuk specs/reviews.
- **Checkout/cart:** single column narrow, progress stepper, trust signals dekat CTA.

**Tokens:** 60 white paper agar foto pop, 30 light grey containers, 10 warm accent untuk price/CTA. Kontras price harus AA.

---

## 5.3 POS (Point of Sale)

**Job:** speed — transaksi <3 tap, scannable dari 1m, tahan error.

**Rasio:**
```
60% transaction canvas (cart / bill area — paling besar, paling kontras)
30% catalog grid (product tiles, category tabs)
10% Pay CTA (satu tombol dominan) + status semantic (void=red, discount=amber)
```

**Layout:**
- **Split 60/30:** left/bawah = catalog grid (tiles besar, tap target ≥44px, gambar + nama + price mono), right/atas = cart/bill (list items, total besar mono, Pay CTA full-width).
- **Category filter:** horizontal tabs / pills di atas catalog, visible, dengan label teks (bukan icon-only — Eleken: non-technical users butuh label).
- **Numpad / barcode:** jika ada, di dekat cart; jangan overlay catalog.

**Disiplin:**
- Angka (price, total, qty) = mono, besar, high contrast.
- States: disabled (stok 0), loading (sync), error (payment failed) — semua visible.
- Density tinggi tapi tidak cramped — 4pt scale, gap consistent.

---

## 5.4 CRM (Customer Relationship)

**Job:** relationship timeline — siapa, kapan terakhir kontak, next action.

**Rasio:**
```
60% list / timeline (contacts, deals, pipeline)
30% detail drawer / panel (contact detail, activity)
10% status & action (stage badge, Next Action CTA, priority dot)
```

**Layout:**
- **Pipeline view:** horizontal stages (Kanban) atau table dengan stage color coding — stage = kolom, bukan row.
- **Contact view:** list (60) + detail drawer (30) — drawer slide, bukan page baru. Timeline aktivitas vertikal dengan dots.
- **Summary bar:** pipeline value besar di top (HubSpot pattern) sebelum grid widgets.
- **HubSpot borrow:** full-width summary bar untuk primary metric sebelum grid.

**Disiplin:**
- Avatar real (bukan DiceBear/IM4) atau inisial dengan warna dari palette.
- Status via semantic color (bukan left-border stripe K4) — badge muted + dot.
- Search & filter global yang update semua widgets.

---

## 5.5 ERP (Enterprise Resource Planning)

**Job:** density + accuracy — tabel, form, approval flow, audit trail.

**Rasio:**
```
60% table/form canvas (data grid, form fields)
30% nav & filter bar (sidebar nav, filter/comparator, tabs)
10% status semantic (approved/pending/rejected, approval CTA)
```

**Layout:**
- **Tables:** density high, tapi column width intentional; sticky header; row hover; inline actions. Jangan card-in-card (hallmark anti-pattern).
- **Forms:** single column untuk creation, multi-column hanya untuk related fields; validation states visible (K7).
- **Approval flow:** timeline/stepper horizontal di top, detail di bawah.

**Disiplin:**
- Swiss typographic direction — mono untuk IDs/numbers, sans untuk labels.
- Contrast AA wajib (ERP dipakai 8 jam/hari — eye strain).
- Spacing scale ketat, grid matematis. Whitespace = struktur, bukan dekorasi.

---

## 5.6 HR (Human Resource)

**Job:** people-first — calo, hangat, trust, whitespace luas (bukan corporate blue generik).

**Rasio:**
```
60% people canvas (employee cards, org chart, timeline)
30% card & timeline chrome (profile cards, leave timeline, docs)
10% accent humanis (warm terracotta/sage, celebration, CTA)
```

**Layout:**
- **Directory:** card grid dengan foto real (bukan stock diverse team IM1), nama + role + status dot. Search + filter department.
- **Profile:** header humanis (foto besar + bio) → timeline (join, reviews, leaves) → docs.
- **Leave/attendance:** calendar + list hybrid; calendar untuk decision immediate (Eleken pattern).
- **Org chart:** tree, bukan list.

**Disiplin:**
- Organic/Soft direction — Hanken Grotesk / humanist sans, warm neutrals (tapi bukan banned `#f5f1ea/#b08947` combo — pakai Cold Luxury atau Forest alternative).
- Whitespace generous — calm, bukan dense ERP.
- Illustration jika ada: hand-built SVG > stock blob-people (IM3 banned).

---

## 5.7 Matriks perbandingan cepat

| Dimensi | SaaS | eCommerce | POS | CRM | ERP | HR |
|---------|------|-----------|-----|-----|-----|-----|
| **Hero** | KPI snapshot | Product photo | Cart total | Pipeline value | Table/form | People photo |
| **Density** | Medium-high | Medium | High (speed) | Medium | Very high | Low-medium |
| **Grid** | Bento / exec snapshot | Catalog 2–4 cols | 60/40 split | List+drawer / Kanban | Table + form | Card grid + timeline |
| **Nav** | Fixed sidebar 240–280 | Top + filter sidebar | Minimal (tabs) | Sidebar + pipeline tabs | Sidebar dense | Sidebar light |
| **Accent job** | CTA + trend | Price + Cart | Pay CTA | Next Action | Approval | Celebration |
| **Mono** | metrics | price | all numbers | IDs | IDs/numbers | jarang |
| **Whitespace** | structured | product breathing | tight functional | timeline breathing | mathematical | generous human |

---

## 5.8 Hallmark macrostructure mapping per vertikal (jangan default Specimen)

| Vertikal | Rekomendasi macrostructures (dari 21) |
|----------|--------------------------------------|
| SaaS dashboard | Stat-Led, Workbench, Bento Grid, Long Document |
| eCommerce listing | Photographic, Bento Grid, Workbench |
| POS | Workbench, Stat-Led (total sebagai stat) |
| CRM | Long Document, Conversational FAQ, Workbench |
| ERP | Long Document, Workbench, Grid |
| HR | Quote-Led, Long Document, Photographic, Manifesto (untuk culture page) |

**Diversification rule:** 2 halaman berurutan harus beda macrostructure + beda minimal 1 axis (paper band / display style / accent hue). Cek `.hallmark/log.json` atau ingat manual.
