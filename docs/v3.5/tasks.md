# Tasks & Roadmap — SapaTamu Sortir v3.5 (SaaS Hybrid Access & Subscription)

> Rincian tahapan implementasi teknis untuk SapaTamu Sortir v3.5 berdasarkan dokumen spesifikasi dan decision log.

---

## 📋 Task List & Status

### [ ] Task 1 — Skema Database Supabase & Migrasi Relasi Vendor
- [ ] Buat tabel `sortir_vendors` dengan field `id`, `vendor_name`, `email` (UNIQUE), `password_hash`, `free_quota_remaining` (default: 10), `subscription_plan`, `subscription_expires_at`.
- [ ] Buat tabel `sortir_otps` untuk menyimpan kode verifikasi 6 digit dengan masa berlaku 5 menit.
- [ ] Tambahkan kolom `vendor_id` ke tabel `sortir_events` dan pasang foreign key index.
- [ ] Buat tabel `sortir_transactions` untuk pencatatan order Midtrans Snap.

---

### [ ] Task 2 — Backend Autentikasi & Email OTP Service
- [ ] Buat endpoint pengiriman OTP email (`action: "send_otp"`) dengan template email resmi SapaTamu.
- [ ] Buat endpoint verifikasi OTP (`action: "verify_register"`) dengan validasi unik 1 email = 1 akun.
- [ ] Buat endpoint login (`action: "login"`) untuk autentikasi email & password serta pembuatan token sesi vendor.
- [ ] Pasang rate limiting dan cooldown 60 detik untuk kirim ulang OTP.

---

### [ ] Task 3 — Interseptasi UI/UX & Pembagian Zona Fitur di `/sortir`
- [ ] **Zona Publik**: Pastikan section `📋 Penerjemah Indeks Manual` tetap 100% bebas akses dan bisa digunakan anonim tanpa login.
- [ ] **Zona Gated**: Pasang proteksi auth pada form `Buat Event Culling`, `Daftar Event Saya`, dan `Detail Event Aktif`.
- [ ] Bangun komponen Modal Auth multi-tab:
  - Tab 1: **Masuk Akun** (Email & Password).
  - Tab 2: **Daftar Akun** (Nama, Email, Password $\rightarrow$ Layar Input 6-Digit OTP).
- [ ] Tambahkan badge indikator status vendor di header:
  - Anonim: Tombol `Masuk Vendor / Daftar`.
  - Free Tier: Badge `[Free: X/10 Event]`.
  - PRO Tier: Badge `[👑 PRO Aktif s.d DD/MM/YYYY]`.

---

### [ ] Task 4 — Manajemen Kuota 10x Free Tier & Paywall Subscription
- [ ] Logika pengurangan kuota: Kurangi `free_quota_remaining` sebanyak 1 setiap kali vendor berhasil membuat event culling baru.
- [ ] Trigger Paywall: Jika `free_quota_remaining <= 0` dan tidak memiliki masa aktif PRO, tampilkan modal upgrade paket berlangganan.
- [ ] Implementasi Pilihan Paket di Modal Paywall:
  - **Paket 1 Bulan**: Rp 25.000 (30 hari).
  - **Paket 1 Tahun**: Rp 250.000 (365 hari, hemat Rp 50.000 / Free 2 bulan).
- [ ] Integrasikan Midtrans Snap SDK (mengacu pada arsitektur `upgrade.html`).
- [ ] Implementasikan **Logika Override Reset**: Jika user memperpanjang paket saat sisa hari masih ada, masa aktif di-reset/diperbarui dengan durasi paket baru dari tanggal pembayaran.

---

### [ ] Task 5 — Pengujian Responsif 3-Mode & Verifikasi Lapangan
- [ ] Uji responsivitas Modal OTP dan Paywall di Desktop ($\ge 1024$px), Tablet (768–1023px), dan Mobile (<768px).
- [ ] Uji skenario registrasi dengan email baru vs email duplikat.
- [ ] Uji alur anonim pada Penerjemah Indeks Manual (tidak terganggu oleh popup login).
- [ ] Uji transaksi sandbox Midtrans dan pembaruan status PRO seketika.
