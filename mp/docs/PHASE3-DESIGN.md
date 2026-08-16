# PHASE3-DESIGN — Sapatamu Gateway
## Desain Gabungan Booking + Pembayaran Flow-Through

**Versi:** 0.2.0-draft
**Tanggal:** 2026-08-15
**Status:** Draft — Pending Review (diskusi lanjutan terbuka)
**Referensi:** PRD.md, SPEC.md, PLAN.md, TODO.md

---

## 1. Ringkasan Desain

Phase 3 mengubah Sapatamu menjadi marketplace eksekusi penuh: dari katalog/inquiry (Phase 1) menuju **booking terkonfirmasi + escrow pembayaran** dengan prinsip:

> **"Sedikit uang, sesingkat mungkin, dan hanya lewat pihak berlisensi."**

Dua pilar utama:

1. **Booking Request → Vendor Confirm → Bayar** — Jasa punya kapasitas terbatas per hari. Client **tidak langsung bayar**; ia mengajukan booking, vendor **setujui/tolak di dashboard**, baru setelah disetujui client membayar DP. Menghilangkan risiko "bayar dulu → tanggal penuh → refund".
2. **Escrow Flow-Through** — Sapatamu **tidak pernah menjadi custodian**. Hanya **DP (30%) dan pelunasan (maks H-1)** yang transit lewat payment gateway berlisensi (Midtrans/Xendit) dan segera di-disburse otomatis ke rekening vendor. Dana yang dipegang Sapatamu praktis nol.

```
Client ──request booking──► Sistem cek slot ──► Vendor setujui/tolak
                              │                        │
                              │                        ▼ (setuju)
                              │            DP 30% bayar via gateway
                              │                │ (webhook, disburse otomatis)
                              │                ▼
                              │            event_date TERKUNCI (booked)
                              │                │
                              │         pelunasan 70% maks H-1 via gateway
                              │                │
                              │                ▼
                              │        dana pelunasan ditahan gateway (hari H)
                              │                │
                              │                ▼
                              │        H+1 auto-release → rekening vendor
                              ▼
                     completed + 2 invoice (client & vendor)
```

---

## 2. Alur Booking (Slot & Konfirmasi Vendor)

### 2.1 Prinsip
- `max_events_per_day` = kapasitas event per tanggal (default per kategori, lihat §8 Keputusan 1).
- `blocked_dates` = tanggal yang ditutup vendor manual (libur).
- **Request yang masih pending tetap menghitung slot** (hold slot) untuk mencegah "oversell" dan kompetisi race condition antar client.

### 2.2 Alur Detail

```
[1] Client pilih paket + tanggal event → klik "Ajukan Pemesanan" (BELUM bayar)
    → Sistem cek slot (logika §2.3):
        • tersedia → order `requested`, slot di-HOLD di kalender vendor
        • full    → ditolak sistem otomatis: "Tanggal penuh — coba tanggal lain/vendor lain"

[2] Vendor dapat notifikasi WA + muncul di dashboard "Permintaan Masuk"
    → diskusi lanjutan via WA (opsional, informal — link wa.me)
    → keputusan FORMAL di dashboard: Setujui / Tolak (+ alasan opsional)

[3a] SETUJUI → order `awaiting_payment` → generate link bayar DP (deadline 24–48 jam)
     → WA reminder ke client
     → client bayar DP → `booked` (event terkunci, slot terpakai)
     → DP disburse ke vendor (− komisi − fee gateway) → 2 invoice
     → lanjut alur pembayaran §3

[3b] TOLAK → status `rejected`, slot dilepas, notifikasi client + rekomendasi vendor lain

[3c] SETUJUI tapi client tidak bayar sampai deadline → `expired`, slot dilepas

[3d] Client batal sebelum bayar DP → `cancelled`, slot dilepas (tanpa penalty)
```

### 2.3 Logika Hitung Slot

```sql
-- used_slots(tanggal) = jumlah order yang BERNAZAB pada event_date
-- dengan status BUKAN terminal: requested, awaiting_payment, booked,
-- awaiting_pelunasan, held_pelunasan, completed, disputed
used_slots = COUNT(*) FROM mp_orders
  WHERE event_date = :tanggal
    AND order_status NOT IN ('rejected','expired','cancelled','refunded')

status_slot(tanggal) =
  used_slots >= vendor.max_events_per_day  → 'full'
  event_date IN vendor.blocked_dates       → 'closed'
  else                                     → 'open'
```

> **Anti-abuse**: klien yang menimbun slot tapi tidak membayar harus di-expire otomatis (reminder H+1, release H+2). Dua request simultan pada tanggal sama: yang pertama menahan slot, yang kedua dapat "full".

### 2.4 Kenapa "Setujui/Tolak" di Dashboard, Bukan Cukup WA?
- **WA = komunikasi** (negosiasi harga, penyesuaian paket) — sudah eksis di Phase 1.
- **Dashboard = tindakan formal** yang memicu state machine + link pembayaran + audit trail.
- Keputusan via WA tidak bisa memicu sistem, mudah hilang, tidak tercatat. Keduanya hidup berdampingan.

---

## 3. Alur Pembayaran (Escrow Flow-Through)

### 3.1 Struktur Pembayaran
| Fase | Porsi | Via | Kapan dana dipegang | Rilis ke vendor |
|---|---|---|---|---|
| DP | 30% (default) | Sapatamu gateway | tidak di-hold lama (disburse segera / H-7, lihat Keputusan 4) | segera sesudah konfirmasi |
| Pelunasan | 70% (default) | Sapatamu gateway | dari bayar (maks **H-1**) s/d **H+1** | H+1 |
| Opsi-2 (bayar langsung) | sisa kesepakatan | langsung ke rekening vendor | tidak pernah lewat Sapatamu | langsung |

### 3.2 Alur Detail

```
[DP] client bayar 30% via gateway (VA/QRIS/E-Wallet)
  → webhook signature validated → payment_status `dp_paid`
  → disburse DP ke rekening vendor (− komisi − fee gateway)
  → 2 invoice dibuat (client & vendor)
  → WA notif ke vendor bahwa booking terkunci

[Reminder pelunasan] di H-3 & H-2 (WA otomatis): "Segera lunasi sebelum H-1"

[H-1 23:59 = DEADLINE]
  ├─ Pelunasan sudah dibayar → payment_status `held_pelunasan`
  │      (dana ditahan gateway — proteksi klien: vendor wajib hadir hari H)
  ├─ Belum dibayar & tanpa pengajuan → order `cancelled`
  │      (nasib DP mengikuti kebijakan pembatalan, lihat Keputusan 5)
  └─ Belum dibayar TAPI klien sudah ajukan pengajuan "bayar setelah H":
       → vendor dapat notifikasi approval:
          • OPSI 1: perpanjang grace via Sapatamu gateway (mis. H+7)
          • OPSI 2: bayar langsung ke rekening vendor;
                    order ditutup `completed` + catatan
                    "sisa RpX dibayar di luar Sapatamu gateway"
          (record di mp_direct_payment_requests)

[HARI H] Acara berlangsung. Dana pelunasan tetap ditahan di gateway.
   • vendor tidak hadir / bermasalah → klien buka dispute → dana BELUM rilis → refund
   • berjalan lancar → tidak ada tindakan (auto-release)

[H+1] Auto-release: dana pelunasan → rekening vendor (minus fee gateway)
  → order_status `completed` → update invoice final
  → WA notif "dana telah diterima" + ajak review vendor
```

### 3.3 Komisi (default, lihat Keputusan 3)
- Komisi dipotong dari **setiap nominal yang diproses gateway** (DP + pelunasan via gateway).
- Bagian yang dibayar langsung ke vendor (Opsi-2) **tanpa komisi** — uang tidak lewat Sapatamu.
- Default `commission_rate` = 5% (kolom sudah ada di `mp_vendors`).

---

## 4. State Machine

### 4.1 `mp_orders.order_status`
```
                    ┌────────────────────────────────────────┐
                    ▼                                        │
  requested ──► awaiting_payment ──► booked ──► awaiting_pelunasan
       │              │   │                  │              │
       │(tolak)       │   │(expired)         │(batal)       │
       ▼              ▼   ▼                  ▼              ▼
   rejected        expired cancelled ──► held_pelunasan ──► completed
                        (DP policy)          │  ▲               ▲
                                             ▼  │               │
                                          disputed ──► refunded │
                                                               │
     cancelled_by_client/direct (Opsi-2) = completed (+catatan langsung)
```

### 4.2 `mp_orders.payment_status`
```
none ──► dp_paid ──► held_pelunasan ──► paid / paid_outside / refunded
```

---

## 5. Skema Database — Perubahan & Tabel Baru

### 5.1 Perubahan `mp_vendors` (migrasi)
```sql
ALTER TABLE mp_vendors
  ADD COLUMN max_events_per_day INTEGER DEFAULT 1,  -- kapasitas event/tanggal
  ADD COLUMN blocked_dates      DATE[] DEFAULT '{}'; -- tanggal off manual
```
> Alternatif: tabel `mp_vendor_slot_overrides` bila perlu granular per tanggal (kuota berbeda musim ramai). Keputusan diskusi lanjutan.

### 5.2 Perubahan `mp_orders` (SPEK.md 2.1 sudah mendefinisikan; dilengkapi)
- `order_status` tambahan awal: `requested`, `awaiting_payment`, `rejected`, `expired`, `awaiting_pelunasan`.
- `hold_until` dipakai 2x: deadline bayar DP (`awaiting_payment`) dan batas H+1 pelunasan.
- Tambah: `approval_token` (link setujui/tolak aman untuk dashboard vendor), `decline_reason`.

### 5.3 Tabel Baru `mp_direct_payment_requests`
```sql
CREATE TABLE mp_direct_payment_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES mp_orders(id),
  requested_at  TIMESTAMPTZ DEFAULT now(),
  reason        TEXT,               -- alasan klien bayar setelah H
  status        TEXT DEFAULT 'pending'
                CHECK (status IN ('pending','approved','rejected')),
  decision      TEXT,               -- 'gateway_extend' (Opsi 1) / 'direct' (Opsi 2)
  grace_until   TIMESTAMPTZ,        -- untuk Opsi 1
  remaining_amount BIGINT,          -- nominal yang dibayar langsung (Opsi 2)
  decided_at    TIMESTAMPTZ,
  decided_by    UUID REFERENCES auth.users(id)
);
```

### 5.4 Tabel Baru `mp_invoices` (2 per order)
```sql
CREATE TABLE mp_invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES mp_orders(id),
  invoice_number  TEXT NOT NULL UNIQUE,     -- INV-CLIENT-xxx / INV-VENDOR-xxx
  recipient_type  TEXT CHECK (recipient_type IN ('client','vendor')),
  gross_amount    BIGINT NOT NULL,          -- nilai bruto paket
  commission_amount BIGINT DEFAULT 0,       -- potongan komisi (vendor)
  gateway_fee     BIGINT DEFAULT 0,         -- potongan fee gateway (vendor)
  net_amount      BIGINT NOT NULL,          -- total yang dibayarkan / diterima
  status          TEXT DEFAULT 'draft'
                  CHECK (status IN ('draft','issued','paid','final')),
  ledger_ids      UUID[],                   -- link ke mp_escrow_ledger
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

### 5.5 `mp_escrow_ledger` — tipe transaksi ditambah
`inflow_dp`, `outflow_dp_vendor`, `platform_fee`, `inflow_pelunasan`, `outflow_pelunasan_vendor`, `outflow_refund_client`.

---

## 6. Endpoint API

| Endpoint | Method | Fungsi |
|---|---|---|
| `/api/marketplace/booking/request` | POST | Ajukan booking (cek slot → hold → `requested`) |
| `/api/marketplace/booking/decide` | POST | Setujui/Tolak oleh vendor (dashboard, token aman) |
| `/api/marketplace/booking/slots` | GET | Kalender slot publik vendor (open/closed/full) |
| `/api/marketplace/booking/cancel` | POST | Batal oleh client (pre-DP: tanpa penalty) |
| `/api/marketplace/checkout` | POST | Generate payment link DP / pelunasan |
| `/api/marketplace/payment-webhook` | POST | Callback gateway (verify signature) |
| `/api/marketplace/post-h-payment/request` | POST | Klien ajukan bayar setelah H |
| `/api/marketplace/post-h-payment/decide` | POST | Vendor pilih Opsi 1/2 |
| `/api/marketplace/confirm-service` | POST | Konfirmasi layanan selesai (client/vendor) |
| `/api/marketplace/dispute` | POST | Ajukan komplain |
| `/api/marketplace/invoices/:orderId` | GET | Unduh invoice client/vendor |
| `/api/marketplace/payout-status` | GET | Status disbursement ke rekening vendor |

---

## 7. Cron / Scheduled Jobs (Supabase pg_cron)

| Jadwal | Aksi |
|---|---|
| H-3, H-2 | Reminder pelunasan (WA) |
| H-1 23:59 | Cek pelunasan → sudah dibayar / cancelled / proses pengajuan post-H |
| H+1 pagi | Auto-release pelunasan → rekening vendor → `completed` |
| Deadline+24j | Expire pembayaran DP → lepas slot → `expired` |
| Kontinu | Rekonsiliasi harian: transaksi gateway vs `mp_escrow_ledger` |
| Aus timeout | Dispute tanpa respon → escalate admin |

---

## 8. Keputusan Diskusi yang Masih Terbuka {#keputusan}

> Semua di bawah default di-set sementara; finalisasi saat lanjut diskusi.

1. **Kapasitas default per kategori** (`max_events_per_day`):
   - Gedung/Venue = 1 · Fotografer & Video = 1 · MUA = 2 · Katering = 3 · Dekorasi = 1 · dst.? *(propose per kategori)*
2. **Deadline bayar DP setelah vendor setujui**: 24 jam / 48 jam? *(default 48j)*
3. **Komisi basis**: dipotong dari setiap nominal via gateway (DP + pelunasan); Opsi-2 tanpa komisi. Disetujui? *(default: setuju)*
4. **Kapan DP disburse ke vendor**: segera setelah `dp_paid`, atau **H-7** (mengikuti PRD lama, proteksi klien)? *(ini satu-satunya float "lama" di desain)*
5. **Nasib DP saat batal** (client tidak lunas / batal setelah DP): cair ke vendor sebagai kompensasi (non-refundable — umum industri wedding) / kembali ke klien / split sebagian?
6. **Fee gateway (≈2,9%)**: ditanggung klien (ditambahkan, kebiasaan Midtrans) / dipotong dari hak vendor / dibagi?
7. **Waitlist**: klien boleh request ke tanggal "Full" (menunggu jika batal) atau murni ditolak?
8. **Blocked dates**: kolom `DATE[]` di `mp_vendors` cukup, atau perlu tabel overrides per-tanggal (kuota berbeda musim ramai)?
9. **H+1 release**: cukup 1 hari untuk dispute window, atau diperpanjang H+3 (PRD lama)?

---

## 9. Keamanan (Wajib, Semua Model)

- API key gateway **hanya di server** (env Vercel), tidak pernah di frontend.
- **Verifikasi signature webhook** (X-Midtrans-Signature / Xendit callback token) + IP allowlist.
- Status transaksi hanya berubah via webhook — bukan request client.
- Rekening vendor divalidasi nama (nik) sebelum disbursement pertama.
- Admin 2FA; dashboard admin akses read-only pada dana; aksi refund/disburse via server + approval.
- Otorisasi booking approve/reject dengan token satu-pakai (rahasia) — bukan hanya RLS.

---

## 10. Referensi & Pertautan

- PRD.md §3 (eskrow ganda), SPEC.md §2 (arsitektur gateway), PLAN.md Phase 3, TODO.md Phase 3.
- Tabel existing yang dipakai: `mp_vendors` (commission_rate, sudah ada), `mp_products`, `mp_inquiries` (tetap untuk komunikasi informal).