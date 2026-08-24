---
name: design-taste-guide
description: Panduan anti-AI-generic + taste senior frontend untuk SapaTamu & semua project Antigravity. WAJIB dibaca sebelum agent membuat/mengubah HTML baru. Cegah layout grid-icon generik AI, paksakan hirarki layout, filosofi font, komposisi rasio per vertikal (SaaS/POS/CRM/eCommerce/ERP/HR), dan 60:30:10. Source-of-truth = references/*.md
version: 1.0.0
author: mastersapatamuku + avoid-ai-design + taste-skill + hallmark synthesis
license: MIT
---

# Design Taste Guide — Anti-AI-Generic + Senior Frontend Taste

> **WAJIB BACA** sebelum membuat atau mengubah HTML apapun di project ini maupun di Antigravity global.
> Skill ini mengikat 3 sumber eksternal (avoid-ai-design, taste-skill, hallmark) + riset industri
> menjadi satu check-list operasional. Pelanggaran = design slop.

## Kapan skill ini aktif

- Membuat halaman baru (.html vanilla apapun)
- Mengubah layout/section/component yang terlihat
- Review PR yang menyentuh frontend
- Agent diminta "bikin landing/dashboard/katalog/form"

Jika ragu, anggap aktif.

## Cara pakai (3 langkah, < 60 detik)

1. **Baca Design Read dulu** (`references/01-anti-pattern.md` § Design Read). Tulis 1 kalimat:
   `Reading this as: <page kind> for <audience>, <vibe>, leaning toward <system/aesthetic>`
2. **Pilih 1 arah estetika** dari `references/02-aesthetic-directions.md`. 1 arah saja, jangan 3.
   Tulis 5 moves: `type pairing · palette stance · layout stance · motion idea · signature detail`
3. **Cek gate sebelum emit** (`references/07-preflight-checklist.md`). Harus 0 × P0, ≤1 × P1.

Jika brief memberi brand color / vibe multi-atribut spesifik, ikuti cabang **custom**;
jika tidak, pakai **catalog**. Jangan tanya user kecuali butuh kepastian (max 1 pertanyaan).

## Struktur references (baca sesuai kebutuhan)

| File | Isi | Kapan dibaca |
|------|-----|--------------|
| `01-anti-pattern.md` | Katalog AI tells P0/P1/P2 + cara fix | Selalu — sebelum nulis kode |
| `02-aesthetic-directions.md` | 10 arah estetika siap pakai | Saat commit arah |
| `03-typography.md` | Hirarki, pairing, filosofi font per brand | Saat set font/scale |
| `04-color-60-30-10.md` | Rasio 60:30:10 + adaptasi dark/light | Saat set palette |
| `05-layout-vertikal.md` | Komposisi rasio per vertikal (SaaS/POS/CRM/eComm/ERP/HR) | Saat tentukan grid/section |
| `06-responsive-motion.md` | 3 bucket responsif (≥1024/768-1023/<768) + motion discipline | Saat set spacing/motion |
| `07-preflight-checklist.md` | Gate P0/P1/P2 + slop test + stamp | Sebelum emit HTML |

## Aturan keras (hard gates — dilanggar = fail)

1. **No purple→blue gradient hero** (C1/P0). 1 warna dominan + 1 aksen tajam.
2. **No Inter/Roboto/solo system stack** untuk semua teks (T1/P0). Wajib pairing display + body.
3. **No `Sparkles`+AI / `Zap`/`Rocket` default Lucide** (I3/P1) — pakai Phosphor/Tabler/Hugeicons, 1 family saja.
4. **No centered-hero + pill badge + 3 feature cards identik** (L1/L2/P0).
5. **No `rounded-2xl shadow-lg` seragam di semua card** (K2/P1) — variasi radius/elevasi = hirarki.
6. **60:30:10 locked per halaman** — 1 aksen, jangan 3. Lihat `04-color-60-30-10.md`.
7. **3 bucket responsif wajib lolos** (<768 / 768–1023 / ≥1024) — cek `06-responsive-motion.md`.
8. **Stamp provenance** di CSS: `/* Design Taste Guide · direction: <name> · palette: 60:30:10 <dominant>/<secondary>/<accent> */`

## Komposisi cepat per vertikal (ringkas — detail di 05)

- **SaaS**: dense info, 60% data surface / 30% nav & chrome / 10% CTA; layout dashboard + executive snapshot
- **eCommerce/Marketplace**: 60% product canvas putih / 30% filter & card chrome / 10% price & CTA
- **POS**: 60% transaction canvas / 30% catalog grid / 10% pay CTA — speed > beauty
- **CRM**: 60% list/timeline / 30% detail drawer / 10% status & action — timeline adalah hero
- **ERP**: 60% table/form canvas / 30% nav & filter bar / 10% status semantic — densitas tinggi, kontras AA
- **HR**: 60% people canvas hangat / 30% card & timeline / 10% accent humanis — whitespace luas

## Font pairing starter (jangan pakai semua sekaligus)

- **SaaS/ERP/CRM**: `Geist`+`Geist Mono` / `Sora`+`Inter Tight` / `Söhne Breit`+`IBM Plex Mono`
- **Marketplace/eCommerce**: `Cabinet Grotesk`+`Satoshi` / `GT America`+`Manrope`
- **Editorial/HR**: `Fraunces` (display) + `Hanken Grotesk` (body) / `Newsreader`+`Untitled Sans`
- **POS**: `Berkeley Mono`/`JetBrains Mono` untuk angka + `Outfit` body — angka harus mono

## Workflow audit mode (tanpa ubah kode)

Ucapkan `audit` / `flag only` / `detect` → jalankan `01-anti-pattern.md` saja, kelompokkan P0/P1/P2,
beri lokasi `file:line`, tag `code-certain` vs `inferred`. Jangan edit.

## Workflow rewrite mode (default)

Audit → Commit 1 arah (02) → Set type (03) + palette 60:30:10 (04) → Set layout per vertikal (05) + responsif/motion (06) → Gate (07) → Emit HTML.

## Sumber & provenance

- `avoid-ai-design` (funboy322) — katalog AI tells + severity P0/P1/P2 + before/after discipline
- `taste-skill` (Leonxlnx) — dials VARIANCE/MOTION/DENSITY + brief inference + premium-consumer ban
- `hallmark` (nutlope) — 21 macrostructures, 21 themes, 57 slop-test gates, diversification rule, typography purity
- Riset 2026: LogRocket 60-30-10, Penpot/Learn hierarchy, Eleken/SaaSFrame dashboard patterns, Anthropic frontend aesthetics

Semua disintesis di `references/` — file sumber asli tetap ada di `.agents/skills/{avoid-ai-design,taste-skill,hallmark}/` untuk rujukan.
