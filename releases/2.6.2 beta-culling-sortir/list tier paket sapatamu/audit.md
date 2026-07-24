# 🔐 Audit RBAC & Package Tiers — SapaTamu.ku (Final Implementation)

---

## 1. Arsitektur Role & Package-Based Access

Sistem RBAC terbaru sekarang memiliki struktur **6-Tier Hierarki** yang ketat, mengontrol akses klien ke setiap halaman berdasarkan paket (package) yang tersimpan di `localStorage` atau `sessionStorage`.

Tier hierarchy yang diterapkan:
- **Tier 1: E-Invitation Standard**
- **Tier 2: E-Invitation Premium**
- **Tier 3: Bronze Guestbook**
- **Tier 4: Silver Guestbook**
- **Tier 5: Gold Guestbook**
- **Tier 6: Collaboration (Exclusive / Deluxe)**

Setiap kali pengguna melakukan login, data profil klien mereka ditarik dari Supabase (`client_public_profile`), dan `package` disimpan ke sesi. 

---

## 2. Peta Akses Fitur Berdasarkan Tier

Berikut adalah penerapan filter akses di level `dashboard.html` (`canAccessPage()`) yang telah disesuaikan dengan instruksi terakhir:

| Halaman / Fitur | Minimal Tier (Akses) | Keterangan |
|-----------------|-----------------------|------------|
| `undangan.html` | **Tier 1 (E-Inv Standard+)** | Bisa diakses semua level klien. |
| `config_invitation.html` | **Tier 1 (E-Inv Standard+)** | Bisa diakses semua level. (Tetapi Galeri foto dibatasi maks 6 untuk Standard, Unlimited untuk Premium+). |
| `katalog_undangan.html` | **Tier 1 (E-Inv Standard+)** | Bisa diakses semua level. |
| `upgrade.html` | **Tier 1 (E-Inv Standard+)** | Bisa diakses semua level klien. |
| `dashboard.html` | **Tier 1 (E-Inv Standard+)** | Halaman utama. |
| `formulir_tamu.html` | **Tier 2 (E-Inv Premium+)** | Standard tidak bisa akses. |
| `wa_blast.html` | **Tier 2 (E-Inv Premium+)** | Standard tidak bisa akses. |
| `checkin.html` | **Tier 3 (Bronze+)** | Khusus Guestbook / Collaboration. |
| `onsite.html` | **Tier 3 (Bronze+)** | Khusus Guestbook / Collaboration. |
| `angpao.html` | **Tier 3 (Bronze+)** | Khusus Guestbook / Collaboration. |
| `kiosk.html` | **Tier 3 (Bronze+)** | Khusus Guestbook / Collaboration. |
| `welcome.html` | **Tier 4 (Silver+)** | Welcome Sign otomatis mulai dari Silver. |
| `config.html` | **Tier 4 (Silver+)** | Konfigurasi Guestbook event (Wifi, dsb) mulai dari Silver. |
| `luckydraw.html` | **Tier 4 (Silver+)** | Lucky draw system mulai dari Silver. |
| `worker.html` | **Tier 4 (Silver+)** | Worker printer access mulai dari Silver. |
| `analytics.html` | **Tier 5 (Gold+)** | Dashboard analitik real-time hanya untuk Gold dan Collaboration. |

---

## 3. Fitur Pencegahan Downgrade & Perhitungan Selisih Harga

Sesuai instruksi, pada fitur `upgrade.html` kami telah mengimplementasikan:

1. **Proteksi Non-Downgrade:**
   Jika klien mencoba membuka halaman upgrade, paket yang mereka miliki (atau yang lebih rendah dari paket saat ini) akan otomatis diberi label "✔ PAKET AKTIF" atau akan *di-dim* (grayscale/gelap) dan tombol klik akan **didisable**. Klien hanya bisa memilih paket dengan Tier yang lebih tinggi.
   
2. **Kalkulasi Partial Payment (Bayar Selisih):**
   Jika klien melakukan perubahan upgrade (misal dari paket Bronze ke Deluxe), tagihan harga pada sistem pembayaran Midtrans tidak akan dihitung harga penuh. Sistem akan menghitung otomatis `Harga Deluxe - Harga Bronze` yang sudah dibayar, sehingga pembayaran "tinggal tambahkan selisih kekurangan". Nilai ini dioper secara dinamis dari frontend ke fungsi `createMidtransTransaction` di backend.

---

## 4. Limitasi Fitur Internal: Digital Gallery

Pada halaman `config_invitation.html`:
- Untuk **E-Invitation Standard (Tier 1)**: Slot galeri foto dibatasi hingga 6 slot. Begitu pengguna menambahkan foto ke-6, tombol "Tambah Foto Galeri (+)" akan disembunyikan secara otomatis, dan teks informasi untuk melakukan upgrade ke Premium akan muncul.
- Untuk **E-Invitation Premium (Tier 2) ke atas**: Tidak ada batasan jumlah foto. Tombol tambah foto akan terus aktif tanpa batas.

---

## 5. Ringkasan Status
✅ Struktur 6-Tier Hierarki untuk RBAC telah diimplementasikan sepenuhnya.
✅ `upgrade.html` sudah dikonfigurasi untuk cegah downgrade & kalkulasi harga selisih.
✅ Galeri foto pada Editor Undangan otomatis terbatas untuk Standard, dan unlimited untuk Premium+.
✅ Seluruh pembaruan sudah di-sync ke repository `releases/v1.5_Supabase_Stable/`.
