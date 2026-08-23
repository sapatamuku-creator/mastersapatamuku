# ADR-004 — Dispute Window Auto-Release: H+1 vs H+3

**Status:** Proposed (menunggu keputusan owner)
**Tanggal dibuka:** 2026-08-23
**Sumber:** PHASE3-DESIGN.md §8.9

## Konteks
Dana pelunasan ditahan gateway sampai auto-release. PHASE3-DESIGN sekarang pakai **H+1**; PRD lama menyebut **H+3**. Window ini adalah satu-satunya masa proteksi client sebelum dana keluar ke vendor.

## Opsi
- **A — H+1**: dana cepat sampai vendor, cash flow vendor sehat. Kontra: client punya waktu buka dispute sangat pendek (masalah kadang baru kelihatan setelah acara: foto belum dikirim, katering klaim beda menu).
- **B — H+3**: window dispute lebih realistis (vendor wedding sering kirim deliverables berminggu-minggu). Kontra: vendor menunggu dana lebih lama; perlu copywriting ekspektasi yang jelas.
- **C — H+1 dengan release parsial bertahap**: sebagian rilis H+1, sisanya H+7 atau setelah milestone deliverables. Pro: kompromi. Kontra: paling kompleks di ledger & cron.

## Konsekuensi
- Jadwal cron auto-release (§7), teks ekspektasi di checkout & dashboard vendor, serta definisi "dispute" di state machine (`disputed` mengunci release).

## Keputusan
(pending)
