# 01 — Anti-Pattern: Katalog AI Tells (P0/P1/P2) + Fix

> Sumber utama: `avoid-ai-design/references/ai-tells-catalog.md` (full) + `hallmark/references/anti-patterns.md`
> + `taste-skill` §4 Design Engineering Directives.
> Aturan: P0 = orang awam langsung kenali AI; P1 = desainer notice; P2 = polish gap.
> Target emit = 0×P0, ≤1×P1. Token-swap saja (indigo→teal) tetap gagal — harus 1 arah estetika.

---

## Design Read (wajib sebelum audit — dari taste-skill §0)

Tulis 1 kalimat sebelum sentuh kode:

`Reading this as: <page kind> for <audience>, with a <vibe> language, leaning toward <system/aesthetic>.`

- Page kind: landing SaaS / marketplace / POS / CRM / ERP / HR / portfolio / form / dashboard / operational
- Audience: procurement panel vs consumer vs recruiter vs operator lapangan vs admin HR
- Vibe: editorial · brutalist · soft · utilitarian · luxury · playful · technical · austere (jangan "clean and modern")
- System/aesthetic: Tailwind vanilla + <font pairing> + <palette stance> — atau design system resmi jika brief enterprise (Fluent/Carbon/Polaris/Primer)

Jika ambigu dan inference bercabang → tanya **1 pertanyaan saja**, jangan dump.

---

## TYPOGRAPHY — T1..T5

### T1 · Inter / system stack untuk semuanya · P0
**Signal:** `font-family: Inter | -apple-system | system-ui | Roboto` sebagai satu-satunya face.
**Kenapa AI:** default tiap tool + component lib. Single neutral sans = tidak ada pilihan.
**Fix (vanilla):**
```css
:root { --font-display: "Fraunces", Georgia, serif; --font-body: "Hanken Grotesk", system-ui, sans-serif; }
h1,h2,h3 { font-family: var(--font-display); }
body { font-family: var(--font-body); }
```
**Fix (Tailwind):** map `font-display` + `font-sans` di config, load via `next/font` atau `@font-face` dengan `font-display: swap`. Jangan biarkan Geist/Inter solo.

### T2 · Kluster "tasteful free font" sebagai satu-satunya gesture · P1
**Signal:** Space Grotesk / Geist / Syne / Sora / Instrument Serif / Fraunces dipakai solo agar "tidak generik".
**Kenapa AI:** second-order default — semua model lari ke set kecil yang sama (~15.8% situs pakai ini).
**Fix:** pakai hanya jika cocok arah; selalu pairing. Rotasi pool: Hanken, Neue Haas, Aktiv, Söhne, GT Sectra, Tiempos, Newsreader, Berkeley/Commit mono. Aturan taste-skill: jangan ship font yang dipakai 3 project terakhir. **Fraunces & Instrument Serif BANNED sebagai default** — hanya jika brief editorial/luxury eksplisit.

### T3 · Satu kata serif-italic di headline sans · P1
**Signal:** headline sans dengan satu kata italic serif: `The *modern* way to ship`.
**Fix:** emphasis via weight/size/color dalam 1 family, atau italic/bold family yang sama. Jangan suntik serif acak. Jika mau kontras serif/sans, commit full, bukan garnish 1 kata.

### T4 · Geist untouched di Next.js · P1
**Signal:** `GeistSans`/`GeistMono` dari `next/font` tanpa theming.
**Fix:** replace/pair deliberate. Mono boleh stay untuk code, heading wajib face milik brand.

### T5 · Eyebrow ALL-CAPS di setiap section · P2
**Signal:** tiap section dibuka label uppercase tracked-out.
**Fix:** pakai hemat. Variasi: angka, pertanyaan pendek, lowercase kicker, atau tanpa eyebrow.

**Tambahan taste-skill (serif discipline):** serif sangat discouraged sebagai default. Hanya jika brand brief menyebut serif ATAU aesthetic editorial/luxury/heritage dengan alasan spesifik. Emphasis dalam headline = italic/bold family yang sama, bukan ganti family. **Italic descender clearance:** kata italic dengan `y g j p q` + `leading-none` akan clip — pakai `leading-[1.1]` + `pb-1`.

**Tambahan hallmark:** heading/display selalu roman (`font-style: normal`). Italic hanya untuk emphasis di body copy paragraf. Jangan italicize heading.

---

## COLOR & GRADIENT — C1..C6

### C1 · Gradient diagonal purple/indigo→blue di hero/CTA · P0 — THE Purple Problem
**Signal:** `linear-gradient(135deg, indigo/violet → blue)` — asal Tailwind `bg-indigo-500` default.
**Fix:** 1 warna dominan + 1 aksen tajam (60:30:10). Gradient hanya tonal dalam 1 hue atau duotone dari brand colors. Jangan indigo/violet tanpa alasan brand.
```css
:root { --ink:#101010; --paper:#f4f1ea; --accent:#e4572e; }
```

### C2 · Tombol CTA indigo/violet · P1 (`bg-indigo-600` ~10.7%)
**Fix:** CTA = warna dominan/aksen brand, dengan hover+active real (lihat K7).

### C3 · "VibeCode purple" dark theme · P1
**Signal:** bg dark, body grey medium kontras rendah, aksen purple.
**Fix:** dark dengan intent: near-black hangat/dingin, text AA+, aksen bermakna. Jangan grey-on-grey.

### C4 · Palette timid merata tanpa dominan · P0/P1 · 👁 butuh render
**Signal:** beberapa warna bobot mirip, tidak ada dominan/aksen tajam.
**Fix:** disiplin 60:30:10. 1 dominan bawa halaman, aksen punctuate hemat. Commit.

### C5 · Glow box-shadow berwarna · P2 (`shadow-indigo-500/50` ~4.3%)
**Fix:** shadow = elevasi, bukan teater warna. Atmosfer di background, bukan glow di tiap card.

### C6 · Gradient headline `bg-clip-text` · P0
**Fix:** heading solid ink/brand color. Emphasis via weight/size/accent word.

**Tambahan taste-skill:** max 1 accent, saturasi <80% default. **LILA rule:** purple/blue glow banned default. **COLOR CONSISTENCY LOCK:** 1 accent untuk whole page — jangan warm-grey site tiba-tiba CTA biru section 7. **Premium-consumer ban:** hex families `#f5f1ea/#f7f5f1/#efeae0` bg + `#b08947/#b6553a/#9a2436` accent + `#1a1714` text = BANNED default untuk premium-consumer; rotate ke Cold Luxury / Forest / Smoke.

**Tambahan hallmark:** tint pure black/white ke anchor hue. Lock tokens — setelah theme dipilih, semua color & `font-family` harus `var(--token)`, jangan inline OKLCH/hex. Jangan redraw fake browser chrome.

---

## LAYOUT & COMPOSISI — L1..L8

### L1 · Centered hero template · P0 (~23.5% center title)
**Signal:** pill badge + H1 centered + subhead centered + 1-2 CTA centered. Centering saja bukan tell; combo badge+hero+3-cards adalah tell.
**Fix:** break symmetry — left-aligned hero + visual asimetris, oversized type hero, split, editorial grid off-center. Drop pill badge kecuali bawa news real.

### L2 · Tiga feature cards identik icon-top · P0 (~20%)
**Fix:** variasi — alternate text+visual rows, 1 showcase besar + poin kecil, atau prose dengan inline emphasis. Jika grid, variasi size/density.

### L3 · Bento grid sebagai default komposisi · P1/P2
**Fix:** hanya jika tile beda importance dan size encode itu. Jika tidak, pilih layout sesuai hirarki konten.

### L4 · Stat/social-proof strip generik · P1 (12.2%)
**Signal:** `10,000+ users · 99.9% uptime · 4.9★` placeholder.
**Fix:** angka real atau hapus. 1 metrik spesifik benar > 4 invented.

### L5 · How-it-works 1-2-3 bernomor besar · P2 (9.4%)
**Fix:** hanya jika proses memang berurutan; jika tidak, show product doing the thing.

### L6 · Default page shell `container mx-auto px-4` / `max-w-7xl` selamanya · P1
**Fix:** variasi container width per peran section. Beberapa full-bleed, beberapa editorial narrow. Width = tool.

### L7 · Pricing 3 tiers dengan "Most Popular" ring · P1
**Fix:** struktur ikut offer real: 2 plans / table / 1 plan+add-ons.

### L8 · Footer 4 kolom default · P1
**Signal:** 4 kolom equal + newsletter + social icons.
**Fix:** bangun dari yang ada. 2 kolom + line sering cukup. Drop newsletter box jika tidak real.

**Tambahan hallmark macrostructure:** 2 halaman berurutan untuk brief berbeda **harus beda macrostructure** dan minimal 1 dari 3 axes berbeda (paper band light/mid/dark · display style · accent hue). Jangan default ke Specimen (numbered left-margin + huge serif) kecuali brief editorial/foundry. Nav archetype jangan default N1a (wordmark+4-5 links+CTA hard-right full-width sticky) — pakai floating pill / masthead / brutal slab / terminal / edge-aligned sesuai genre.

---

## COMPONENTS — K1..K9

### K1 · shadcn/ui defaults untouched (`zinc`/`slate`, `--radius` default) · P0 (~23.5%)
**Fix:** theme sebelum ship — ganti base color & radius di `components.json`/CSS vars, restyle Button/Card, set type scale.

### K2 · `rounded-2xl shadow-lg` di semua surface · P1
**Fix:** radius & elevasi = hirarki, bukan global default. Variasi per peran. Beberapa flat/sharp.

### K3 · Glassmorphism `backdrop-blur` refleks · P1 (~17%)
**Fix:** hanya jika layering real (nav over scroll). Lainnya solid surface.

### K4 · Border accent stripe kiri/atas berwarna · P1 (~13%)
**Fix:** drop stripe; emphasis via weight/scale/bg/position.

### K5 · Pill badge sparkle di atas title · P2 (~4.7%)
**Fix:** hapus kecuali dated news real, style ke brand.

### K6 · Lucide icon di rounded-square chip · P1
**Fix:** pilih icon set sesuai arah (Phosphor/Tabler/Hugeicons) atau custom marks; drop chip atau jadikan keputusan desain (weight/size/color/position). Pertimbangkan angka atau tanpa icon.

### K7 · Missing states (hover/focus/active/disabled/loading/error) · P1
**Fix:** `:hover` + `:focus-visible` + `:active` + `:disabled` + `transition`; form = validation/error/empty. Hallmark component-scope = 8 states wajib: default·hover·focus-visible·active·disabled·loading·error·success (dengan demo wrapper `.is-hover` dll).

### K8 · `--radius` default untouched · P1
**Fix:** set radius sesuai arah (0 brutalist/editorial, soft playful). Variasi per elemen.

### K9 · Default dark SaaS card `bg-zinc-950` + `border-white/10` · P1
**Fix:** dark palette real (near-black hangat/dingin) + pisahkan surface > 10% white border.

---

## SPACING — S1

### S1 · Padding seragam tanpa ritme · P2 · 👁
**Signal:** `gap`/`p-*` sama di mana-mana, whitespace evenly spread. Hierarchy flat.
**Fix:** spacing scale untuk ritme. Beda vertical space per importance; whitespace sebagai komposisi (crowd some, isolate others). Kategori paling soft — jangan lead audit dengan ini.

---

## MOTION — M1..M3

### M1 · Fade-up-on-scroll identik di semua section · P2 · 👁
**Fix:** 1-2 momen high-impact, staggered entrance, variasi easing/intent.

### M2 · Micro-interactions scattered tanpa orkestrasi · P2 · 👁
**Fix:** definisikan motion language: shared easing + duration scale + clear entrance. Satu load terorkestrasi > scattered fidgets.

### M3 · "Linear glow" copy (dark hero + blurred animated gradient behind product) · P2 · 👁
**Fix:** pinjam prinsip (atmosphere/depth), bukan efek exact.

**Disiplin hallmark:** duration UI 200–300ms, ambient 3–6s; easing natural fast→slow; stagger child 50–100ms; respect `prefers-reduced-motion`. Motion library check via `package.json` (`framer-motion`/`motion`/`gsap`/`lenis`). Jika motion-cut project (none detected), jangan invent motion berat.

---

## ICONS — I1..I3

### I2 · Emoji sebagai feature bullets/nav · P1 (~3.8% nav)
**Fix:** icon set real sesuai arah; emoji hanya untuk konteks casual human, never sebagai system iconography. taste-skill: discouraged default, `strokeWidth` global (1.5/2.0), 1 family per project, never hand-roll SVG.

### I3 · Set Lucide overused `Sparkles`+AI / `ArrowRight` / `Zap` / `Rocket` / `CheckCircle2` / `Star` · P1
**Fix:** pilih icon by meaning; pensiunkan `Sparkles` untuk AI; match weight/style ke arah.

---

## COPY — CP1..CP3

### CP1 · Headline aspirasional vague · P1 (`Build the future` / `Elevate your workflow`)
**Fix:** tulis apa yang product lakukan, untuk siapa, konkret.

### CP2 · Superlatives generik · P2 (`best-in-class`, `seamless`, `powerful`) — pakai `avoid-ai-writing` untuk prose.

### CP3 · Arrow glyph tempel di CTA · P1 (`Get started →`)
**Fix:** drop glyph; jika butuh affordance directional, pakai real icon component size-aligned, bukan raw Unicode di copy.

**Honest copy (hallmark):** jangan invent metric/testimonial/logo. Stat-led layout harus `—` + grey block atau angka real atau ganti macrostructure.

---

## IMAGERY — IM1..IM4

- **IM1** diverse team at laptop stock · P1 → pakai real product screenshot/photography
- **IM2** glossy 3D blobs · P1 → product actual atau commissioned art
- **IM3** Corporate Memphis blob-people · P2 prekursor (bukan AI tell fresh) → skip atau ganti style
- **IM4** placeholder avatar `pravatar.cc` / `aspect-video bg-muted` · P1 → real avatar/demo atau placeholder obviously intentional

**Enrichment hierarchy (hallmark §4):** typography only > Tier A pure CSS art > Tier B hand SVG > Tier C generated still > Tier D library+custom > Tier E Lottie last resort.

---

## What NOT to over-flag

- 1 gradient yang intentional & tied to brand ≠ slop (C1 soal unchosen indigo→violet)
- Glassmorphism/bento yang content-driven ≠ slop
- Spacing (S1) soft signal — jangan lead audit
- Minimal confident yang intentional ≠ timid
- Restraint yang dieksekusi baik = decision, reward it.

## Sumber hitung
K. Krebs "design slop" ~1,400 Show HN (~16 heuristics, ~5–10% false-positive, skew solo AI-built) — angka sebagai relative commonness, bukan ground truth.
