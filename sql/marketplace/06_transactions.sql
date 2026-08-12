-- ============================================================
-- 06_transactions.sql — Catatan komisi & transaksi (Phase 1: manual)
-- ============================================================
-- Requires: 02_vendors.sql, 03_products.sql, 04_inquiries.sql

CREATE TABLE IF NOT EXISTS mp_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id         UUID NOT NULL REFERENCES mp_vendors(id),
  product_id        UUID REFERENCES mp_products(id) ON DELETE SET NULL,
  inquiry_id        UUID REFERENCES mp_inquiries(id) ON DELETE SET NULL,

  -- Nilai transaksi
  deal_amount       BIGINT NOT NULL,          -- Nilai deal vendor-client (Rupiah)
  commission_rate   NUMERIC(5,2) NOT NULL,    -- Rate komisi saat transaksi (snapshot)
  commission_amount BIGINT NOT NULL,          -- Nominal komisi = deal_amount * rate / 100

  -- Detail client (snapshot, karena inquiry bisa hapus)
  client_name       TEXT,
  client_whatsapp   TEXT,
  event_date        DATE,

  -- Status komisi
  status            TEXT DEFAULT 'pending'
                    CHECK (status IN ('pending','invoiced','paid','completed','cancelled')),

  -- Catatan admin
  notes             TEXT,
  payment_proof_url TEXT,   -- Bukti bayar dari Google Drive proxy
  invoice_number    TEXT,   -- Nomor invoice manual

  -- Metadata
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  paid_at           TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mp_transactions_vendor  ON mp_transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_mp_transactions_status  ON mp_transactions(status);
CREATE INDEX IF NOT EXISTS idx_mp_transactions_created ON mp_transactions(created_at DESC);

-- Auto-update
CREATE TRIGGER trg_mp_transactions_updated_at
  BEFORE UPDATE ON mp_transactions
  FOR EACH ROW EXECUTE FUNCTION mp_set_updated_at();

-- RLS — Hanya service role / admin yang bisa akses
ALTER TABLE mp_transactions ENABLE ROW LEVEL SECURITY;

-- Vendor bisa lihat transaksinya sendiri (read-only)
CREATE POLICY "mp_transactions_vendor_read"
  ON mp_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM mp_vendors v
      WHERE v.id = vendor_id AND v.user_id = auth.uid()
    )
  );

-- Hanya service role yang bisa insert/update (admin lewat Supabase dashboard)
-- Tidak ada policy INSERT/UPDATE untuk anon/authenticated biasa

COMMENT ON TABLE mp_transactions IS 'Catatan komisi dan transaksi deal vendor-client. Phase 1: diisi manual oleh admin.';
COMMENT ON COLUMN mp_transactions.commission_rate IS 'Snapshot rate komisi saat transaksi dibuat (persen)';
COMMENT ON COLUMN mp_transactions.status IS 'pending=deal baru, invoiced=invoice sudah dikirim, paid=komisi dibayar, completed=selesai';
