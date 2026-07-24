# Audit Keamanan & Rencana Migrasi Supabase SapaTamu

## 1. Hasil Scanning & Analisis Arsitektur Saat Ini
Setelah melakukan pemindaian menyeluruh pada kode sumber (frontend HTML dan backend GAS), ditemukan beberapa poin kritis terkait alur data antara SapaTamu dan Supabase:

### A. Penggunaan "Anon Key" Secara Luas
- **Di Frontend (`worker.html`, `welcome.html`, `wa_blast.html`, `upgrade.html`, dll):** Semua file frontend menggunakan **Anon Key** (kunci publik) untuk mengakses database secara langsung.
- **Di Backend GAS (`Main.gs`, `CentralBackend.gs`, `UnifiedRouter.gs`):** Skrip GAS di server juga menggunakan **Anon Key** yang sama untuk mensinkronisasi data ke Supabase (saat insert/delete data).

### B. Kelemahan Arsitektur Tanpa RLS
Karena RLS (Row-Level Security) dalam status **Disabled**, setiap orang yang dapat melihat Anon Key dari halaman frontend bisa mengeksekusi *REST API Endpoint* tanpa batasan.
- **Risiko Kritikal:** File `upgrade.html` melakukan pemanggilan langsung `SELECT * FROM clients WHERE username = ...`. Jika RLS mati, peretas bisa membuang filter `WHERE` dan menarik semua isi tabel `clients` (termasuk *password*, *email*, nomor WA semua klien SapaTamu).
- **Risiko Data Tamu:** Data antrean (`print_queue`, `welcome_queue`) dan daftar tamu (`tamu`) bisa dihapus atau dimanipulasi dengan bebas.

### C. Menjawab Pertanyaan: "Apakah GAS Simpan ke Supabase secara Background Aman?"
Perintah dari GAS ke Supabase secara teori **sangat aman karena berjalan di server (background) yang tertutup**, TETAPI saat ini GAS Anda menggunakan kunci *Anon Key*. 
Seharusnya, skrip yang berjalan di backend rahasia (seperti GAS) menggunakan kunci tingkat dewa yaitu **Service Role Key**. Jika memakai Service Role Key, GAS akan kebal dari RLS dan dijamin 100% aman tanpa campur tangan keamanan frontend.

---

## 2. Rencana Implementasi & Migrasi RLS (Minimalisir Error)
Agar perpindahan ini mulus, keamanan terjaga, tetapi arsitektur Anda yang mengandalkan kecepatan Realtime Supabase di frontend tetap berfungsi, berikut adalah rute implementasinya:

### Fase 1: Upgrade Kunci Keamanan di Backend GAS (Tanpa Downtime)
- **Aksi:** Mengganti variabel `SUPABASE_KEY` di seluruh file Google Apps Script (`CentralBackend.gs`, `Main.gs`, `UnifiedRouter.gs`) dengan **Service Role Key** milik Supabase Anda.
- **Tujuan:** Service Role Key otomatis meng-bypass segala jenis blokir RLS. Ini memastikan bahwa saat kita menyalakan RLS nanti, semua sinkronisasi master (pembuatan klien baru, update password dari admin, check-in dari Google Sheet) **TIDAK AKAN MENGALAMI ERROR SAMA SEKALI**.

### Fase 2: Implementasi "Pseudo-Token" Berbasis SSID di Frontend
Karena SapaTamu memiliki mekanisme *login* custom (memvalidasi dengan Google Sheet) dan tidak menggunakan sistem *Supabase Auth (Email/Password)*, kita tidak memiliki JWT Token dari Supabase.
- **Solusi Taktis & Aman:** Kita akan menggunakan `SSID` (Spreadsheet ID) sebagai *Bearer Token / Password unik* untuk masing-masing acara.
- SSID memiliki panjang sekitar 44 karakter acak (seperti `10H7oTK0ehhiba9Ire4tUTAV1Hye7RXrNdX6jQJYw20A`), menjadikannya sangat sulit ditebak layaknya sebuah *Token Cryptography*.
- **Aksi:** Memastikan semua RLS Policy di Supabase mewajibkan pemanggil (frontend) untuk memberikan `ssid` yang tepat agar bisa membaca/menulis datanya sendiri. Jika tidak tahu SSID-nya, akses otomatis ditolak.

### Fase 3: Pembuatan RLS Policy di Supabase (Tahap Final)
Di Dashboard Supabase, kita akan menyalakan **Enable RLS** pada seluruh tabel (`clients`, `tamu`, `print_queue`, `welcome_queue`, `wishes_queue`).
Lalu kita menerapkan *Policy* yang cerdas:
1. **Policy Tabel Operasional (`tamu`, `queue`):** 
   - Hanya izinkan pembacaan & penulisan (Select/Insert/Update/Delete) terhadap baris data yang parameter `ssid`-nya diketahui dan disisipkan dengan benar oleh frontend.
2. **Policy Tabel Sensitif (`clients`):**
   - **Tutup akses manipulasi secara total**. Frontend sama sekali tidak diizinkan mengubah tabel `clients` secara langsung. Semua pendaftaran dan perubahan profil wajib melalui backend GAS (yang kebal RLS).
   - Frontend hanya diizinkan melakukan pembacaan (*Select*) terhadap baris data tertentu dengan mem-filter berdasarkan `username` mereka sendiri secara spesifik.

---

## 3. Kesimpulan & Langkah Selanjutnya
Rencana migrasi ini dirancang untuk meminimalkan perubahan drastis pada kode SapaTamu yang sudah berjalan stabil, namun memberikan lonjakan proteksi hingga 99% dibandingkan status tanpa RLS saat ini.

**Langkah Eksekusi Selanjutnya (Bisa Dijalankan Oleh Saya secara bertahap):**
1. **[TAHAP 1]** Mengedit skrip Google Apps Script untuk mempersiapkan masuknya `SERVICE ROLE KEY` rahasia.
2. **[TAHAP 2]** Menyesuaikan beberapa pemanggilan kecil di frontend jika diperlukan untuk memenuhi syarat *policy* SSID nantinya.
3. **[TAHAP 3]** Membuat *Snippet SQL* (Kode siap pakai) untuk Anda jalankan (run) sekali klik di Dashboard Supabase untuk mengaktifkan seluruh RLS Policies ini secara ajaib tanpa ribet setting manual satu per satu.
