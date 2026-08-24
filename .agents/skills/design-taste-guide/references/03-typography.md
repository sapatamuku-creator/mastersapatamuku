# 03 — Typography: Hirarki, Pairing & Filosofi Brand

> Sumber: taste-skill §4.1 + avoid-ai-design T1–T5 + hallmark typography.md + riset 2026 (Penpot, LayoutScene, Octopus)
> Prinsip: typography hierarchy = narasi voice brand. 90% komunikasi brand = teks. Hierarchy yang buruk = bounce.

---

## 3.1 Sistem skala (fluid, bukan static)

Gunakan **modular scale** (ratio 1.2 minor-third untuk calm, 1.333 perfect-fourth untuk editorial).
Jangan random size. Contoh system (dari LayoutScene 2026):

```
--text-xs:   clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)
--text-sm:   clamp(0.875rem, 0.82rem + 0.28vw, 1rem)
--text-base: clamp(1rem, 0.95rem + 0.25vw, 1.125rem)   /* body, max 65ch */
--text-lg:   clamp(1.125rem, 1rem + 0.6vw, 1.375rem)
--text-xl:   clamp(1.25rem, 1.1rem + 0.8vw, 1.75rem)    /* h4 */
--text-2xl:  clamp(1.5rem, 1.3rem + 1vw, 2rem)          /* h3 */
--text-3xl:  clamp(1.875rem, 1.6rem + 1.4vw, 2.5rem)    /* h2 */
--text-4xl:  clamp(2.25rem, 1.8rem + 2.2vw, 3.5rem)     /* h1 */
--display:   clamp(2.5rem, 2rem + 3vw, 4.5rem)          /* hero display, tracking-tighter leading-none */
```

**Line-height:** body `1.6–1.7`, heading `1.0–1.1`, display `1.0 + pb-1` jika italic descender (`y g j p q`).
**Measure:** body `max-width: 65ch`, heading bebas. `rem` units agar respect user font-size.
**Tracking:** display `tracking-tighter` (-0.02em), eyebrow `tracking-widest` (+0.12em) — hanya untuk eyebrow, jangan semua caps.

Implementasi Figma: Text Styles H1–H6 + Body Large/Medium/Small + Caption + Button, each dengan size/weight/leading/tracking + variables.

## 3.2 Pairing — filosofi per brand & look visual trend

### Aturan pairing (dari taste-skill + hallmark)

- **1 display + 1 body** (max 2 families, variasi weight). >3 fonts = clutter.
- **Display = personality**, body = readability. Jangan 2 sans mirip yang clash subtle.
- **Family sama untuk emphasis:** italic/bold family yang sama, bukan suntik serif acak di sans headline.
- **Mono untuk data/angka:** POS price, ERP table, SaaS metric — angka harus mono (`JetBrains Mono`/`Berkeley Mono`) agar align & scannable.
- **Load via `next/font` atau `@font-face` + `font-display: swap`.** Jangan `<link>` Google Fonts di production.

### Pairing siap pakai per vibe (rotate — jangan reuse 3 project berturut)

| Vibe | Display | Body | Mono (jika perlu) | Filosofi |
|------|---------|------|-------------------|----------|
| **SaaS / ERP / CRM** (utilitarian, trust) | Geist / Söhne Breit / Sora | Geist / Inter Tight / Satoshi | JetBrains Mono / Geist Mono | Swiss lineage — netral, scalable, timeless. Counter: risk terlihat identical → bedakan via accent & layout, bukan font. |
| **Marketplace / eCommerce** (consumer trust + browse) | Cabinet Grotesk / GT America | Satoshi / Manrope / Outfit | — | Geometric humanist — hangat tapi modern, konversi-friendly |
| **Editorial / HR** (humanis, voice) | Fraunces / GT Sectra / Tiempos Headline / Canela | Hanken Grotesk / Untitled Sans / Suisse | — | Serif display = heritage/craft/luxury. Hanya jika brand memang editorial/luxury — jika tidak, pakai sans display (Söhne Breit Kursiv, Migra Sans). |
| **POS** (speed, angka) | Outfit / Aktiv Grotesk | Inter / Outfit | Berkeley Mono / JetBrains Mono | Angka besar, mono, high contrast — kasir scan <1s |
| **Luxury / Fintech** | Canela / GT Super / Reckless Neue / Playfair | Suisse / Untitled Sans | — | High-contrast serif = prestige, restraint, space sebagai flex |
| **Playful / Consumer** | Plus Jakarta Sans (Hum) / Rounded sans / PP Neue Montreal | Satoshi / Outfit | — | Rounded = friendly, bouncy — jangan pakai untuk ERP |
| **Brutalist / Devtool** | Helvetica Now / Commit Mono | Aktiv Grotesk / Mono solo | Commit Mono | Satu face kuat, tight, honest |

### Serif discipline (taste-skill — VERY DISCOURAGED default)

Serif **hanya** jika:
- Brief menyebut serif eksplisit, ATAU
- Aesthetic editorial/luxury/heritage/vintage DAN bisa artikulasikan kenapa serif ini untuk brand ini.

Untuk creative agency / design studio / modern brand / portfolio → **default sans display** (bukan serif). Serif default = AI tell paling teruji di production rounds.

**BANNED default:** `Fraunces` (LLM favorite #1) + `Instrument Serif` (LLM favorite #2) sebagai default tanpa alasan spesifik.

Jika serif justified, rotate pool (jangan reuse): PP Editorial New, GT Sectra Display, Cardinal Grotesque, Reckless Neue, Tiempos Headline, Recoleta, Cormorant Garamond, Playfair Display, EB Garamond, IvyPresto, Migra, Editorial Old, Saol Display, Söhne Breit Kursiv, Domaine Display, Canela, Schnyder, Tobias.

## 3.3 Hirarki visual — 6 level (dari Penpot & LayoutScene)

Setiap halaman harus punya 6 level yang terbaca dalam 3 detik:

1. **Display / Hero** — 1 kalimat, paling besar, paling bold, paling kontras. `text-4xl md:text-6xl tracking-tighter leading-none`
2. **Section heading (H2)** — struktur, `text-2xl–3xl`, weight 600–700, margin top besar (ritme spacing)
3. **Subheading / H3** — `text-xl–2xl`, weight 600, dekat dengan body di bawahnya (proximity)
4. **Body** — `text-base text-gray-600 leading-relaxed max-w-[65ch]` — 45–75 char/line, ragged-right, jangan justify
5. **Caption / Label** — `text-sm`, muted, untuk metadata (tanggal, kategori, helper)
6. **Micro / Eyebrow** — `text-xs tracking-widest uppercase` — hanya jika ada, jangan tiap section

**Prinsip Gestalt (dari research):**
- **Size + weight = importance** — jangan semua `font-medium`.
- **Proximity = hubungan** — heading dekat body-nya, jauh dari section lain.
- **Whitespace = komposisi** — crowd some, isolate hero. Even spacing = flat hierarchy (S1/P2).
- **Contrast = emphasis** — bukan warna saja, tapi size/weight/position.

## 3.4 Fluid & responsive type

- Desktop → tablet → mobile: size turun via `clamp()`, bukan breakpoint jump.
- Mobile display heading: `overflow-wrap: anywhere; min-width: 0` + pastikan tidak overflow-x.
- Jangan 2-line clickable text (button/nav/footer) — hallmark gate 49.
- Dark/light mode: cek kontras AA (4.5:1 body, 3:1 large) di kedua mode.

## 3.5 Checklist typography (copy ke PR)

- [ ] 1 display + 1 body (+ mono jika angka) — max 2–3 weights
- [ ] Scale clamp fluid, bukan fixed px
- [ ] Measure 45–75ch body, ragged-right
- [ ] Heading roman, italic hanya body emphasis
- [ ] Descender clearance jika italic display (`leading-[1.1]` + `pb-1`)
- [ ] No Inter solo, no Fraunces default tanpa alasan
- [ ] Kontras AA pass light & dark
