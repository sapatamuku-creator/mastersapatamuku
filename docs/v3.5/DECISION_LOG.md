# Decision Log — SapaTamu v3.5 (Sortir SaaS, Hybrid Access & Subscription)

> Dokumen pencatatan keputusan arsitektur, pemisahan akses (Open-Source Free vs Gated Auth), autentikasi OTP Email (1-Email-1-Akun), kuota 10x Free Tier, dan sistem berlangganan SaaS pada [Dashboard Culling — SapaTamu Sortir](https://sapatamu.id/sortir).

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

---

## 🛡️ 2. Format Decision Gate (5-Point Standard SapaTamu)

### GATE-01: Pemisahan Akses Halaman `/sortir` (Public Free vs Gated Auth)
1. **Fungsi Perubahan**: 
   Membagi section di halaman `/sortir` menjadi dua zona:
   - **Zona Publik (Open-Source / Free)**: `📋 Penerjemah Indeks Manual` (Bebas akses 100% tanpa login).
   - **Zona Gated (Wajib Login Vendor)**: `Buat Event Culling Baru`, `Daftar Event Saya`, `Detail Event & Seleksi Real-Time Klien`, dan integrasi lanjutan.
2. **Dari Kode Sebelumnya**: 
   Saat ini seluruh pengunjung di `/sortir` bisa membuat event culling menggunakan LocalStorage tracker tanpa login akun terpusat di Supabase Auth.
3. **Mengarah Kemana**: 
   - Anonim visitor tetap bisa menggunakan Penerjemah Indeks Manual tanpa hambatan.
   - Klik aksi pada form buat event / seleksi cloud akan mencegat (intercept) user dengan modal Login / Register.
   - Setelah login, data event difilter berdasarkan `vendor_id` akun aktif via Supabase RLS / Presence.
4. **Cabang Routing Terdampak**: `sortir.html`, `subdomain_resolver.js`, modal autentikasi, navigasi header.
5. **Risiko & Trade-off Jujur**:
   - *Risiko*: Vendor lama yang terbiasa tanpa login perlu diarahkan untuk membuat akun agar event-nya tersimpan permanen di cloud.
   - *Mitigasi*: Diberikan kuota 10x event gratis seketika setelah registrasi pertama.

---

### GATE-02: Registrasi Vendor dengan OTP Email (1-Email-1-Akun Unik)
1. **Fungsi Perubahan**: 
   Menjamin setiap vendor yang mendaftar memiliki email valid melalui verifikasi 6 digit OTP sebelum akun aktif di Supabase.
2. **Dari Kode Sebelumnya**: 
   Belum ada flow registrasi OTP mandiri di halaman `/sortir`.
3. **Mengarah Kemana**: 
   - Alur Registrasi: Input Nama + Email + Password $\rightarrow$ Backend/Edge Function mengirim OTP ke email $\rightarrow$ Input OTP $\rightarrow$ Akun aktif di database dengan constraint `UNIQUE(email)`.
   - 1 email tidak bisa didaftarkan lebih dari 1 kali.
   - Alur Login: Email + Password yang telah terverifikasi.
4. **Cabang Routing Terdampak**: Endpoint OTP (`sendSortirOtp`, `verifySortirOtp`), Supabase table `sortir_vendors`, modal auth di `sortir.html`.
5. **Risiko & Trade-off Jujur**:
   - *Risiko*: Kegagalan pengiriman email OTP jika provider SMTP/GAS mengalami delay.
   - *Mitigasi*: Sediakan tombol *"Kirim Ulang OTP"* dengan countdown cooldown 60 detik.

---

### GATE-03: Paywall Subscription, Kuota Free Tier 10x & Override Reset
1. **Fungsi Perubahan**: 
   Membatasi kuota pembuatan event gratis sebanyak 10 kali untuk Free Tier, dan mengunci form jika kuota 0 dengan modal upgrade paket berlangganan.
2. **Dari Kode Sebelumnya**: 
   Tidak ada pembatasan kuota maupun status subscribing di `sortir.html`.
3. **Mengarah Kemana**: 
   - Kolom `free_quota_remaining` (default: 10) berkurang setiap kali vendor membuat event.
   - Jika `free_quota_remaining <= 0` dan tidak memiliki paket aktif (`subscription_expires_at < NOW()`), form pembuatan event menampilkan modal Paywall (mengacu ke skema `upgrade.html` via Midtrans Snap).
   - Paket:
     - **Bulanan**: Rp 25.000 / 30 hari.
     - **Tahunan**: Rp 250.000 / 365 hari.
   - **Logika Override**: Jika vendor berlangganan ulang sebelum sisa hari habis, masa aktif langsung di-override/reset dengan durasi paket terbaru dari tanggal transaksi baru.
4. **Cabang Routing Terdampak**: `sortir.html`, `upgrade.html`, Midtrans Webhook / Supabase RPC `activate_sortir_subscription`.
5. **Risiko & Trade-off Jujur**:
   - *Risiko*: Vendor merasa terganggu jika kuota habis di tengah event penting.
   - *Mitigasi*: Tampilkan badge indikator sisa kuota secara transparan di dashboard vendor (misal: `Sisa Kuota: 3/10`) agar vendor siap upgrade sebelum habis.
