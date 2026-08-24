# 07 — Pre-Flight Checklist & Slop Test (Gate sebelum emit)

> Sumber: hallmark slop-test (57 gates) + pre-emit self-critique (6 axes) + avoid-ai-design severity + taste-skill dials
> Jalankan checklist ini **sebelum** serahkan HTML ke user. 0×P0 adalah necessary but not sufficient — harus juga lolos 3 success tests.

---

## 7.1 Gate severity (dari avoid-ai-design)

| Tier | Arti | Target |
|------|------|--------|
| **P0** — layperson kenali AI | purple→blue gradient, Inter everywhere, centered hero+3 cards, untouched shadcn zinc, glassmorphism refleks, gradient bg-clip-text | **0** |
| **P1** — designer kenali | rounded-2xl shadow-lg everywhere, icon-in-rounded-square, emoji bullets, default blue buttons, Elevate copy, default page shell, 4-col footer | **≤1** (fix sisanya) |
| **P2** — craft polish | flat uniform spacing, no motion atau same fade-up everywhere | fix jika sempat, jangan lead audit |

Quick pass = fix P0+P1. Full audit = semua.

## 7.2 Pre-emit self-critique — 6 axes (dari hallmark, score 1–5)

Sebelum emit, score halaman 1–5 di 6 axes. **<3 = revisi mandatory.**

| Axis | Tanya |
|------|-------|
| **Philosophy** | Apakah ada 1 ide yang di-commit (bukan template)? |
| **Hierarchy** | Bisakah user scan apa yang penting dalam 3 detik? |
| **Execution** | Apakah tokens, spacing, type, contrast dieksekusi presisi? |
| **Specificity** | Apakah detail spesifik untuk brief ini (bukan generik)? |
| **Restraint** | Apakah tidak over-designed — restraint yang dieksekusi baik > maximalism buta? |
| **Variety** | Apakah beda dari 2 output terakhir (bukan re-run)? |

Stamp 6 scores di CSS comment.

## 7.3 Three success tests (dari avoid-ai-design — beyond catalog pass)

Catalog clean (0 P0) saja tidak cukup. Harus lolos 3:

1. **Justified** — tiap perubahan serve committed direction, bukan reflex lain.
2. **Coherent** — type pairing + palette stance + layout + signature detail saling reinforce 1 ide.
3. **Not a re-run** — bukan same "safe default" seperti pass terakhir (warm-paper-serif move, satu stock accent). Vary deliberate.

Halaman bisa lolos catalog tapi gagal ketiganya — catalog tangkap cliché, tests tangkap mediocrity.

## 7.4 Checklist emit (copy ke PR — centang semua)

### Tokens & typography
- [ ] `:root` tokens OKLCH + `var()` refs — no inline hex/oklch di components
- [ ] 1 display + 1 body (+ mono jika angka) — max 2–3 weights, `font-display: swap`
- [ ] No Inter solo, no Fraunces/Instrument Serif default tanpa alasan spesifik
- [ ] Heading roman, italic hanya body emphasis; descender clearance jika italic display
- [ ] No italic headers (hallmark gate 38a)
- [ ] No re-drawn fake browser/phone/code chrome (gate 47)

### Color 60:30:10
- [ ] 60:30:10 terasa (dominant restful, accent rare 1 hue, saturasi <80% unless playful)
- [ ] 1 accent untuk whole page — tidak warm-grey lalu CTA biru section 7
- [ ] Contrast AA pass light & dark (body 4.5:1, large 3:1)
- [ ] No purple→indigo→blue gradient hero tanpa brand reason
- [ ] No premium-consumer banned hexes (`#f5f1ea/#b08947/#1a1714` combo) jika brief premium

### Layout & components
- [ ] 1 macrostructure committed + named (bukan Specimen default kecuali editorial)
- [ ] Nav archetype bukan N1a default tanpa alasan; footer bukan Ft3 4-col tanpa sitemap real
- [ ] No centered hero+ pill badge + 3 identical cards (L1/L2)
- [ ] No `rounded-2xl shadow-lg` seragam di semua surfaces — variasi = hierarchy
- [ ] No side-stripe cards, no card-in-card, no pill badge sparkle tanpa news real
- [ ] No default 4-col footer jika links tidak real
- [ ] Icon set 1 family (Phosphor/Tabler/Hugeicons), strokeWidth konsisten, no hand-roll SVG, no emoji system
- [ ] All interactive states: default·hover·focus-visible·active·disabled·loading·error·success (component-scope) atau minimal hover+focus+active+disabled (page)
- [ ] No invented metrics/testimonials/logos — `—` + grey block atau angka real

### Responsive (3 buckets)
- [ ] 320 / 375 / 414 / 768 px — no horizontal scroll, no 2-line clickable text
- [ ] `overflow-x: clip` di html,body (bukan hidden)
- [ ] `minmax(0, 1fr)` untuk image tracks, `overflow-wrap: anywhere; min-width: 0` untuk display headers
- [ ] Section heads 1 col di mobile, hero `min-h-[100dvh]` bukan `h-screen`
- [ ] Spacing scale 4pt rhythm — tidak uniform `gap-4/p-6` everywhere

### Motion & a11y
- [ ] Motion: ≤3 primitives, shared easing/duration, staggered entrance (bukan same fade-up everywhere)
- [ ] `prefers-reduced-motion` respected
- [ ] Semantic HTML + alt + label + heading hierarchy + focus indicators + keyboard nav

### Gate count
- [ ] P0 = 0 · P1 ≤1 · P2 noted
- [ ] Self-critique 6 axes ≥3 semua
- [ ] 3 success tests pass (Justified / Coherent / Not a re-run)
- [ ] Diversification: macrostructure & theme beda dari last build (cek `.hallmark/log.json`)

## 7.5 Stamp provenance (wajib di CSS)

**Page (vanilla HTML):**
```css
/* Design Taste Guide · direction: <name> · palette: 60:30:10 <dominant>/<secondary>/<accent> (#hex / oklch)
 * type: <display> + <body> (+ mono) · layout: <macrostructure> · nav: <archetype> · footer: <archetype>
 * responsive: 320/375/414/768 pass · motion: <primitives or none> · preflight: P0:0 P1:≤1 · critique: P? H? E? S? R? V?
 */
:root {
  --font-display: "...";
  --font-body: "...";
  --color-paper: oklch(...);
  --color-accent: oklch(...);
  /* locked tokens — semua ref via var() */
}
```

**Component (dari hallmark):**
```css
/* Design Taste Guide · component: <type> · genre: <genre> · direction: <name>
 * states: default · hover · focus · active · disabled · loading · error · success
 * contrast: pass (4.5:1 body, 3:1 large) — light & dark
 */
```

## 7.6 Mode audit vs rewrite

| Mode | Trigger | Output |
|------|---------|--------|
| **audit / detect** | `audit`, `flag only`, `detect`, `scan`, `don't change code` | Grouped P0/P1/P2 + lokasi `file:line` + code-certain/inferred + assessment fix vs leave. No edits. |
| **rewrite** (default) | else | Audit → Direction (5 moves) → Rewrite (calibrated depth) → What changed → Re-audit + 3 tests. Surgical jika component/inside design system; rebuild jika standalone page. |

## 7.7 Hallmark diversifikasi (jika `.hallmark/log.json` ada)

- Last 3–5 entries → macrostructure pick harus beda dari 3 terakhir
- Theme pick harus beda minimal 1 axis (paper band / display style / accent hue)
- Enrichment tidak same archetype berurutan
- Jika user override ("pakai Bento Grid lagi") → same archetype boleh tapi knob values harus beda (tiles/accent/spans)

## 7.8 File sumber untuk deep-dive

- `avoid-ai-design/references/ai-tells-catalog.md` — full catalog T1–T5/C1–C6/L1–L8/K1–K9/S1/M1–M3/I2–I3/CP1–CP3/IM1–IM4
- `avoid-ai-design/references/aesthetic-directions.md` — 8 directions detail
- `hallmark/references/anti-patterns.md` — critical tells (purple hero, Inter-everywhere, 3-col grid, card-in-card, gradient headline, side-stripe, pure black/white, AI nav/footer, aurora blob)
- `hallmark/references/slop-test.md` — 57 gates + pre-emit critique detail
- `hallmark/references/typography.md` + `color.md` + `layout-and-space.md` + `motion.md` + `responsive.md`
- `taste-skill/SKILL.md` §0–4 — brief inference, dials, stack, typography/color discipline
