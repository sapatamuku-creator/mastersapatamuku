# TODO — Sapatamu Marketplace
## Living Task List

**Updated:** 2026-08-12
**Status:** In Progress

---

## 🔴 Phase 0 — Fondasi (Database + API)

### Database Schema
- [x] `sql/marketplace/01_categories.sql`
- [x] `sql/marketplace/02_vendors.sql`
- [x] `sql/marketplace/03_products.sql`
- [x] `sql/marketplace/04_inquiries.sql`
- [x] `sql/marketplace/05_reviews.sql`
- [x] `sql/marketplace/06_transactions.sql`
- [x] `sql/marketplace/07_rls_policies.sql`
- [x] `sql/marketplace/08_seed_categories.sql`

### GAS — MarketplaceUpload.gs
- [x] `MarketplaceUpload.gs`

### Frontend Pages (in marketplace/frontend/)
- [x] `index.html`
- [x] `marketplace.html`
- [x] `store-product.html`
- [x] `vendor-dashboard.html`
- [x] `vendor-profile.html`
- [x] `vendor-register.html`

---

## 🟡 Phase 2 — Verifikasi Vendor & Promo Diskon (Done)
- [x] `sql/marketplace/08_vendor_verification_promo.sql`
- [x] System OTP Email & WA Vendor Verification
- [x] Promo Badge & Discount System

---

## 🔵 Phase 3 — Sapatamu Gateway (Rekening Bersama / Escrow)
- [ ] DB Schema 09-13 (Orders, Escrow Ledger, Payout Accounts, Disputes)
- [ ] Payment Gateway Integration (Midtrans SNAP / Xendit API & Webhook)
- [ ] Client Checkout & Order Tracking UI (`order-checkout.html`, `order-status.html`)
- [ ] Vendor Payout Wallet & Booking Calendar in `vendor-dashboard.html`
- [ ] Auto-release Escrow Cron Job (Hari H + 3 hari)
- [ ] Admin Dispute Resolution Panel

