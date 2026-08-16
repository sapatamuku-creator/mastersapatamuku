# SPEC — Sapatamu Marketplace Technical Specification
## Technical Design Document

**Versi:** 1.0.0  
**Tanggal:** 2026-08-11  
**Status:** Draft  
**Referensi:** PRD.md

---

## 1. File Structure (Marketplace Files)

```
mastersapatamuku/marketplace/
├── frontend/
│   ├── index.html          ← Marketplace landing
│   ├── marketplace.html    ← Browse semua vendor
│   ├── vendor-profile.html ← Profil vendor
│   ├── store-product.html  ← Detail paket/produk
│   ├── vendor-register.html← Daftar jadi vendor
│   └── vendor-dashboard.html ← Panel vendor
├── backend/
│   └── MarketplaceUpload.gs
│   └── docs/
│       ├── PLAN.md
│       ├── PRD.md
│       ├── SETUP_GDRIVE.md
│       ├── SPEC.md
│       └── TODO.md
```

---

## 2. Arsitektur Phase 3 — Sapatamu Gateway (Escrow System)

```
[ Frontend: Client Checkout ]
           │ (REST / API)
           ▼
[ API Endpoint: /api/marketplace/checkout.js ]
           │ ──> Integrated with Midtrans / Xendit / Tripay (SNAP / Dynamic VA / QRIS)
           ▼
[ Database: Supabase `mp_orders` & `mp_escrow_ledger` ]
           ▲
           │ (Webhook HTTP POST Signature Validated)
[ Webhook Endpoint: /api/marketplace/payment-webhook.js ]
```

### 2.1 Skema Tabel Database Baru (SQL Phase 3)

1. **`mp_orders`** (Tabel Utama Pesanan / Booking Escrow)
   - `id`: UUID (Primary Key)
   - `order_number`: TEXT UNIQUE (e.g. `SPT-20260815-XXXX`)
   - `client_id`: UUID (FK ke auth.users / public.profiles)
   - `client_name`, `client_whatsapp`, `client_email`: TEXT
   - `vendor_id`: UUID (FK ke mp_vendors)
   - `product_id`: UUID (FK ke mp_products)
   - `event_date`: DATE (Tanggal Acara Pengantin)
   - `total_amount`: BIGINT (Total Nilai Transaksi)
   - `dp_amount`: BIGINT (Nominal DP jika opsi DP)
   - `commission_rate`: NUMERIC(5,2) (Persentase Komisi Platform)
   - `commission_amount`: BIGINT (Nominal Komisi Platform)
   - `vendor_payout_amount`: BIGINT (Hak Vendor = total_amount - commission_amount)
   - `payment_status`: TEXT (`pending_payment`, `paid`, `failed`, `expired`, `refunded`)
   - `escrow_status`: TEXT (`holding`, `released_dp`, `released_full`, `disputed`, `refunded_client`)
   - `order_status`: TEXT (`booked`, `in_progress`, `awaiting_confirmation`, `completed`, `cancelled`, `disputed`)
   - `hold_until`: TIMESTAMPTZ (Tanggal batas waktu auto-complete, misal event_date + 3 hari)
   - `created_at`, `updated_at`, `paid_at`, `completed_at`

2. **`mp_escrow_ledger`** (Jurnal Log Alur Masuk & Keluar Uang Escrow)
   - `id`: UUID
   - `order_id`: UUID (FK mp_orders)
   - `transaction_type`: TEXT (`inflow_payment`, `outflow_vendor_dp`, `outflow_vendor_final`, `outflow_refund_client`, `platform_fee`)
   - `amount`: BIGINT
   - `payment_gateway_ref`: TEXT (Trans ID dari Midtrans/Xendit)
   - `status`: TEXT (`success`, `pending`, `failed`)
   - `notes`: TEXT
   - `created_at`: TIMESTAMPTZ

3. **`mp_vendor_payout_accounts`** (Rekening Bank Vendor untuk Pencairan)
   - `id`: UUID
   - `vendor_id`: UUID (FK mp_vendors)
   - `bank_code`: TEXT (BCA, MANDIRI, BNI, BRI, BSI, dll)
   - `account_number`: TEXT
   - `account_holder_name`: TEXT
   - `is_verified`: BOOLEAN
   - `created_at`: TIMESTAMPTZ

4. **`mp_payout_requests`** (Permintaan / Log Transfer Ke Rekening Vendor)
   - `id`: UUID
   - `order_id`: UUID (FK mp_orders)
   - `vendor_id`: UUID (FK mp_vendors)
   - `amount`: BIGINT
   - `payout_account_id`: UUID
   - `disbursement_ref`: TEXT (Xendit Disbursement / Midtrans Iris ID)
   - `status`: TEXT (`requested`, `processing`, `completed`, `failed`)
   - `processed_at`: TIMESTAMPTZ

5. **`mp_order_disputes`** (Sistem Komplain / Resolusi Sengketa)
   - `id`: UUID
   - `order_id`: UUID
   - `raised_by`: TEXT (`client` / `vendor`)
   - `reason`: TEXT
   - `evidence_urls`: TEXT[]
   - `status`: TEXT (`open`, `under_review`, `resolved_client_win`, `resolved_vendor_win`)
   - `admin_notes`: TEXT
   - `created_at`, `resolved_at`

### 2.2 Endpoint API Phase 3

| Endpoint | Method | Fungsi |
|----------|--------|--------|
| `/api/marketplace/checkout` | POST | Membuat Order + Generate Link Pembayaran Gateway (Midtrans SNAP / Xendit Invoice) |
| `/api/marketplace/payment-webhook` | POST | Menerima callback otomatis dari Gateway saat pembayaran lunas → Ubah status ke `paid_escrow` |
| `/api/marketplace/order-detail` | GET | Mengambil detail order, status escrow, dan hitung mundur Hari H |
| `/api/marketplace/confirm-service` | POST | Konfirmasi layanan selesai oleh Vendor / Client |
| `/api/marketplace/request-payout` | POST | Vendor mengajukan pencairan saldo escrow ke rekening bank |
| `/api/marketplace/dispute` | POST | Mengajukan komplain jika terjadi kendala pada Hari H |

### 2.3 Mekanisme Proteksi & Otomasi (Auto-Complete & Payout)
1. **Holding Period**: Uang ditahan di Escrow Sapatamu selama persiapan hingga **Hari H + 3 Hari**.
2. **Auto-Complete Trigger (Supabase Cron / Edge Function)**:
   - Jika setelah `event_date + 3 hari` Client tidak menekan "Komplain/Dispute" dan tidak menekan "Konfirmasi Selesai", sistem secara otomatis mengubah status order menjadi `completed` dan melepas saldo ke wallet/rekening vendor.
3. **Notifikasi WhatsApp Otomatis (WA Gateway Sapatamu)**:
   - **H-1 Event**: Mengingatkan Client & Vendor bahwa besok adalah Hari H.
   - **H+1 Event**: Mengirim pesan WA ke Client untuk melakukan konfirmasi penyelesaian layanan vendor.
