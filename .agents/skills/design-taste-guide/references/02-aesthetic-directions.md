# 02 — Aesthetic Directions (10 arah siap pakai)

> Sumber: `avoid-ai-design/references/aesthetic-directions.md` (8) + `taste-skill` taste clusters
> + `hallmark` 21 themes (Specimen/Atelier/Brutal/Newsprint/Studio/Manifesto/Terminal/Midnight/Almanac/Garden/Riso/Sport/Bloom/Coral/Cobalt/Aurora/Editorial/Carnival/Lumen/Hum/Grid)
> Pilih **1** arah per halaman. Tulis 5 moves sebelum koding: type pairing · palette stance · layout stance · motion idea · signature detail.
> Jangan hedging 3 arah. Variasi antar run — jika last was warm-editorial, next jangan itu lagi.

---

## Cara commit (wajib)

1. Baca product: apa yang dilakukan, untuk siapa, feeling yang ditinggalkan.
2. Pilih 1 arah di bawah (atau blend 2 yang sengaja — tulis alasannya 1 kalimat).
3. Tulis 5 moves sebelum tulis kode.
4. Kalibrasi intensitas ke artefak: landing = boleh loud; settings panel = quiet & exact.
5. Simpan ke CSS stamp (lihat `07-preflight-checklist.md`).

### Format commit (copy-paste)

```
Direction: <nama>
Type: <display> + <body> (alasan 5 kata)
Palette: <dominant 60> / <secondary 30> / <accent 10> (OKLCH/hex)
Layout: <macrostructure> + <nav archetype> + <grid stance>
Motion: <1-2 primitives> + easing
Signature: <1 detail yang jadi fingerprint>
```

---

## 1) Brutalist / Raw
**Cocok:** dev tools, indie product, yang mau jujur & un-corporate.
**Type:** 1 grotesque kuat (Helvetica Now / Aktiv Grotesk / Neue Haas) ATAU mono (Berkeley Mono / Commit Mono). Besar, tight, confident.
**Palette:** high contrast. Black on off-white, atau 1 primary loud minimal color. 60 ink/paper, 30 border grid, 10 signal red.
**Layout:** grid terlihat, hard edges, rounded 0, exposed structure. Border > shadow.
**Motion:** none atau instant/snappy.
**Signature:** oversized type, `1px` border system, unstyled-but-intentional.
**Hallmark padan:** Brutal / Terminal theme + Workbench/Manifesto macrostructure.
**Jangan:** rounded-2xl, glass, emoji.

## 2) Editorial / Magazine
**Cocok:** content product, writing tools, brand bervoice.
**Type:** serif/sans contrast full — display serif (Fraunces / GT Sectra / Tiempos Headline / Newsreader) + body sans (Untitled / Söhne / Hanken Grotesk).
**Palette:** paper & ink, 1 aksen restrain. Warm paper `#f4f1ea` + ink `#101010` + vermilion/brick.
**Layout:** asymmetric editorial grid, pull quotes, drop caps, generous measure, off-center, masthead nav.
**Motion:** subtle typographic (reveal line-by-line).
**Signature:** hierarki tipografi real, columns, masthead. ⚠️ 1 kata serif-italic di sans headline = tell T3 — commit full atau jangan sama sekali.
**Hallmark padan:** Atelier / Newsprint / Specimen (hanya jika brief editorial!) / Almanac.

## 3) Swiss / International Typographic
**Cocok:** data product, dashboard, yang utamakan clarity (ERP/CRM/SaaS).
**Type:** 1 grotesque netral multi-weight (Neue Haas Grotesk / Aktiv / Söhne / Inter *hanya jika* dengan rigor).
**Palette:** mostly monochrome, 1 signal color (sering red) hanya untuk emphasis. 60 white/light grey, 30 mid grey grid, 10 red/blue signal.
**Layout:** modular grid ketat, flush-left, spacing matematis, whitespace sebagai struktur. Grid = design.
**Motion:** minimal functional.
**Signature:** discipline. Satu spacing scale, satu type ramp.
**Hallmark padan:** Grid / Studio / Editorial.

## 4) Retro-Futuristic / Y2K / Synth
**Cocok:** creative tools, music, gaming, launch berenergi.
**Type:** technical/display berkarakter (Departure Mono / wide sans / chrome display).
**Palette:** dark base + electric accents, atau saturated period color. CRT/chrome/neon coherent (bukan purple glow AI).
**Layout:** HUD framing, scanlines, grid berdepth.
**Motion:** glitch/flicker/terminal-typing restrain.
**Signature:** 1 era reference coherent, bukan sticker pile.
**Hallmark padan:** Terminal / Midnight / Aurora + Manifesto/Marquee Hero.

## 5) Organic / Natural
**Cocok:** wellness, food, sustainability, calm (HR people-first, marketplace artisan).
**Type:** humanist sans (Hanken Grotesk / Mr Eaves) atau soft serif.
**Palette:** earth tones, muted greens/clays, warm neutrals. No pure white/black. 60 limestone/sand, 30 eucalyptus/clay, 10 citron/burnt orange.
**Layout:** soft asymmetry, generous negative space, hand-placed feel.
**Motion:** slow eased breathing.
**Signature:** texture grain/paper, organic shapes spesifik (bukan blob 3D AI).
**Hallmark padan:** Garden / Almanac / Hum.

## 6) Luxury / Refined
**Cocok:** premium brand, finance, high-end service.
**Type:** high-contrast serif (Canela / GT Super / Reckless Neue) + quiet sans.
**Palette:** deep restrain. 1 rich dark + warm metallics atau 1 jewel tone. Banyak space. 60 ink/navy, 30 warm grey, 10 gold/jewel.
**Layout:** centered boleh *jika* terbaca poise bukan default. Wide margins, small confident type, slow reveal. Edge-aligned nav.
**Motion:** slow fades deliberate.
**Signature:** restraint & space sebagai flex. Nothing rushed.
**Hallmark padan:** Lumen / Bloom / Midnight (light paper band + serif display).

## 7) Playful / Toy
**Cocok:** consumer apps, kids, social, joyful (POS consumer, HR onboarding).
**Type:** rounded/characterful display (chunky rounded sans, Plus Jakarta Sans), generous weight.
**Palette:** bright confident dengan real color story (bukan timid even spread C4). 60 bright canvas, 30 secondary pop, 10 accent punch.
**Layout:** bouncy overlapping, stickers, depth, big touch targets.
**Motion:** springy bouncy reactive (Motion `spring`).
**Signature:** personality, mascot/marks dengan POV.
**Hallmark padan:** Hum / Carnival / Riso + Bento/Quote-Led.

## 8) Art Deco / Geometric
**Cocok:** events, hospitality, premium consumer.
**Type:** geometric display deco-influenced, tall elegant.
**Palette:** 2–3 colors dengan metallic/deep contrast. Symmetry intentional.
**Layout:** symmetry intentional, strong geometric motifs, framing lines, repeated pattern.
**Motion:** elegant geometric reveals.
**Signature:** 1 repeated geometric motif jadi brand.
**Hallmark padan:** Sport / Carnival / Atelier.

## 9) Soft / High-End Calm (dari taste-skill: soft-skill, minimalist-skill)
**Cocok:** premium consumer (cookware/wellness/DTC home), brand calm expensive.
**Type:** sans display halus (Geist Display / Cabinet Grotesk Display / PP Neue Montreal / GT Walsheim) + body Inter Tight / Satoshi. **Tanpa serif default**.
**Palette:** calm expensive — low contrast, whitespace, Cold Luxury (silver-grey+chrome+smoke) ATAU Forest (deep green+bone+amber). ⛔ BANNED default `#f5f1ea/#b08947/#1a1714` combo (taste-skill ban).
**Layout:** airy, generous whitespace, editorial grid longgar, bento hanya jika needed.
**Motion:** spring subtle, scroll-driven halus.
**Signature:** whitespace, premium fonts, spring motion — "expensive quiet".
**Hallmark padan:** Atelier (soft) / Garden / Hum (rounded-sans) + Long Document / Stat-Led.

## 10) Modern-Minimal / Linear (dari taste-skill + hallmark modern-minimal genre)
**Cocok:** SaaS enterprise, API, platform, dev tool (SaaS/ERP/CRM default).
**Type:** `Geist`+`Geist Mono` / `Satoshi`+`JetBrains Mono` / `Söhne Breit`+`IBM Plex Mono`. Mono untuk data/code.
**Palette:** Zinc/Slate/Stone base + 1 high-contrast singular accent (Emerald / Electric Blue / Deep Rose / Burnt Orange). Saturasi <80%. 60 white/light grey, 30 muted brand tint, 10 vibrant CTA.
**Layout:** Stripe/Linear/ElevenLabs school — dense tapi calm, hierarchy via size, executive snapshot di top, modular cards, single-metric hero.
**Motion:** counter / pricing-lift / pulse-once (max 3 primitives).
**Signature:** observability & actionability — metric besar di top bar, bukan wall of cards. Role-aware sections.
**Hallmark padan:** Coral / Cobalt genre cluster + Bento Grid (hati-hati — jangan default) / Stat-Led / Workbench.

---

## Anti second-order default

Model akan lari ke "safe distinctive" yang sama tiap run (warm-paper-serif, sage palette, satu stock accent).
Check: **arah run ini ≠ arah 2 run terakhir** (cek `.hallmark/log.json` jika ada, atau ingat). Vary deliberate — tulis alasannya 1 baris.

Fonts disebut contoh, bukan mandat. Ganti dalam spirit arah.
