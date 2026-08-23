# ADR-001 — Kapasitas Default `max_events_per_day` per Kategori

**Status:** Proposed (menunggu keputusan owner)
**Tanggal dibuka:** 2026-08-23
**Sumber:** PHASE3-DESIGN.md §8.1

## Konteks
Logika hold slot (§2.3) dan partial unique index anti-TOCTOU (§5.7) butuh angka kapasitas final per kategori vendor. Nilai ini menentukan schema (`mp_vendors.max_events_per_day`) dan UX penolakan otomatis "tanggal penuh".

## Opsi
| Kategori | Opsi A (konservatif) | Opsi B (longgar) |
|---|---|---|
| Gedung/Venue | 1 | 1 |
| Fotografer & Video | 1 | 2 |
| MUA | 2 | 3 |
| Katering | 2 | 4 |
| Dekorasi | 1 | 2 |

Trade-off: konservatif = lebih jarang konflik jadwal, tapi menolak revenue ganda yang sebenarnya bisa; longgar = risiko overbooking manual oleh vendor.

## Konsekuensi
- Menentukan seed data migration dan default saat vendor baru register.
- Bisa diubah per-vendor dari dashboard tanpa migration ulang.

## Keputusan
(pending)
