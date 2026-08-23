# ADR-003 — Penanggung Fee Gateway (≈2,9%)

**Status:** Proposed (menunggu keputusan owner)
**Tanggal dibuka:** 2026-08-23
**Sumber:** PHASE3-DESIGN.md §8.6

## Konteks
Midtrans/Xendit memotong ±2% + Rp2.000 per transaksi (VA/QRIS beda-beda). Invoice `net_amount` (PHASE3-DESIGN §5.4) tidak bisa dihitung final tanpa keputusan siapa menanggung fee.

## Opsi
- **A — Ditanggung client (add-on)**: total tagihan = harga + fee. Umum di Midtrans Indonesia. Pro: margin vendor & platform terjaga. Kontra: harga tampil tidak bulat, kurang cantik di invoice.
- **B — Dipotong dari hak vendor**: vendor terima net setelah fee + komisi. Pro: angka tagihan client bersih. Kontra: efektif menaikkan total potongan ke vendor (komisi 5% + fee ~3%) → resistensi vendor saat onboarding.
- **C — Split 50/50**: fee dibagi client & vendor. Pro: beban terasa ringat dua arah. Kontra: kompleksitas penjelasan tertinggi.

## Konsekuensi
- Rumus final kolom `gateway_fee`, `commission_amount`, `net_amount` di `mp_invoices`.
- Copywriting halaman checkout & simulasi biaya dashboard client (Phase 3.5a).

## Keputusan
(pending)
