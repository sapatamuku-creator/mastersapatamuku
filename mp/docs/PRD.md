# PRD — Sapatamu.id Marketplace
## Product Requirements Document

**Versi:** 1.0.0-draft  
**Tanggal:** 2026-08-11  
**Status:** Draft — Pending Review  
**Author:** Sapatamu Team  

---

## 1. Executive Summary

### 1.1 Visi Produk
Sapatamu.id berkembang dari **platform buku tamu digital** menjadi **marketplace wedding terbesar di Indonesia** — menghubungkan vendor wedding profesional dengan calon pengantin.

### 1.2 Tagline
> *"Temukan vendor wedding terbaik untuk hari spesialmu"*

### 1.3 Model Bisnis
**Komisi per transaksi** — Platform mengambil komisi dari setiap transaksi yang terjadi antara client dan vendor melalui sapatamu.id.

---

## 2. Kategori Vendor

| ID | Nama | Slug | Icon |
|----|------|------|------|
| 1 | Wedding Organizer | `wedding-organizer` | 🎪 |
| 2 | Fotografer & Videografer | `foto-video` | 📸 |
| 3 | Katering | `katering` | 🍽️ |
| 4 | Gedung & Venue | `venue` | 🏛️ |
| 5 | Dekorasi & Florist | `dekorasi` | 🌸 |
| 6 | Gaun & Busana | `gaun` | 👗 |
| 7 | Makeup Artist | `makeup` | 💄 |
| 8 | Hiburan & Band | `hiburan` | 🎵 |
| 9 | MC & Host | `mc` | 🎤 |
| 10 | Percetakan & Souvenir | `souvenir` | 🎁 |
| 11 | Buku Tamu Digital | `buku-tamu` | 📋 |

---

## 3. Phase 3 — Sapatamu Gateway (Rekening Bersama / Escrow Payment System)

### 3.1 Visi & Tujuan Utama
Sapatamu Gateway hadir sebagai **Sistem Rekening Bersama (Escrow)** yang memberikan proteksi ganda:
1. **Proteksi Pengantin (Client)**: Dana pembayaran ditahan aman oleh Sapatamu. Vendor baru dibayar setelah acara (Hari H) selesai dan layanan terverifikasi. Mencegah risiko vendor kabur/penipuan.
2. **Proteksi Vendor**: Tanggal event terkunci di kalender (`event_date`) dan dana booking sudah terkonfirmasi di escrow, sehingga vendor memiliki kepastian jadwal dan pembayaran.

### 3.2 Alur Transaksi Tokopedia/Shopee Model (Escrow Lifecycle)
```
[Client Checkout] ──> [Bayar via Sapatamu Gateway] ──> [Dana Ditetapkan di Escrow]
                                                             │
                                                     (Kunci Jadwal Event)
                                                             │
[Hari H Event Selesai] <─────────────────────────────────────┘
         │
         ├──> [Vendor Konfirmasi Selesai / Claim Payout]
         ├──> [Client Konfirmasi Selesai (atau Auto-Approve H+3)]
         │
 [Pencairan Dana ke Rekening Vendor (Minim Komisi Platform)]
```

### 3.3 Status Lifecycle Pesanan & Escrow
1. `pending_payment`: Client membuat order/checkout, menunggu pembayaran VA/QRIS/E-Wallet.
2. `paid_escrow`: Client sukses membayar. Dana ditahan oleh Sapatamu Gateway. Tanggal event terkunci.
3. `service_in_progress`: Event mendekati/berlangsung pada `event_date`.
4. `awaiting_confirmation`: Event selesai, menunggu konfirmasi dari Client / klaim dari Vendor.
5. `completed`: Layanan selesai dikonfirmasi. Dana siap dicairkan.
6. `disputed`: Client/Vendor mengajukan komplain (misal: vendor tidak hadir / kendala layanan). Dana dibekukan hingga resolusi admin.
7. `refunded`: Dana dikembalikan ke Client jika komplain terbukti.
8. `disbursed`: Dana sukses ditransfer ke rekening bank milik Vendor (dikurangi komisi sapatamu).

### 3.4 Skema Pembayaran (Full Payment vs DP)
- **Full Payment (100%)**: Seluruh dana ditahan di Escrow hingga H+3 setelah acara.
- **DP + Pelunasan**: DP (misal 30%) ditahan di Escrow dan dapat diklaim vendor saat H-7 acara (untuk modal awal), sisa 70% ditahan hingga H+3 acara selesai.

---

## 4. Rencana Pengembangan Berkelanjutan

- **Phase 1**: Listing Vendor, Katalog Paket, & Inquiry Direct WA (Done)
- **Phase 2**: Verifikasi Vendor (Email/WA OTP), Promo Diskon Paket, & Rating (Done)
- **Phase 3**: Sapatamu Gateway (Escrow Payment, Automated Disbursement, Dispute Center)
- **Phase 4**: Event Management Integration (Buku Tamu Sync, Auto Remind Client & Vendor)

