# Tasks & Roadmap — SapaTamu Sortir v3.5 (SaaS Hybrid Access & Subscription)

> Rincian tahapan implementasi teknis untuk SapaTamu Sortir v3.5 berdasarkan dokumen spesifikasi dan decision log.

---

## 📋 Task List & Status

### [x] Task 1 — Skema Database Supabase & Migrasi Relasi Vendor
- [x] Buat tabel `sortir_vendors` dengan field `id`, `vendor_name`, `email` (UNIQUE), `password_hash`, `free_quota_remaining` (default: 10), `subscription_plan`, `subscription_expires_at`.
- [x] Buat tabel `sortir_otps` untuk menyimpan kode verifikasi 6 digit dengan masa berlaku 5 menit.
- [x] Tambahkan kolom `vendor_id` ke tabel `sortir_events` dan pasang foreign key index.
- [x] Buat tabel `sortir_transactions` untuk pencatatan order Midtrans Snap.
- [x] Buat RPC atomic `create_sortir_event_with_quota` dan `activate_sortir_subscription`.
- *File:* `sql/migration_v3.5_sortir_saas.sql`

---

### [x] Task 2 — Backend Autentikasi & Email OTP Service
- [x] Buat endpoint pengiriman OTP email (`action: "send_otp"`) dengan template email resmi SapaTamu.
- [x] Buat endpoint verifikasi OTP (`action: "verify_register"`) dengan validasi unik 1 email = 1 akun.
- [x] Buat endpoint login (`action: "login"`) untuk autentikasi email & password serta pembuatan token sesi vendor.
- [x] Buat endpoint profile sync (`action: "get_profile"`) untuk update status kuota & masa aktif PRO.
- [x] Pasang rate limiting dan cooldown 60 detik untuk kirim ulang OTP.
- *File:* `api/sortir-auth.js`, `api/sortir-create-payment.js`, `api/sortir-payment-webhook.js`

---

### [x] Task 3 — Interseptasi UI/UX & Pembagian Zona Fitur di `/sortir`
- [x] **Zona Publik**: Pastikan section `📋 Penerjemah Indeks Manual` tetap 100% bebas akses dan bisa digunakan anonim tanpa login.
- [x] **Zona Gated**: Pasang proteksi auth pada form `Buat Event Culling`, `Daftar Event Saya`, dan `Detail Event Aktif`.
- [x] Bangun komponen Modal Auth multi-tab:
  - Tab 1: **Masuk Akun** (Email & Password).
  - Tab 2: **Daftar Akun** (Nama, Email, Password $\rightarrow$ Layar Input 6-Digit OTP).
- [x] Tambahkan badge indikator status vendor di header:
  - Anonim: Tombol `Masuk / Daftar Vendor`.
  - Free Tier: Badge `[Free: X/10 Event]`.
  - PRO Tier: Badge `[👑 PRO Aktif]`.
- *File:* `sortir.html`

---

### [x] Task 4 — Manajemen Kuota 10x Free Tier & Paywall Subscription
- [x] Logika pengurangan kuota: Kurangi `free_quota_remaining` sebanyak 1 setiap kali vendor berhasil membuat event culling baru via RPC `create_sortir_event_with_quota`.
- [x] Trigger Paywall: Jika `free_quota_remaining <= 0` dan tidak memiliki masa aktif PRO, tampilkan modal upgrade paket berlangganan.
- [x] Implementasi Pilihan Paket di Modal Paywall:
  - **Paket 1 Bulan**: Rp 25.000 (30 hari).
  - **Paket 1 Tahun**: Rp 250.000 (365 hari, hemat Rp 50.000 / Free 2 bulan).
- [x] Integrasikan Midtrans Snap SDK (`loadMidtransSnap()` dan `window.snap.pay`).
- [x] Implementasikan **Logika Override Reset**: Jika user memperpanjang paket saat sisa hari masih ada, masa aktif di-reset/diperbarui dengan durasi paket baru dari tanggal pembayaran.
- *File:* `sortir.html`, `api/sortir-create-payment.js`, `api/sortir-payment-webhook.js`

---

### [x] Task 5 — Pengujian Responsif 3-Mode & Verifikasi Lapangan
- [x] Responsivitas Modal OTP dan Paywall di Desktop ($\ge 1024$px), Tablet (768–1023px), dan Mobile (<768px).
- [x] Alur anonim pada Penerjemah Indeks Manual (tidak terganggu oleh popup login).
- [x] Multi-tenant isolation: Daftar Event Saya hanya memuat data event milik vendor yang sedang login (`vendor_id`).

---

### [x] Task 6 — Konsolidasi API Monolith & UI Clean-up (GATE-04, GATE-05, GATE-06)
- [x] Konsolidasi seluruh file API sortir ke dalam 1 dispatcher monolith `api/sortir.js` untuk Vercel Free Tier.
- [x] Hapus tombol navigasi header Owner, digantikan direct URL slug `/sortir-owner`.
- [x] Penyesuaian alignment badge "✔ Dipilih" & pembersihan teks teknis Midtrans pada modal paywall.

---

### [x] Task 7 — Dropdown Kode Negara, Sanitasi WA & Notifikasi Reminder PRO H-7 (GATE-07)
- [x] Dropdown kode negara (+62, +1, +60, dll) dengan sanitasi format standar E.164.
- [x] Endpoint cron pengingat kedaluwarsa PRO (`action=run_reminder_cron`) via Email & WhatsApp Fonnte.
- [x] Tabel audit log `sortir_logs` untuk mencatat riwayat notifikasi.

---

### [x] Task 8 — Alur Lupa Password & Reset Link Aman (GATE-08)
- [x] Endpoint `action=forgot_password` (token 15 menit, dikirim via WhatsApp & Email).
- [x] Endpoint `action=verify_reset_password` dengan proteksi anti-reuse (password baru tidak boleh sama dengan password lama).
- [x] Handler UI reset password di `sortir.html` dengan modal sukses & autofill login.

---

### [x] Task 9 — Notifikasi Struk Pembayaran & Aktivasi Paket PRO (GATE-09)
- [x] Helper `sendPaymentSuccessNotification` (Email HTML SapaTamu & WhatsApp Fonnte).
- [x] Idempotency pre-check guard berbasis `sortir_logs` untuk mencegah notifikasi ganda saat webhook dan client berbenturan.
- [x] Perekaman audit log dengan action `PAYMENT_SUCCESS_NOTIFICATION`.
- *File:* `api/sortir.js`, `sortir.html`

---

### [x] Task 10 — Interactive Page Tour Guide (Free-First Onboarding) (GATE-10)
- [x] Rancang 5 langkah interaktif onboarding: dimulai dari fitur 100% Free tanpa login (Penerjemah Indeks Manual & Local Culling) lalu mengarah ke fitur Cloud & PRO (Online Gallery & Manajemen Event).
- [x] Komponen Spotlight Cutout emas (`#sortir-tour-spotlight`), Overlay gelap halus (`#sortir-tour-overlay`), dan Tooltip interaktif (`#sortir-tour-tooltip`).
- [x] Checkbox *"Jangan tampilkan ini kedepannya"* tersimpan di `localStorage` (`sapatamu_sortir_tour_dismissed`).
- [x] Floating trigger button melayang (`💡 Panduan Sortir`) di pojok kiri bawah untuk memutar ulang panduan kapan saja.
- [x] Responsivitas 3-mode (Desktop, Tablet, Mobile) dengan auto-scroll halus ke elemen target.
- *File:* `sortir.html`

---

### [x] Task 11 — Section Quick Navigator Bar (Pill Jump Menu & 100% FREE Spotlight) (GATE-11)
- [x] Menambahkan Sticky Section Navigation Bar (`#sortir-quick-nav`) di bawah header dengan visual glassmorphism (`backdrop-filter: blur(14px)`).
- [x] Menempatkan **1. Penerjemah Indeks** dengan badge `100% FREE` (#2E7D32) di posisi nomor satu sebagai flagship value proposition.
- [x] Menambahkan navigasi jump: 2. Local Culling (Offline PC), 3. Buat Galeri Online (Free 10x), 4. Daftar Event Saya, dan 5. Upgrade PRO.
- [x] Fitur Smooth Scroll Jump dengan offset dinamis (`jumpToSection`) dan micro-pulsing highlight ring pada card tujuan.
- [x] Scrollspy otomatis menggunakan `IntersectionObserver` (`initSortirScrollspy`) untuk menandai tab yang sedang aktif saat pengguna melakukan scroll.
- [x] Responsif 3-mode (Desktop, Tablet touch-scroll, Mobile compact chips).
- *File:* `sortir.html`



