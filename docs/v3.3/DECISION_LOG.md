# Decision Log — SapaTamu v3.3 (Area Marketplace)

| Tanggal | Task | Keputusan | Alasan / Risiko yang disetujui |
|---------|------|-----------|--------------------------------|
| 2026-08-23 | Klarifikasi makna "fitur area sekitar marketplace" | LANJUT | User pilih: **halaman-halaman sekitar `mp/`** (bukan geolocation venue terdekat, bukan hanya marketplace.html root). Dokumentasi dibuat di `docs/v3.3/tasks.md`; implementasi fitur menyusul via GATE per task. |
| 2026-08-23 | Pembuatan folder docs/v3.3 | LANJUT | Kerangka dokumentasi area marketplace: peta halaman, status fase, backlog. Nol dampak kode. |
| 2026-08-23 | Update arsitektur docs mp/ Phase 3 & 3.5 | LANJUT (docs only) | PHASE3-DESIGN.md v0.2→v0.3 (+idempotency `mp_webhook_events`, lock slot anti-TOCTOU §5.7, enforce transisi §4.3, rantai cron §7.1, kerangka refund §3.4, mermaid); PHASE3.5-DESIGN.md v0.1→v0.2 (+split 3.5a/b, aturan linking tegas, delegasi token GAS §3.3, consent UU PDP + RLS, mapping sandbox→DB §11.3); buat `mp/docs/adr/` ADR-001…004 status Proposed — **semua keputusan ditunggu owner**. User instruksi eksplisit "perbaharui dulu docsnya". Nol dampak kode/route. |

## Catatan
- Guardrail tetap berlaku: tidak mengubah route/backend tanpa kesepakatan eksplisit; Phase 3 (escrow/payment) wajib RFC terpisah.
