# Architecture Decision Records — Sapatamu Marketplace

Satu ADR = satu keputusan arsitektur. Format ringkas: Konteks / Opsi / Keputusan / Konsekuensi.

## Status
- **Proposed** — menunggu keputusan owner.
- **Accepted** — disetujui, jadi acuan eksekusi.
- **Superseded** — digantikan ADR lain (jangan dihapus).

## Indeks

| ADR | Judul | Status | Blocking? |
|---|---|---|---|
| [ADR-001](ADR-001-kapasitas-default-per-kategori.md) | Kapasitas default `max_events_per_day` per kategori | Proposed | Ya — blokir schema slot & unique index |
| [ADR-002](ADR-002-nasib-dp-saat-pembatalan.md) | Nasib DP saat client batal / tidak lunas | Proposed | Ya — blokir alur refund §3.4 PHASE3 |
| [ADR-003](ADR-003-penanggung-fee-gateway.md) | Penanggung fee gateway (≈2,9%) | Proposed | Ya — blokir formula invoice net_amount |
| [ADR-004](ADR-004-dispute-window-release.md) | Dispute window auto-release: H+1 vs H+3 | Proposed | Ya — blokir cron H+1 & ekspektasi vendor |

## Belum jadi ADR (keputusan non-blocking)
Deadline DP 24/48 jam, kapan DP disburse (segera/H-7), waitlist tanggal full, blocked dates `DATE[]` vs tabel override, metode login tambahan, kapan login wajib, binding/non-binding simulasi harga. Semua masih di bagian "Keputusan Terbuka" masing-masing design doc; naikkan jadi ADR bila terbukti memengaruhi schema.

## Aturan
- Keputusan diisi owner; agent tidak mengisi sendiri.
- Setiap ADR yang Accepted dicatat juga di `docs/v3.3/DECISION_LOG.md`.
