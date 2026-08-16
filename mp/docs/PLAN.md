# PLAN — Sapatamu Marketplace Development Plan
## Rencana Eksekusi & Roadmap

**Versi:** 1.0.0  
**Tanggal:** 2026-08-11  
**Status:** Ready for Execution  

---

## Phase 0 — Fondasi Database & API (Est. 2-3 hari)

### Milestone 0.1 — Database Schema
- [ ] Buat `sql/marketplace/01_categories.sql` — tabel kategori
- [ ] Buat `sql/marketplace/02_vendors.sql` — tabel vendor
- [ ] Buat `sql/marketplace/03_products.sql` — tabel produk
- [ ] Buat `sql/marketplace/04_inquiries.sql` — tabel inquiry
- [ ] Buat `sql/marketplace/05_reviews.sql` — tabel review
- [ ] Buat `sql/marketplace/06_transactions.sql` — tabel transaksi
- [ ] Buat `sql/marketplace/07_rls_policies.sql` — Row Level Security
- [ ] Buat `sql/marketplace/08_storage_buckets.sql` — Supabase Storage setup
- [ ] Buat `sql/marketplace/09_seed_categories.sql` — Seed 11 kategori
- [ ] **Deploy** semua SQL ke Supabase production

### Milestone 0.2 — Shared Config
- [ ] Buat `mp-config.js` — Supabase client untuk marketplace
- [ ] Buat `mp-components.js` — Komponen UI reusable

### Milestone 0.3 — API Endpoints
- [ ] Buat `api/marketplace/vendors.js`
- [ ] Buat `api/marketplace/vendor-detail.js`
- [ ] Buat `api/marketplace/categories.js`
- [ ] Buat `api/marketplace/products.js`
- [ ] Buat `api/marketplace/product-detail.js`
- [ ] Buat `api/marketplace/inquiry.js`
- [ ] Buat `api/marketplace/register-vendor.js`

### Milestone 0.4 — Vercel Config Update
- [ ] Update `vercel.json` — tambah marketplace rewrites
- [ ] Test tidak ada conflict dengan existing routes

---

## Phase 1a — Halaman Menjadi Vendor (Est. 1-2 hari)

**File:** `vendor-register.html` (route: `/menjadi-vendor`)

---

## Phase 1b — Landing Page Marketplace (Est. 1-2 hari)

**File:** `index.html` (menggantikan landing page existing)

---

## Phase 1c — Halaman Browse Vendor (Est. 1-2 hari)

**File:** `marketplace.html` (route: `/marketplace`)

---

## Phase 1d — Profil Vendor (Est. 1-2 hari)

**File:** `vendor-profile.html` (route: `/vendor/:slug`)

---

## Phase 1e — Detail Paket/Produk (Est. 1 hari)

**File:** `store-product.html` (route: `/store/:slug`)

---

## Phase 1f — Dashboard Vendor (Est. 2-3 hari)

**File:** `vendor-dashboard.html` (route: `/vendor-dashboard`)

---

## Phase 2 — Verifikasi Vendor & Promo Diskon (Est. 2-3 hari)

- [x] Verifikasi OTP (Email & WhatsApp)
- [x] Banner Promo Diskon Paket Produk
- [x] Review & Rating System Initial

---

## Phase 3 — Sapatamu Gateway (Rekening Bersama / Escrow Payment)

### Milestone 3.1 — Schema Database Escrow (SQL)
- [ ] `sql/marketplace/09_escrow_orders.sql` — Tabel Order & Status Escrow
- [ ] `sql/marketplace/10_escrow_ledger.sql` — Tabel Jurnal Keuangan Escrow
- [ ] `sql/marketplace/11_vendor_payout_accounts.sql` — Tabel Rekening Bank Vendor
- [ ] `sql/marketplace/12_payout_requests.sql` — Tabel Log Pencairan Uang ke Vendor
- [ ] `sql/marketplace/13_order_disputes.sql` — Tabel Resolusi Sengketa & Komplain

### Milestone 3.2 — Integration Payment Gateway (Midtrans / Xendit)
- [ ] Buat `/api/marketplace/checkout.js` (Generate Payment Link / VA / QRIS)
- [ ] Buat `/api/marketplace/payment-webhook.js` (Handler Notification Payment Success)
- [ ] Integrasi Xendit / Midtrans Iris API untuk Auto Disbursement ke Rekening Vendor

### Milestone 3.3 — Frontend Client Order & Escrow Tracker
- [ ] Halaman Checkout (`order-checkout.html` / Modal di Store Product)
- [ ] Halaman Tracking Status Order Client (`order-status.html` / `client-orders.html`)
- [ ] Tombol "Konfirmasi Layanan Selesai" & "Ajukan Komplain / Dispute"

### Milestone 3.4 — Vendor Dashboard Escrow & Payout Management
- [ ] Tab **"Jadwal Booked & Escrow"** di `vendor-dashboard.html`
- [ ] Tab **"Saldo & Pencairan (Payout)"** di `vendor-dashboard.html` (Input Rekening & Klaim Dana)
- [ ] Tombol "Konfirmasi Selesai Acara / Klaim Pencairan"

### Milestone 3.5 — Auto-Complete & Dispute Resolution Engine
- [ ] Cron Job / Scheduled Function: Auto-complete `event_date + 3 hari`
- [ ] Admin Dashboard: Panel Pengawasan Rekening Bersama & Mediator Dispute

