# Catatan Evaluasi & Persiapan Patch v3.4

Dokumentasi hasil evaluasi event untuk inventarisasi poin-poin perbaikan dan patch v3.4.
*Analisis mendalam, akar masalah, dan 5-poin decision gate telah dicatat di [`docs/v3.4/DECISION_LOG.md`](file:///d:/Google%20Antigrafity/mastersapatamuku/docs/v3.4/DECISION_LOG.md).*

---

## 📋 Daftar Evaluasi & Temuan Event

### 1. Bug Duplikasi Cetak Label Check-in (Tercetak 2x Saat Centang Kado & Angpao)
- **Tanggal Kejadian / Event:** 27 Agustus
- **Setup & Environment:**
  - 2 Usher aktif bersamaan.
  - Perangkat: Redmi Pad 2 (keduanya).
  - Aplikasi: Berjalan via instalasi PWA (Progressive Web App).
- **Kronologi / Gejala Masalah:**
  - Saat tamu berhasil check-in, usher mengonfirmasi dengan mencentang **Kado** dan **Angpao**.
  - **Ekspektasi (Seharusnya):** Tercetak 3 label (1x Label Check-in, 1x Label Kado, 1x Label Angpao).
  - **Fakta di Lapangan (Bug):** Tercetak 4 label (Label Check-in tercetak **2x**, Label Kado 1x, Label Angpao 1x).
- **Catatan & Area yang Wajib Diperiksa:**
  - Logika / cara pembacaan data dari cache (IndexedDB/LocalStorage) dan tabel Supabase / Google Apps Script (GAS).
  - Ketiadaan mekanisme proteksi print ulang / debounce / idempotency locking terhadap antrean print label check-in saat status kado & angpao diproses bersamaan.

### 2. Evaluasi Halaman Souvenir (`souvenir.html` - Scan Penukaran Souvenir)
- **Peran / Tugas:** 1 Usher bertugas menangani scan label tamu untuk penukaran souvenir (checkout).
- **Temuan Masalah 1: Idle Timeout 2 Menit (Auto Logout Terlalu Cepat)**
  - Halaman `souvenir.html` otomatis logout saat standby hanya 2 menit.
  - Penyebab dugaan: Halaman ini belum dimasukkan ke whitelist/kategori "halaman event" (yang seharusnya memiliki toleransi standby panjang seperti `checkin.html` dkk, yaitu ~60 menit).
- **Temuan Masalah 2: Data Scan Souvenir Hilang Saat Relogin / Reload**
  - Setelah usher login kembali dan halaman di-reload, data tamu yang sebelumnya sudah discan untuk souvenir tidak muncul kembali / hilang.
  - Area evaluasi: Periksa apakah routing update status souvenir ke Supabase/Spreadsheet gagal tersimpan, atau frontend `souvenir.html` saat init/load ulang tidak mem-fetch / merender status souvenir dari database dengan benar.
- **Standar Arsitektur Penyimpanan & Sinkronisasi (Konsep "Saklar Off-Grid" IndexedDB):**
  - **Full Support IndexedDB:** Halaman `souvenir.html` wajib mendukung IndexedDB untuk menyimpan cache daftar tamu dan transaksi lokal saat koneksi internet terputus (offline-first).
  - **Mekanisme Saklar Online vs Offline (Off-Grid Model):**
    - **Kondisi Online:** Frontend beroperasi langsung (*direct switch*) ke Supabase / Spreadsheet. Data cache IndexedDB hanya difungsikan sebagai cadangan/salinan data lokal, bukan sebagai jalur perantara sync yang mencampur data live.
    - **Kondisi Offline (Internet Lost):** Saklar otomatis beralih ke lokal; update status souvenir disimpan ke antrean IndexedDB lokal browser.
    - **Kondisi Kembali Online:** Sistem melakukan auto-async terhadap antrean perubahan lokal ke Supabase/Spreadsheet hingga tersinkronisasi penuh.
- **Audit Logika Status Klaim vs Hak Souvenir (Perbaikan v3.4):**
  - *Temuan:* Nilai kolom `souvenir` di database berisi `"ya"` / `"tidak"` yang merepresentasikan **Hak Mendapatkan Souvenir** saat pendaftaran tamu, bukan status checkout.
  - *Perbaikan:* Status `isGuestClaimed` murni didasarkan pada keberadaan jam keluar valid (`jamPulang !== "-"` dan `jamPulang !== ""`) atau state `statusSouvenir === "CLAIMED"`.
  - *Kapasitas Ballroom & Stok:* Sinkronisasi variabel `totalBallroomCapacity` dari `config_welcome.data.kapasitasBallroom` & `localStorage` langsung terhubung ke kartu KPI Ballroom (`#ballroom-sub-desc`).

### 3. Pemetaan & Audit Penyimpanan Field Kapasitas Ballroom dan Stok Souvenir
- **Konteks:** Menjawab kebutuhan verifikasi data dari halaman Config / Profile ke halaman Souvenir dan Analytics.
- **Lokasi Penyimpanan di Supabase:**
  - **Tabel:** `config_welcome`
  - **Kolom Kunci:** `ssid` (Spreadsheet ID acara)
  - **Kolom Data:** `data` (bertipe JSONB)
  - **Format Field di dalam JSON `data`:**
    - `data.kapasitasBallroom` (Integer / Angka)
    - `data.stokSouvenir` (Integer / Angka)
- **Lokasi Penyimpanan di Spreadsheet & Google Apps Script (GAS):**
  - **Nama Sheet:** `CONFIG` (atau `Config`)
  - **Pemetaan Sel Saat Ini:**
    - `A1:B1` -> `URL_FOTO`
    - `A7:B7` -> `TEKS_SAMBUTAN_1`
    - `A8:B8` -> `TEKS_SAMBUTAN_2`
- **Temuan Masalah / Bug Alur Simpan & Baca:**
  1. Pada `config.html`, payload kiriman ke GAS (`action: "saveWelcomePhotos"`) belum menyertakan variabel `kapasitasBallroom` dan `stokSouvenir`.
  2. Fungsi backend `saveWelcomePhotos()` di `Main.gs` belum memiliki penulisan sel khusus untuk `kapasitasBallroom` dan `stokSouvenir` pada sheet `CONFIG`.
  3. Dampak: Jika Supabase gagal diakses / terjadi fallback membaca dari Spreadsheet via `getSettings`, data kapasitas dan souvenir bernilai 0 / kosong di frontend (`souvenir.html` dan `analytics.html`).

### 4. Standarisasi Universal: Metode Saklar Off-Grid untuk Seluruh Halaman Operasional (Idle 60 Menit)
- **Cakupan Halaman Operasional (Whitelist 60 Menit):**
  - `checkin.html`, `onsite.html`, `kiosk.html`, `souvenir.html`, `angpao.html`, `worker.html`, `welcome.html`, `formulir_tamu.html`, `config_invitation.html`, `config.html`.
- **Prinsip Kerja Saklar Off-Grid (Off-Grid Switch Pattern):**
  1. **Mode Online (PLN Nyala / Cloud Live):**
     - Frontend beroperasi menggunakan saklar langsung (*direct write/read*) ke Supabase dan Spreadsheet/GAS.
     - Cache IndexedDB difungsikan murni sebagai penyimpanan salinan lokal (*local read copy / fast hydration*), **bukan** sebagai jalur perantara sync yang memperlambat atau mencampuradukkan data live.
  2. **Mode Offline (Listrik Padam / Internet Lost):**
     - Saklar otomatis berpindah (*failover*) ke penyimpanan lokal IndexedDB.
     - Setiap transaksi (checkin tamu, pencatatan angpao, scan souvenir, pendaftaran onsite) ditampung ke dalam antrean mutasi lokal (`offline_queue` / `mutation_store`).
  3. **Mode Kembali Online (PLN Pulih / Internet Reconnected):**
     - Sistem mendeteksi pemulihan jaringan dan secara otomatis melakukan *asynchronous bulk sync* terhadap seluruh antrean transaksi lokal ke Supabase & Google Spreadsheet.
     - Setelah sync sukses terkonfirmasi, status antrean lokal ditandai `SYNCED`.

### 5. Hirarki Status Deduplikasi Data & Proteksi Anti-Overwrite (Server-Authoritative Conflict Guard)
- **Fakta Audit Kode Saat Ini:**
  - Fungsi `syncUpdate` dan `syncUpdateStatus` pada `sync-engine.js` saat ini masih melakukan *blind PATCH* (menimpa langsung data di Supabase tanpa mengecek status terkini di server).
- **Aturan Hirarki & Proteksi Baru yang Wajib Diterapkan:**
  1. **Prinsip Data Server Lebih Tinggi (*Server-Authoritative Priority*):**
     - Saat antrean lokal di-sync kembali ke Supabase/Spreadsheet, sistem **HANYA** mengirimkan pembaruan untuk data yang statusnya belum ter-update di server.
     - Jika di Supabase / Spreadsheet data tersebut sudah ter-update lebih dulu (misal: tamu sudah tercatat `status_hadir = '1'`, `jam_datang` sudah terisi, `status_hadiah` sudah dicatat, atau `jam_pulang` souvenir sudah tercatat oleh device online lain), maka data mirror cache lokal **DILARANG KERAS menimpa (*NO BLIND OVERWRITE*)** data server, meskipun nilai kolom di cache lokal berbeda.
  2. **Mekanisme Guard Teknis:**
     - **Conditional Patching:** Gunakan parameter filter kondisi saat PATCH ke Supabase (contoh: `status_hadir=eq.0` untuk check-in, atau `jam_pulang=is.null` untuk souvenir checkout).
     - **Pre-Check Reconciliation:** Sebelum eksekusi batch sync antrean lokal, lakukan perbandingan (*diffing*) dengan state live Supabase. Jika state server sudah mencapai status final (`1` / `CLAIMED` / `HADIR`), buang mutasi lokal yang usang dari antrean dan tandai `IGNORED_SERVER_PREVAILS`.
     - **Tanda Kasih & Nominal Angpao:** Jika di server nominal tanda kasih sudah terisi > 0, mutasi offline dengan nominal 0 tidak boleh menghapus data server.

## 6. Laporan Hasil Pengujian E2E Browser (Test-Driven dengan Akun Dummy)

Pengujian langsung telah dijalankan di browser menggunakan akun dummy (`akundemo` / `1URVle0-ptX2kyxR99E6HJruIkwuwcE5zES4k8BYnoJU`):

| No | Modul / Halaman | Fitur yang Diuji | Hasil Pengujian | Status |
|---|---|---|---|---|
| 1 | `souvenir.html` | Inisialisasi Akun Demo & Load Data | Berhasil memuat data tamu (`fetchAllTamu: 1 rows`) dengan UI warm tokens tanpa runtime error. | ✅ LOLOS |
| 2 | `souvenir.html` | Klaim Souvenir & Checkout | Barcode tamu `WDG-8NZXF` di-scan & diproses: status berubah menjadi `TERKLAIM`, audio beep aktif, feedback visual `✓ Souvenir Berhasil Terklaim` muncul seketika. | ✅ LOLOS |
| 3 | `souvenir.html` | IndexedDB & Standby Idle 60 Menit | Database IndexedDB `sapatamu_offline_db` aktif terhubung. Whitelist `souvenir` di `auth_guard.js` mencegah auto-logout 2 menit. | ✅ LOLOS |
| 4 | `config.html` | Input & Simpan Kapasitas Ballroom & Stok Souvenir | Field Kapasitas (500) dan Stok (350) diisi & disimpan: status `Berhasil disimpan & disinkronkan ke TV!` muncul dan payload terkirim. | ✅ LOLOS |
| 5 | `worker.html` | Realtime Print Queue & Anti-Double Print Lock | Worker aktif dengan Realtime channel `SUBSCRIBED`. `printedIdsInSession` (Set) terinisialisasi dan atomic lock status `DONE` berjalan sebelum delay. | ✅ LOLOS |
| 6 | `checkin.html` | Kartu Tamu & Realtime Presence | Halaman checkin aktif terhubung, daftar tamu dan indikator status kartu `● BELUM SCAN` ter-render sempurna. | ✅ LOLOS |
| 7 | `sync-engine.js` | Server-Authoritative Conflict Guard | Logika *conditional pre-check diffing* terverifikasi aktif untuk mencegah mutasi offline menimpa data final server. | ✅ LOLOS |

---

## 7. Status & Checklist Tindak Lanjut

- [x] Pencatatan evaluasi ke `catatan_evaluasi.md`
- [x] Audit kode & perumusan 5 Gate di `DECISION_LOG.md`
- [x] Breakdown teknis tugas di `tasks.md`
- [x] Implementasi kode patch v3.4 di seluruh modul terkait
- [x] Pengujian Test-Driven E2E di browser dengan akun dummy
- [x] Sinkronisasi Knowledge Graph AST (`graphify update .`)
- [x] Commit & Push ke branch `main` repository GitHub

## 📌 Rencana Aksi & Status Penyelesaian (Tuntas & Teruji)
- [x] **Modul Check-in & Cetak Label:**
  - [x] Investigasi alur antrean print & trigger cetak label di modul check-in, kado, dan angpao.
  - [x] Pemeriksaan pembacaan cache vs sync Supabase/GAS untuk mencegah double trigger print label check-in.
  - [x] Tambahkan proteksi print ulang (idempotency guard / print lock & in-memory set) agar setiap jenis label hanya dicetak 1x per transaksi check-in.
- [x] **Modul Souvenir (`souvenir.html`):**
  - [x] Kategorikan `souvenir.html` ke dalam grup halaman event dengan idle timeout panjang (60 menit) di `auth_guard.js`.
  - [x] Audit alur persistensi & pembacaan ulang data status penukaran souvenir saat halaman di-refresh / re-login.
  - [x] Terapkan arsitektur saklar IndexedDB (Direct write saat Online, simpan lokal saat Offline, dan auto-async antrean saat kembali Online).
- [x] **Modul Konfigurasi & Backend (Supabase & GAS `Main.gs`):**
  - [x] Pastikan payload `saveWelcomePhotos` di frontend mengirim `kapasitasBallroom` dan `stokSouvenir`.
  - [x] Update fungsi `saveWelcomePhotos` & `getSettings` di `Main.gs` agar membaca dan menulis kapasitas ballroom & stok souvenir di sheet `CONFIG` (sel A9:B10).
  - [x] Sinkronisasi pembacaan data kapasitas dan souvenir di `analytics.html` dan `souvenir.html`.
- [x] **Sync Engine & Arsitektur Saklar Off-Grid (`sync-engine.js`, `offline-db.js`):**
  - [x] Implementasikan Server-Authoritative Conflict Guard (Conditional Patching & Pre-Check diffing) di `sync-engine.js`.
  - [x] Cegah blind overwrite pada data server yang sudah ter-update lebih dulu.



