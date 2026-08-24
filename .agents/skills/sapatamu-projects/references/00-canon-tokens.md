# 00 — Canon Tokens (copy-paste `tokens.css`)

> Sumber: `animations.css:1`, audit SapaTamu, `config.js:1` theme di `live-progress-ux`
> Aturan: **jangan inline hex** — semua via `var(--*)`. Copy block ini verbatim ke project baru.

```css
/* ════════════════════════════════════════════
   Sapatamu Canon Tokens — tokens.css v1
   Copy verbatim. Ganti aksen hanya jika brand butuh.
   ════════════════════════════════════════════ */
:root {
  /* — Warm core (jangan ganti tanpa alasan brand) — */
  --primary: #E07B7B;          /* Rose — CTA, active, selected border */
  --primary-light: #FDF2F2;    /* Rose wash */
  --primary-dark: #C45A5A;
  --primary-soft: rgba(224,123,123,0.12);
  --gold: #C8962E;             /* Accent — progress fill, active thumb, rank */
  --gold-light: #FFF5EE;       /* Gold wash */
  --gold-bg: rgba(212,175,55,0.05);
  --bg: #FFF9F5;               /* Page bg (alternatif #FFFBF9 / #FFFDFB) */
  --card: #FFFFFF;
  --surface: #FFFFFF;
  --surface-border: #F0E6DE;   /* alias --border */
  --border: #F0E6DE;           /* Soft Sand */
  --border-strong: rgba(200,150,46,0.15);
  --text-main: #4A3F35;        /* Warm Dark Brown */
  --text-muted: #8C7560;       /* Warm Brown */
  --text-light: #B5ADA5;
  --sidebar-bg: #FFF5EE;
  --content-bg: #fff;
  --success: #10B981;
  --danger: #EF4444;

  /* — Radius (jangan seragamkan semua 2xl) — */
  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --radius-xl: 32px;           /* card/panel */
  --radius-2xl: 35px;          /* modal/sheet */
  --radius-pill: 999px;

  /* — Shadow & glow — */
  --shadow-sm: 0 2px 8px rgba(44,36,32,0.04), 0 1px 3px rgba(74,63,53,0.06);
  --shadow-md: 0 8px 24px rgba(44,36,32,0.08), 0 4px 16px rgba(44,36,32,0.06);
  --shadow-lg: 0 16px 40px rgba(44,36,32,0.12), 0 8px 24px rgba(44,36,32,0.08);
  --shadow-xl: 0 16px 48px rgba(44,36,32,0.16);
  --glow: 0 0 40px rgba(224,123,123,0.15);

  /* — Font (body + display — max 2 families) — */
  --font-body: "Plus Jakarta Sans", system-ui, -apple-system, Segoe UI, sans-serif;
  --font-display: "Lora", Georgia, serif;           /* judul — ganti hanya jika brand editorial */
  /* Alternatif display: "Playfair Display" italic untuk couple, "Outfit"/"Montserrat" untuk vendor/katalog — pilih 1 */
  --font-mono: "JetBrains Mono", ui-monospace, monospace; /* angka/POS/ID */

  /* — Motion — */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);     /* Apple drawer — nav island, sheet */
  --ease-modal: cubic-bezier(0.34, 1.56, 0.64, 1);   /* spring pop — modal */
  --ease-entrance: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast: 160ms;    /* press, micro */
  --duration-normal: 220ms;  /* tooltip, dropdown, toggle */
  --duration-slow: 350ms;    /* modal, drawer, island */
  --duration-entrance: 550ms;/* card reveal */
  --transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);

  /* — Spacing scale (4pt) — */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-6: 24px; --space-8: 32px; --space-12: 48px; --space-16: 64px; --space-24: 96px;
}

/* — Base reset canon — */
* { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { background: var(--bg); color: var(--text-main); font-family: var(--font-body);
       -webkit-font-smoothing: antialiased; overflow-x: hidden; }
img { max-width: 100%; display: block; }

/* — Font loading — */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300..800&family=Lora:wght@400;700&display=swap');
/* Preconnect di <head>: <link rel="preconnect" href="https://fonts.googleapis.com"> + gstatic */

/* — Reduced motion (W3C) — kill all jika user minta — */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-delay: -1ms !important; animation-duration: 1ms !important;
    animation-iteration-count: 1 !important; background-attachment: initial !important;
    scroll-behavior: auto !important; transition-duration: 0s !important; transition-delay: 0s !important;
  }
}

/* — Adaptive Floating Scrollbar (canon — jangan ganti) — */
* { scrollbar-width: thin; scrollbar-color: rgba(140,117,96,0.3) transparent; }
::-webkit-scrollbar { width: 9px; height: 9px; }
::-webkit-scrollbar-track, ::-webkit-scrollbar-corner { background: transparent; }
::-webkit-scrollbar-thumb {
  background-color: rgba(140,117,96,0.25); border-radius: 50px;
  border: 2.5px solid transparent; background-clip: padding-box;
  transition: background-color 0.22s var(--ease-out), border-width 0.22s var(--ease-out);
}
::-webkit-scrollbar-thumb:hover { background-color: rgba(140,117,96,0.55); border-width: 1px; }
::-webkit-scrollbar-thumb:active { background-color: var(--gold); border-width: 0; }
.filter-dropdown-scroll::-webkit-scrollbar, .nav-scroll::-webkit-scrollbar { width: 7px; height: 6px; }
.filter-dropdown-scroll::-webkit-scrollbar-thumb, .nav-scroll::-webkit-scrollbar-thumb {
  border-width: 1.5px;
}
.filter-dropdown-scroll::-webkit-scrollbar-thumb:hover, .nav-scroll::-webkit-scrollbar-thumb:hover { border-width: 0.5px; }
.filter-dropdown-scroll::-webkit-scrollbar-thumb:active, .nav-scroll::-webkit-scrollbar-thumb:active { border-width: 0; }
```

## Catatan font

- **Body wajib** `Plus Jakarta Sans 300–800`. **Display wajib** `Lora` (atau 1 alternatif display — jangan 2 display).
- Katalog lama campur `Montserrat` + `Outfit` + `Lora` = SLOP (5 families). Project baru: **max 2 families** (body + display) + mono opsional.
- `font-display: swap` via Google Fonts default — jangan FOIT.
- Preload hanya critical weight (400, 700) — jangan semua 6 weights.

## Catatan warna

- Jangan pakai pure `#000/#fff` flat — tint ke warm (`#FFF9F5` bg, `#4A3F35` ink).
- Accent hanya 1 hue — strength = restraint. Butuh semantic? pakai `--success/--danger` terpisah, bukan accent baru.
- 60:30:10 locked — lihat `design-taste-guide/references/04-color-60-30-10.md` untuk mapping surface/container/interactive.
