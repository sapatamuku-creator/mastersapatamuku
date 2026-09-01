# Decision Log — SapaTamu v3.5 (Sortir SaaS, Hybrid Access & Subscription)

> Dokumen pencatatan keputusan arsitektur, pemisahan akses (Open-Source Free vs Gated Auth), autentikasi OTP Email (1-Email-1-Akun), kuota 10x Free Tier, arsitektur API Monolith Vercel Free Tier, dan sistem berlangganan SaaS pada [Dashboard Culling — SapaTamu Sortir](https://sapatamu.id/sortir).

---

## 📊 1. Latar Belakang & Analisis Kebutuhan

### Masalah & Peluang
1. **Pemisahan Value Proposition (Product-Led Growth)**:
   - SapaTamu ingin menyediakan utilitas praktis yang bisa digunakan **siapa saja secara gratis tanpa login** (seperti *📋 Penerjemah Indeks Manual* untuk mempermudah fotografer mengekstrak file dari teks WA/Email).
   - Fitur inti berbasis cloud (*Cloud Culling Real-Time, Buat Event, Sinkronisasi Google Drive, Presensi Vendor*) membutuhkan database terpusat, autentikasi aman, dan kuota server yang harus dimonetisasi.
2. **Kebutuhan Keamanan Akun & Validitas Email**:
   - Diperlukan verifikasi email via **OTP (One-Time Password)** saat registrasi untuk mencegah bot/spam dan memastikan 1 email hanya terikat pada 1 akun vendor unik.
3. **Monetisasi SaaS Berkelanjutan (Subscription Model)**:
   - Akun baru mendapatkan **10x Kuota Buat Event Culling Gratis** (*Free Tier*).
   - Setelah kuota habis, user diarahkan ke Paywall Midtrans dengan 2 opsi paket:
     - **Paket 1 Bulan**: Rp 25.000
     - **Paket 1 Tahun**: Rp 250.000 (*Hemat Rp 50.000 / Gratis 2 bulan*)
   - Sistem mendukung **Override / Perpanjangan Durasi Baru** jika user melakukan top-up sebelum masa aktif sebelumnya habis.
4. **Kepatuhan Limit Vercel & Supabase Free Tier**:
   - Vercel Free Tier (Hobby) memiliki batasan maksimal 12 Serverless Function files di direktori `/api`. Seluruh backend tools sortir dikonsolidasikan ke dalam 1 file monolith `api/sortir.js`.

---

## 🛡️ 2. Format Decision Gate (5-Point Standard SapaTamu)

### GATE-01: Pemisahan Akses Halaman `/sortir` (Public Free vs Gated Auth)
- **Timestamp Decision**: `2026-09-01T09:15:00+07:00`
- **Status**: `APPROVED & IMPLEMENTED`
1. **Fungsi Perubahan**: 
   Membagi section di halaman `/sortir` menjadi dua zona:
   - **Zona Publik (Open-Source / Free)**: `📋 Penerjemah Indeks Manual` (Bebas akses 100% tanpa login).
   - **Zona Gated (Wajib Login Vendor)**: `Buat Event Culling Baru`, `Daftar Event Saya`, `Detail Event & Seleksi Real-Time Klien`, dan integrasi lanjutan.
2. **Dari Kode Sebelumnya**: 
   Seluruh pengunjung di `/sortir` bisa membuat event culling menggunakan LocalStorage tracker tanpa login akun terpusat di Supabase.
3. **Mengarah Kemana**: 
   - Anonim visitor tetap bisa menggunakan Penerjemah Indeks Manual tanpa hambatan.
   - Klik aksi pada form buat event / seleksi cloud akan mencegat (*intercept*) user dengan modal Login / Register.
   - Setelah login, data event difilter berdasarkan `vendor_id` akun aktif via Supabase RLS.
4. **Cabang Routing Terdampak**: `sortir.html`, modal autentikasi, navigasi header status badge.
5. **Risiko & Trade-off Jujur**:
   - *Risiko*: Vendor lama yang terbiasa tanpa login perlu diarahkan untuk membuat akun agar event-nya tersimpan permanen di cloud.
   - *Mitigasi*: Diberikan kuota 10x event gratis seketika setelah registrasi pertama.

---

### GATE-02: Registrasi Vendor dengan OTP Email (1-Email-1-Akun Unik)
- **Timestamp Decision**: `2026-09-01T09:25:00+07:00`
- **Status**: `APPROVED & IMPLEMENTED`
1. **Fungsi Perubahan**: 
   Menjamin setiap vendor yang mendaftar memiliki email valid melalui verifikasi 6 digit OTP sebelum akun aktif di Supabase.
2. **Dari Kode Sebelumnya**: 
   Belum ada flow registrasi OTP mandiri di halaman `/sortir`.
3. **Mengarah Kemana**: 
   - Alur Registrasi: Input Nama + Email + Password $\rightarrow$ Backend mengirim OTP ke email $\rightarrow$ Input OTP $\rightarrow$ Akun aktif di database dengan constraint `UNIQUE(email)`.
   - 1 email tidak bisa didaftarkan lebih dari 1 kali.
   - Alur Login: Email + Salted SHA-256 Password Hash.
4. **Cabang Routing Terdampak**: `api/sortir.js?action=send_otp`, `api/sortir.js?action=verify_register`, `api/sortir.js?action=login`, tabel `sortir_vendors` & `sortir_otps`.
5. **Risiko & Trade-off Jujur**:
   - *Risiko*: Kegagalan pengiriman email OTP jika provider SMTP/GAS mengalami delay.
   - *Mitigasi*: Sediakan tombol *"Kirim Ulang OTP"* dengan countdown cooldown 60 detik.

---

### GATE-03: Paywall Subscription, Kuota Free Tier 10x & Override Reset
- **Timestamp Decision**: `2026-09-01T09:40:00+07:00`
- **Status**: `APPROVED & IMPLEMENTED`
1. **Fungsi Perubahan**: 
   Membatasi kuota pembuatan event gratis sebanyak 10 kali untuk Free Tier, dan mengunci form jika kuota 0 dengan modal upgrade paket berlangganan.
2. **Dari Kode Sebelumnya**: 
   Tidak ada pembatasan kuota maupun status subscribing di `sortir.html`.
3. **Mengarah Kemana**: 
   - Kolom `free_quota_remaining` (default: 10) berkurang secara atomic via RPC `create_sortir_event_with_quota`.
   - Jika `free_quota_remaining <= 0` dan tidak memiliki paket aktif (`subscription_expires_at < NOW()`), form pembuatan event menampilkan modal Paywall (Midtrans Snap).
   - Paket:
     - **Bulanan**: Rp 25.000 / 30 hari.
     - **Tahunan**: Rp 250.000 / 365 hari.
   - **Logika Override**: Jika vendor berlangganan ulang sebelum sisa hari habis, masa aktif langsung di-override/reset dengan durasi paket terbaru dari tanggal transaksi baru via RPC `activate_sortir_subscription`.
4. **Cabang Routing Terdampak**: `sortir.html`, `api/sortir.js?action=create_payment`, `api/sortir.js?action=payment_webhook`.
5. **Risiko & Trade-off Jujur**:
   - *Risiko*: Vendor merasa terganggu jika kuota habis di tengah event penting.
   - *Mitigasi*: Tampilkan badge indikator sisa kuota secara transparan di header (`Free: X/10`) agar vendor siap upgrade sebelum habis.

---

### GATE-04: Konsolidasi API Monolith untuk Limit Vercel Free Tier (12 Functions)
- **Timestamp Decision**: `2026-09-01T10:04:00+07:00`
- **Status**: `APPROVED & IMPLEMENTED`
1. **Fungsi Perubahan**: 
   Menggabungkan seluruh serverless tools Sortir (`sortir-auth`, `sortir-create-payment`, `sortir-payment-webhook`, `sortir-drive-img`, `sortir-list-drive`, `sortir-admin`, `sortir-session`) menjadi 1 file endpoint tunggal `api/sortir.js` menggunakan query param `action` / `endpoint`.
2. **Dari Kode Sebelumnya**: 
   Terdapat 14 file API terpisah di `/api/` yang melampaui limit 12 file Vercel Free Tier (Hobby).
3. **Mengarah Kemana**: 
   - Total file di direktori `/api/` terpangkas dari 14 menjadi hanya 8 file.
   - Mematuhi limit Vercel Free Tier tanpa resiko deploy error `FUNCTION_INVOCATION_TIMEOUT` atau limit breach.
4. **Cabang Routing Terdampak**: `vercel.json` rewrites (`/api/sortir/:path*`), `sortir.html` fetch calls.
5. **Risiko & Trade-off Jujur**:
   - *Risiko*: File `api/sortir.js` menjadi lebih panjang.
   - *Mitigasi*: Menjaga struktur kode modular dengan helper functions terisolasi dan handler dispatcher bersih.

---

## ⏱️ 3. Audit Log & Timeline Eksekusi Teknis

| No | Timestamp (WIB) | Aktivitas / Milestone | Target File / Komponen | Git Commit |
|---|---|---|---|---|
| 1 | `2026-09-01 08:30:15` | Streamlining 2-Step Export & Ganti Icon Panel | `sortir.html` | `c689e6f` |
| 2 | `2026-09-01 09:20:10` | Pembuatan Spesifikasi Teknis & Decision Log v3.5 | `docs/v3.5/` | `bc79ac6` |
| 3 | `2026-09-01 09:45:22` | Pembuatan SQL Migration Script v3.5 & RPC Atomic | `sql/migration_v3.5_sortir_saas.sql` | `905eecb` |
| 4 | `2026-09-01 10:02:20` | Implementasi UI Navbar, Modal OTP, dan Paywall Snap | `sortir.html`, `api/`, `tasks.md` | `11929c1` |
| 5 | `2026-09-01 10:06:43` | Konsolidasi Monolith `api/sortir.js` (Vercel Limit Fix) | `api/sortir.js`, `vercel.json`, `AGENTS.md` | `fa1acb1` |
| 6 | `2026-09-01 10:07:44` | Sinkronisasi Knowledge Graph via Graphify | `graphify-out/` | `7fbb0d5` |
| 7 | `2026-09-01 10:11:34` | **Uji E2E Berhasil**: Registrasi & OTP `opick8c@gmail.com` | `sortir_vendors`, `sortir_otps` | *Verified* |
| 8 | `2026-09-01 10:12:38` | **Uji E2E Berhasil**: Buat Event & Pengurangan Kuota (10 $\rightarrow$ 9) | `sortir_events`, RPC Atomic | *Verified* |

---

## 🧪 4. Bukti Verifikasi Pengujian (E2E Test Output)

### Test Case: Akun Vendor `Knowhere Studio`
- **Email**: `opick8c@gmail.com`
- **Vendor ID**: `21c16abd-7f83-46e9-b034-23c14140700c`
- **Generated OTP**: `229686` (Status: `is_used = true` di database).
- **Password Hash**: Salted SHA-256 (`cb115171...`).
- **Initial Quota**: `10` (Free Tier).
- **Post-Create Event Quota**: `9` (Atomic RPC verification sukses).
- **Event ID**: `c74e1003-4625-4b7c-b23e-01bba62bf4f5` (*Prewedding Nadyfa & Dimas - Knowhere Studio*).
