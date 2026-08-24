# 06 — Responsive (3 Buckets) + Motion Discipline

> Sumber: AGENTS.md UI/UX rules + hallmark responsive.md + taste-skill §3 + Motion principles
> Project wajib: desktop ≥1024 · tablet 768–1023 · mobile <768. Jangan hanya 1 layout lalu abaikan lain.

---

## 6.1 3 Buckets — definisi & teknik

| Bucket | Width | Grid | Container | Type scale | Nav |
|--------|-------|------|-----------|------------|-----|
| **Mobile** <768 | 1 col default, `gap-4`, `p-4` | full-bleed atau `max-width: 100%` + `px-4` | `display` via `clamp()` — pastikan `overflow-wrap: anywhere; min-width: 0` | Hamburger / hidden ⌘K / floating pill collapsed |
| **Tablet** 768–1023 | 2 cols, `gap-6`, `p-6` | `max-w-3xl` centered, section heads collapse 1 col | size mid | Sidebar collapsible atau top tabs |
| **Desktop** ≥1024 | 3–4 cols / asymmetric, `gap-6–8`, `p-8` | `max-w-7xl` atau `max-w-[1400px] mx-auto`, asymmetric spans | full scale | Full nav sesuai archetype (N5 pill / N11 mega / N6 masthead dll) |

**Teknik wajib:**
- **Container/grid responsive atau media query konsisten** dengan file yang diedit — jangan campur.
- **`min-h-[100dvh]` bukan `h-screen`** untuk hero — cegah jump iOS Safari address bar.
- **`grid` over flex-math** — `grid-cols-1 md:grid-cols-3` bukan `w-[calc(...)]`.
- **`minmax(0, 1fr)` untuk grid tracks bawa image** — jangan bare `1fr` (hallmark gate 50).
- **Section heads collapse 1 col di mobile** di semua theme variant (gate 52).

## 6.2 Checklist responsive (test di 320 / 375 / 414 / 768)

Hard floor — semua harus pass sebelum emit (dari hallmark §5):

- [ ] No horizontal scroll + `overflow-x: clip` di `html, body` (bukan `hidden` — gate 34)
- [ ] No 2-line clickable text: button, nav links, footer links, breadcrumbs, CTA (gate 49)
- [ ] Image-bearing grid tracks = `minmax(0, 1fr)` (gate 50)
- [ ] Display headers `overflow-wrap: anywhere; min-width: 0` (gate 51)
- [ ] Section heads 1 col di mobile (gate 52)
- [ ] Radio-tab tidak scroll-jump (gate 53)
- [ ] Hero `min-h-[100dvh]` bukan `h-screen`
- [ ] `prefers-reduced-motion` respected (lihat 6.4)
- [ ] Touch targets ≥44px (POS/HR cards, POS catalog tiles)
- [ ] Tested 320 / 375 / 414 / 768 px — render flawless

## 6.3 Spacing scale (4pt)

```
--space-1: 4px  — tight (badge padding)
--space-2: 8px  — xs (icon gap)
--space-3: 12px — sm
--space-4: 16px — base (card padding mobile)
--space-6: 24px — md (card padding desktop, gap)
--space-8: 32px — lg (section gap mobile)
--space-12: 48px — xl (section gap desktop)
--space-16: 64px — 2xl (hero breathing)
--space-24: 96px — 3xl (page section rhythm)
```

Gunakan scale untuk ritme — beda vertical space per importance; whitespace sebagai komposisi (crowd some, isolate others). Uniform `gap-4`/`p-6` everywhere = S1/P2.

Tailwind: `theme.extend.spacing` 4pt atau CSS `--space-*` custom properties. Konsisten 1 system per project.

## 6.4 Motion discipline

### Durasi & easing (dari 2026 principles)

- UI animations: **200–300ms**, ambient: **3–6s**
- Easing: natural `ease-out` (fast start → slow end) atau spring (`stiffness 300, damping 30`)
- Stagger child: **50–100ms**
- GPU-only: `transform` + `opacity` — jangan animasi `width`/`height`/`top`

### Berapa banyak motion (taste-skill MOTION_INTENSITY + hallmark)

| MOTION | Kapan | Apa |
|--------|-------|-----|
| 2–3 (low) | Public-sector, ERP dense, trust-first | Hover only, no scroll reveal |
| 5–6 (mid) | SaaS / marketplace / HR (default) | 1–2 high-impact moments, staggered page-load entrance |
| 8–10 (high) | Agency / playful / Awwwards | Scroll/magnetic, kinetic type — tapi tetap ≤3 primitives |

**Hard rules hallmark:**
- Max **3 primitives** per page (contoh: `counter` · `pricing-lift` · `pulse-once`)
- **No same fade-up on everything** (M1/P2) — 1 well-staggered entrance > uniform reveal tiap block
- **No scattered micro-interactions** tanpa orchestration (M2/P2) — shared easing + duration scale + clear entrance
- **Respect `prefers-reduced-motion`:** `@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }`
- **RSC safety (Next.js):** komponen dengan Motion/scroll/pointer = isolated leaf `"use client"` — Server Components static only.
- **State tracking:** `useMotionValue`/`useTransform`/`useScroll` untuk continuous values (mouse/scroll) — jangan `useState` yang re-render tiap frame (collapse di mobile).

### CSS skeleton motion (vanilla — no lib)

```css
@media (prefers-reduced-motion: no-preference) {
  .reveal { opacity: 0; transform: translateY(12px); transition: opacity 300ms ease-out, transform 300ms ease-out; }
  .reveal.in { opacity: 1; transform: translateY(0); }
  .reveal:nth-child(2) { transition-delay: 80ms; }
  .reveal:nth-child(3) { transition-delay: 160ms; }
}
```

### Dengan Motion (React)

```js
import { motion } from "motion/react"; // bukan framer-motion legacy
<motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut", delay: 0.08 * i }} />
```

## 6.5 A11y yang terikat responsif

- Semantic HTML (`button`, `nav`, `main`, `article`, `section`) + `alt` + label form + heading hierarchy logis.
- Focus indicators visible, contrast cukup, spacing cukup.
- Keyboard nav: semua interactive reachable, focus trap di modal.
- `prefers-reduced-motion` + `prefers-reduced-transparency` fallback (solid fill jika glassmorphism).
