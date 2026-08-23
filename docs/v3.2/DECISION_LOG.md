# Decision Log — SapaTamu v3.2 (Guestbook Frontend)

> Catat setiap GATE `skill-decision-gate` di sini. Satu baris per task. Jujur, ringkas.

| Tanggal | Task | Keputusan | Alasan / Risiko yang disetujui |
|---------|------|-----------|--------------------------------|
| 2026-08-23 | Ref Formulir Tamu — desain fresh "Indigo Atelier" | LANJUT | User koreksi arah: BUKAN kloning produksi, harus desain baru. Verifikasi via ui-ux-pro-max `--design-system`: Soft UI Evolution (indigo #6366F1 / emerald / lavender), Cormorant Infant display. Pola interaksi baru: command bar, chip filter bar, ledger-first view, inspector drawer (bukan modal), inline composer. Data mock localStorage (`spt_ref_mock_db`). Deliver F1 di `docs/frontend-guestbook/formulir_tamu.ref.html` (52KB) + DESIGN/PLAN/TASKS.md sebagai callback progres. Produksi formulir_tamu.html tidak tersentuh. Risiko: dual-source ref vs produksi — mitigasi banner REFERENCE ONLY. JS tervalidasi node (syntax OK). |
| 2026-08-23 | Pembuatan folder docs/v3.2 | LANJUT | Dokumentasi frontend guestbook (UI/UX layouting + perf low-mid end), mengikuti konvensi v3.0/v3.1. Nol dampak kode. |
| 2026-08-23 | Pembuatan folder docs/v3.3 | LANJUT | Klarifikasi user: "area sekitar marketplace" = dokumentasi **halaman-halaman sekitar `mp/`**. Lihat `docs/v3.3/DECISION_LOG.md`. |

## Cara pakai
- Saat GATE disetujui user (`LANJUT`), tambahkan baris di tabel atas.
- Jika `TOLAK`/`TUNDA`, tulis alasan.
- Jangan hapus baris lama — ini audit trail.
