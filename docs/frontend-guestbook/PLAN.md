# PLAN — Formulir Tamu Reference Build (Bertahap Menuju Paritas Fungsional)

> Roadmap fase `formulir_tamu.ref.html`. Satu fase = satu sesi kerja = satu GATE.
> **Desain adalah karya fresh ("Indigo Atelier" — lihat `DESIGN.md`), bukan kloning visual produksi.** Yang diparitaskan bertahap adalah *fungsionalitas*, bukan tampilan.
> Status rinci per task: lihat `TASKS.md` (sumber callback "bagian mana yang belum dilakukan").

---

## Fase 1 — Fondasi & Alur Inti (F1)
**Scope:** shell responsif 3 breakpoint, tema SapaTamu, mock adapter (localStorage + seed), form input tamu, daftar kartu/details, search/sort/multi-filter, modal edit, hapus tunggal & massal, skeleton shimmer, live progress overlay, placeholder shell fitur berat (Import/Sync/Duplikat).
**Exit criteria:** semua alur inti jalan end-to-end di desktop/tablet/mobile dengan mock data; tidak ada teks "Loading..." mentah; singkatan pihak aktif di mobile.

## Fase 2 — Import Excel (F2)
**Scope:** wizard multi-step (pilih file → pilih sheet → mapping kolom auto-detect + ingat mapping → preview → commit), template Excel siap unduh, laporan hasil import, undo batch terakhir. Parsing via SheetJS dari CDN.
**Paritas target produksi:** `commitExcelGuests`, `analyzeParsedRows`, `autoDetectColumns`, `populateColumnMapping`, `saveCurrentMapping/loadSavedMapping`, `showUndoBanner`, template Excel.

## Fase 3 — Duplicate Manager (F3)
**Scope:** deteksi duplikat nama + nomor (normalisasi 08↔628), grup duplikat UI, pilih keeper vs buang, bulk delete dengan live telemetry, counter.
**Paritas target:** `buildDupGroups`, `getDuplicateNames`, `getExistingGuestKeys`, `renderDupGroups`, `updateDeleteCounter`.

## Fase 4 — Sync Sheet UI (F4)
**Scope:** panel sinkronisasi DB ⇄ Sheet, warning mismatch jumlah baris, aksi sync dengan live progress, countdown indicator background job (stub GAS).
**Paritas target:** `checkSpreadsheetCountMismatch`, `buildSheetRows`, `runGasBackground`, `showGasCountdown`.

## Fase 5 — Hero Dinamis & Navigasi (F5)
**Scope:** hero ambient slideshow (foto placeholder/mock config), glass info cards, dynamic island nav capsule (tablet/mobile), onboarding tour spotlight.
**Paritas target:** `initHeroSlideshow`, `initDynamicIslandNav`, `startTour/positionSpotlight`.

## Fase 6 — Tools & Polish Akhir (F6)
**Scope:** generator kode unik tampil, RSVP/WA link tools (`getCleanRsvpLink`, klasifikasi kontak WA/IG), audit a11y, audit performa (containment, passive listeners), halaman pembanding ref-vs-produksi.
**Exit criteria akhir:** checklist paritas di `TASKS.md` tuntas; ref layak jadi acuan rewrite produksi.

---

## Aturan Main

1. Setiap fase dimulai GATE 5 poin (fungsi, asal, arah, routing, risiko) → setujui dulu.
2. Selesai fase = update `TASKS.md` (status Done) + catat di DECISION_LOG terkait.
3. Tidak ada wire ke Supabase/GAS sungguhan sampai keputusan eksplisit owner (mock-first).
