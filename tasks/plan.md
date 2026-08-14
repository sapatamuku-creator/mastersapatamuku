# Plan: Phase 2 — Verifikasi Vendor & Promo Diskon

Dependency order (backend-first, UI setelah API siap):

```
T1 SQL migration
  ↓
T2 Backend OTP/reset/login (api/mp.js)      T3 Promo+status write (api/mp.js vendor-products, vendor-me)
  ↓                                                  ↓
T4 Filter status + promo-aware poly (api/mp-public.js) ← T3
  ↓
T5 OG (lib/og-shared.js: status filter + promo desc)
  ↓
T6 vendor-register.html (OTP email)
  ↓
T7 vendor-dashboard.html (verify WA, forgot/reset, promo modal, pending badge)
  ↓
T8 vendor-profile.html + vendor-product.html (promo display + WA msg)
  ↓
T9 marketplace.html + index.html (promo card)
  ↓
T10 Verifikasi end-to-end + deploy
```

Risiko utama:
- **Supabase email OTP vs magic link** — UI menangani keduanya; fallback deteksi via admin API di vendor-me.
- **Promo-aware price_from** — hitung di edge (mp-public) dari min(price) vs min(effective), bukan ubah trigger DB.
- **Fonnte hanya dari Node API** (env ada di Vercel) — jangan dari edge/middleware.

## T1: Migration SQL
`sql/marketplace/08_vendor_verification_promo.sql` — tabel vendor_otp + kolom mp_vendors + mp_products (lihat spec).

## T2: Auth backend (api/mp.js)
- register-vendor: signup + OTP email, respons `needs_email_otp`
- send-otp / verify-otp (email_verify, wa_verify, wa_reverify, reset)
- login-vendor: hapus fallback, gate EMAIL_UNVERIFIED
- forgot-password (email via recover, wa via kode) + reset-password (admin API)

## T3: Product/vendor write (api/mp.js)
- vendor-products POST/PATCH: status logic + discount_price/promo_start_at/promo_end_at
- vendor-me PATCH: ganti whatsapp → unverify + repend + OTP ke nomor baru

## T4: Public poly (api/mp-public.js)
- vendors / vendor-detail / product-detail / product-cover: status=eq.publish
- payload promo: has_promo, price_display, price_original, promo_end_at
- vendors: price_from promo-aware (price_from_display + price_from_original)

## T5: OG (lib/og-shared.js)
- resolveProductById: status filter; buildProductOgMeta: harga promo di description

## T6-T9: Frontend (sesuai spec)

## T10: Verifikasi + deploy per milestone
