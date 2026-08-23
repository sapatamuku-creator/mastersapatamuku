# ADR-002 — Nasib DP Saat Client Batal / Tidak Lunas

**Status:** Proposed (menunggu keputusan owner)
**Tanggal dibuka:** 2026-08-23
**Sumber:** PHASE3-DESIGN.md §8.5, §3.4 (Alur Refund)

## Konteks
Client bisa batal setelah DP dibayar, atau gagal lunas sampai H-1. DP 30% sudah disburse ke vendor. Industri wedding umumnya memperlakukan DP sebagai non-refundable, tapi ini sensitif secara konsumen dan berdampak ke reputasi platform.

## Opsi
- **A — Non-refundable penuh**: DP cair ke vendor sebagai kompensasi. Pro: sederhana, standar industri, vendor aman dari ghosting. Kontra: risiko komplain client, refund chargeback.
- **B — Refundable penuh ke client**: DP kembali (platform/vendor menanggung). Pro: ramah konsumen. Kontra: vendor rugi slot yang ditahan; merusak ekonomi escrow.
- **C — Split / sliding scale**: mis. refund penuh jika batal ≥H-30, split di H-30…H-7, non-refundable <H-7. Pro: adil kedua pihak. Kontra: aturan lebih kompleks, butuh tabel kebijakan + komunikasi jelas di checkout.

## Konsekuensi
- Menentukan isi lengkap `mp_transition_order` untuk jalur `cancelled → refunded`, copywriting checkout, dan template WA notifikasi.

## Keputusan
(pending)
