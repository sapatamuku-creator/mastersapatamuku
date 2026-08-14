-- ============================================================
-- 08_vendor_verification_promo.sql — Phase 2
-- Verifikasi akun vendor (email & WhatsApp) + promo diskon paket
-- ============================================================
-- Requires: 02_vendors.sql, 03_products.sql
-- Idempotent: aman dijalankan ulang.

-- ── 1. Tabel OTP vendor ──
CREATE TABLE IF NOT EXISTS vendor_otp (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id   UUID NOT NULL REFERENCES mp_vendors(id) ON DELETE CASCADE,
  channel     TEXT NOT NULL CHECK (channel IN ('email','whatsapp')),
  purpose     TEXT NOT NULL CHECK (purpose IN ('email_verify','wa_verify','wa_reverify','reset')),
  target      TEXT NOT NULL,          -- email / nomor WA yang menerima OTP
  code        TEXT NOT NULL,          -- kode 6 digit / token reset
  attempts    INTEGER NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_otp_vendor   ON vendor_otp(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_otp_expiry   ON vendor_otp(expires_at);

ALTER TABLE vendor_otp ENABLE ROW LEVEL SECURITY;

-- Hanya service role yang mengelola OTP (tidak ada policy publik/anon).
-- Blokir akses non-service: tanpa policy apa pun, RLS menolak semua peran
-- kecuali yang lewat (service_role melewati RLS secara default di Supabase).

-- ── 2. Kolom verifikasi vendor ──
ALTER TABLE mp_vendors
  ADD COLUMN IF NOT EXISTS email_verified_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whatsapp_verified_at TIMESTAMPTZ;

-- Backfill: vendor yang sudah ada sebelum Phase 2 dianggap terverifikasi
-- (akun dibuat sebelum sistem OTP ada). Paket lama otomatis 'publish'.
UPDATE mp_vendors SET email_verified_at = COALESCE(email_verified_at, now()) WHERE email IS NOT NULL;
UPDATE mp_vendors SET whatsapp_verified_at = COALESCE(whatsapp_verified_at, now()) WHERE whatsapp IS NOT NULL;

-- ── 3. Kolom status & promo produk ──
ALTER TABLE mp_products
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'publish'
    CHECK (status IN ('pending','publish')),
  ADD COLUMN IF NOT EXISTS discount_price BIGINT,
  ADD COLUMN IF NOT EXISTS promo_start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS promo_end_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_mp_products_status ON mp_products(status);
CREATE INDEX IF NOT EXISTS idx_mp_products_promo  ON mp_products(promo_start_at, promo_end_at);

COMMENT ON TABLE vendor_otp IS 'Kode OTP verifikasi email/WhatsApp & token reset password vendor';
COMMENT ON COLUMN mp_vendors.email_verified_at IS 'Waktu email diverifikasi (syarat akun aktif)';
COMMENT ON COLUMN mp_vendors.whatsapp_verified_at IS 'Waktu WhatsApp diverifikasi (syarat paket publish)';
COMMENT ON COLUMN mp_products.status IS 'pending = belum terlihat publik (menunggu verifikasi WA vendor), publish = tampil di marketplace';
COMMENT ON COLUMN mp_products.discount_price IS 'Harga promo (harus < price); NULL = tidak ada promo';
COMMENT ON COLUMN mp_products.promo_start_at IS 'Awal periode promo (inclusive)';
COMMENT ON COLUMN mp_products.promo_end_at IS 'Akhir periode promo (inclusive)';