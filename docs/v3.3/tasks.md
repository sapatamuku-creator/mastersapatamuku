# Tasks & Peta Halaman — SapaTamu v3.3 (Area Sekitar Marketplace)

> Fokus: dokumentasi **halaman-halaman di sekitar modul marketplace (`mp/`)** — peta fungsi, status, dan backlog area ini.
> Klarifikasi user (2026-08-23): "fitur area sekitar marketplace" = halaman-halaman sekitar `mp/frontend/`, bukan fitur geolocation venue terdekat.
> **Gate wajib:** Sebelum kerjakan task apapun, jalankan `skill-decision-gate` — 5 poin, tunggu LANJUT user. Catat di `docs/v3.3/DECISION_LOG.md`.

---

## Peta Halaman Area Marketplace

| Halaman | Judul / Fungsi | Lokasi | Docs Terkait |
| :--- | :--- | :--- | :--- |
| `mp/frontend/index.html` | Landing marketplace "Temukan Vendor Wedding Terbaik" | `mp/frontend/` | `mp/docs/PRD.md`, `PLAN.md` |
| `mp/frontend/marketplace.html` | Katalog/cari vendor wedding | `mp/frontend/` | `mp/docs/SPEC.md`, `TODO.md` |
| `mp/frontend/store-product.html` | Detail paket vendor (store) | `mp/frontend/` | `mp/docs/SPEC.md` |
| `mp/frontend/vendor-profile.html` | Profil publik vendor | `mp/frontend/` | `mp/docs/PRD.md` |
| `mp/frontend/vendor-register.html` | Pendaftaran vendor (+ OTP verifikasi) | `mp/frontend/` | `mp/docs/TODO.md` Phase 2 |
| `mp/frontend/vendor-dashboard.html` | Dashboard vendor (produk, promo, booking) | `mp/frontend/` | `mp/docs/PHASE3-DESIGN.md` |
| `mp/frontend/vendor-product.html` | Detail paket versi vendor | `mp/frontend/` | `mp/docs/SPEC.md` |
| `mp/frontend/wedding-checklist.html` | Wedding checklist calon pengantin | `mp/frontend/` | `mp/docs/PHASE3.5-DESIGN.md` |
| `mp/frontend/phase35-sandbox.html` | "Ruang Pernikahan" dashboard calon pengantin (sandbox UI Phase 3.5) | `mp/frontend/` | `mp/docs/PHASE3.5-DESIGN.md` |
| `marketplace.html` (root) | Salinan/entri katalog vendor di domain utama | root | Duplikat dari `mp/frontend/marketplace.html` |

### Pendukung Non-Halaman
- `mp/backend/` — termasuk `MarketplaceUpload.gs` (GAS upload).
- `sql/marketplace/01–08` — schema categories, vendors, products, inquiries, reviews, transactions, RLS, seed; `08_vendor_verification_promo.sql`.
- `mp-config.js` / `mp.js` — konfigurasi & loader marketplace.
- Vercel API terkait: payment webhook handler, list drive files, OG generator (lihat graphify community hubs).

---

## Status Besar (ringkas dari mp/docs/TODO.md)

| Fase | Isi | Status |
| :--- | :--- | :--- |
| Phase 0 | DB schema 01–08 + GAS + halaman dasar (index, marketplace, store-product, vendor-dashboard/profile/register) | Done |
| Phase 2 | Verifikasi vendor (OTP Email/WA) + promo diskon & badge | Done |
| Phase 3 | Gateway escrow: orders, ledger, payout, dispute, Midtrans/Xendit, checkout UI | Belum |

---

## Backlog Area Sekitar Marketplace

- [x] **T3.0** Perkaya desain arsitektur Phase 3 & 3.5 (idempotency webhook, lock slot DB, enforce state machine, rantai cron, split 3.5a/b, delegasi token guestbook, ADR-001…004 Proposed di `mp/docs/adr/`) — 2026-08-23.
- [ ] **T3.1** Audit duplikasi `marketplace.html` root vs `mp/frontend/marketplace.html` — pastikan satu sumber kebenaran (root redirect atau build copy), catat hasilnya di sini.
- [ ] **T3.2** Sinkronkan status halaman `vendor-product.html` vs `store-product.html` (dua judul mirip, perlu dipastikan mana yang aktif dirutekan).
- [ ] **T3.3** Integrasi `wedding-checklist.html` + `phase35-sandbox.html` ("Ruang Pernikahan") dengan akun pengantin OAuth2 (Phase 3.5 design).
- [ ] **T3.4** Persiapan Phase 3 (escrow) — hanya spec & gate, tidak mulai tanpa RFC backend baru (larangan v3.0 tetap berlaku).

> Semua task di atas baru dokumentasi/perencanaan. Implementasi apapun wajib lewat GATE dulu.
