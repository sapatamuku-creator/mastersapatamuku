# TASKS — Formulir Tamu Reference Build

> **Sumber callback progres.** Centang saat selesai; jangan hapus baris.
> Fase & exit criteria: lihat `PLAN.md`. Desain: `DESIGN.md`. Halaman: `formulir_tamu.ref.html`.

## Fase 1 — Fondasi & Alur Inti

| ID | Task | Status |
|---|---|---|
| RF-1.1 | Shell HTML + tema "Indigo Atelier" (Soft UI Evolution) + 3 breakpoint | Done |
| RF-1.2 | MockDB adapter (localStorage, seed 14 tamu, latensi simulasi, reset seed) | Done |
| RF-1.3 | Skeleton shimmer initial load (standar instant-skeleton-loading) | Done |
| RF-1.4 | Form input tamu lengkap + validasi + normalisasi WA 628 | Done |
| RF-1.5 | Mobile bottom sheet form (drag-handle, slide-down exit) | Done |
| RF-1.6 | Toolbar: search debounce 250ms, sort dropdown, multi-filter dropdown, view toggle Kartu/Details | Done |
| RF-1.7 | Render kartu tamu & details row (+ containment, pihak-full/pihak-short mobile) | Done |
| RF-1.8 | Modal edit guest (fit-to-screen mobile, optimistic update) | Done |
| RF-1.9 | Hapus tunggal + bulk select + hapus massal via modal konfirmasi generik | Done |
| RF-1.10 | Live progress overlay telemetri (X dari Y, %) untuk operasi batch | Done |
| RF-1.11 | Statistik chip ringkas (total, per kategori, per pihak) | Done |
| RF-1.12 | Placeholder shell Import/Sync/Duplikat (disabled ber-label fase) | Done |

## Fase 2 — Import Excel

| ID | Task | Status |
|---|---|---|
| RF-2.1 | Load SheetJS dari CDN + fallback pesan offline | Pending |
| RF-2.2 | Wizard step: pilih file → picker sheet → preview tabel | Pending |
| RF-2.3 | Mapping kolom auto-detect + simpan/ingat mapping terakhir | Pending |
| RF-2.4 | Template Excel siap unduh | Pending |
| RF-2.5 | Commit import via live progress + laporan hasil | Pending |
| RF-2.6 | Undo batch import terakhir | Pending |

## Fase 3 — Duplicate Manager

| ID | Task | Status |
|---|---|---|
| RF-3.1 | Deteksi dup nama (fuzzy trim/case) | Pending |
| RF-3.2 | Normalisasi nomor 08↔628 + deteksi dup WA | Pending |
| RF-3.3 | UI grup duplikat + pilih keeper | Pending |
| RF-3.4 | Bulk delete duplikat live telemetry | Pending |

## Fase 4 — Sync Sheet UI

| ID | Task | Status |
|---|---|---|
| RF-4.1 | Panel sync DB ⇄ Sheet (mock) | Pending |
| RF-4.2 | Warning mismatch jumlah baris | Pending |
| RF-4.3 | Countdown indicator background job (stub GAS) | Pending |

## Fase 5 — Hero Dinamis & Navigasi

| ID | Task | Status |
|---|---|---|
| RF-5.1 | Hero ambient slideshow mock config | Pending |
| RF-5.2 | Glass info cards dinamis | Pending |
| RF-5.3 | Dynamic island nav capsule tablet/mobile | Pending |
| RF-5.4 | Onboarding tour spotlight | Pending |

## Fase 6 — Tools & Polish

| ID | Task | Status |
|---|---|---|
| RF-6.1 | Generator kode unik tampil di form | Pending |
| RF-6.2 | RSVP/WA link tools + klasifikasi kontak | Pending |
| RF-6.3 | Audit a11y (keyboard, contrast, reduced-motion) | Pending |
| RF-6.4 | Audit performa scroll 60 FPS low-mid end | Pending |
| RF-6.5 | Dokumen pembanding ref vs produksi | Pending |
