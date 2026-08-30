# Decision Log — SapaTamu v3.4 (Evaluasi Event 27 Agustus & Patching)

> Dokumen pencatatan audit mendalam, analisis akar masalah (root-cause), rencana aksi, dan keputusan arsitektur patch v3.4 berdasarkan evaluasi operasional lapangan.

---

## 📊 Ringkasan Audit & Analisis Masalah

| No | Modul / Area | Gejala di Lapangan | Akar Masalah (Root Cause) yang Ditemukan | Rencana Perbaikan (Patch) |
|---|---|---|---|---|
| 1 | **Modul Check-in & Print Worker** (`checkin.html`, `scripts/check.js`, `worker.html`) | Cetak label check-in keluar 2x saat mencentang kado & angpao (total 4 label, seharusnya 3). | 1. `worker.html` memicu `fetchQueue()` ganda (Realtime Supabase + Polling Interval `3s`) saat batch item masih dalam status `WAITING` karena status `DONE` baru di-PATCH setelah seluruh print batch & delay selesai.<br>2. Ketiadaan *idempotency lock* / de-duplikasi di level print worker & antrean check-in. | 1. Terapkan *immediate status lock* (`IN_PROGRESS` / `PRINTING`) sebelum delay per item agar tidak terambil kembali.<br>2. Tambahkan `idempotencyKey` berbasis `kode_tamu + label_type` agar tipe label yang sama tidak diduplikasi dalam interval transaksi yang sama. |
| 2 | **Modul Souvenir & Checkout** (`souvenir.html`, `auth_guard.js`, `backend/Main.gs`) | 1. Auto logout dalam 2 menit saat standby.<br>2. Data scan penukaran souvenir hilang / reset saat login ulang atau reload.<br>3. Tidak berfungsi saat offline. | 1. `souvenir` belum terdaftar di whitelist `isOperationalPage` pada `auth_guard.js` (default 2 menit, harusnya 60 menit).<br>2. `claimSouvenirCheckout` di `Main.gs` memanggil konstanta tidak terdefinisi (`COLUMN_JAM_PULANG`) menyebabkan `ReferenceError`. Supabase direct patch hanya mengisi `jam_pulang` tanpa `souvenir="ya"`.<br>3. Belum terintegrasi dengan IndexedDB (`offline-db.js` / `sync-engine.js`). | 1. Tambahkan `souvenir` ke array `isOperationalPage` di `auth_guard.js` (idle timeout 60 menit).<br>2. Perbaiki fungsi `claimSouvenirCheckout` di `Main.gs` dan lengkapi payload Supabase (`jam_pulang` & `souvenir`).<br>3. Terapkan arsitektur **Saklar Off-Grid IndexedDB** (Direct Write ke Supabase saat Online, simpan lokal ke IndexedDB saat Offline, auto-async antrean saat kembali Online). |
| 3 | **Penyimpanan Kapasitas Ballroom & Stok Souvenir** (`config.html`, `profile.html`, `analytics.html`, `backend/Main.gs`) | Data kapasitas ballroom & stok souvenir tidak konsisten atau kosong saat fallback ke Spreadsheet. | 1. Di `config.html`, payload `saveWelcomePhotos` ke GAS tidak menyertakan field `kapasitasBallroom` dan `stokSouvenir`.<br>2. Di `Main.gs`, fungsi `saveWelcomePhotos` belum memetakan sel sheet `CONFIG` untuk kapasitas & stok souvenir.<br>3. Halaman `analytics.html` dan `souvenir.html` hanya membaca dari Supabase JSONB `config_welcome`, sehingga jika fallback ke Spreadsheet nilainya bernilai 0. | 1. Update payload `saveWelcomePhotos` di `config.html` & `profile.html` agar konsisten mengirim `kapasitasBallroom` dan `stokSouvenir`.<br>2. Update `saveWelcomePhotos` & `getSettings` di `Main.gs` untuk menyimpan/membaca di sheet `CONFIG` (misal `A9:B9` untuk `KAPASITAS_BALLROOM` dan `A10:B10` untuk `STOK_SOUVENIR`).<br>3. Pastikan `analytics.html` dan `souvenir.html` memiliki fallback parsing yang tangguh. |

---

## 🛡️ Rencana Gate & Detail Keputusan (5-Point Format)

### GATE-01: Perbaikan Duplikasi Cetak Label Check-in (Anti-Double Print & Immediate Lock)
1. **Fungsi Perubahan:** Mencegah label check-in tercetak 2 kali saat usher mencentang kado dan angpao sekaligus pada perangkat tablet/PWA.
2. **Dari Kode Sebelumnya:** 
   - `worker.html` menandai status `DONE` pada item cetak secara massal di akhir loop setelah seluruh label selesai dicetak dan melewati delay.
   - Realtime channel Supabase dan polling interval memicu `fetchQueue()` bersamaan, mengambil antrean yang belum sempat di-patch `DONE`.
3. **Mengarah Kemana:** 
   - Mengubah siklus kerja worker agar mengunci item menjadi status `IN_PROGRESS` atau langsung menandai `DONE` per item tepat sebelum eksekusi cetak (atomic item processing).
   - Menambahkan mekanisme client-side print deduplication (memori cache `printed_uuids` dalam session worker).
4. **Cabang Routing Terdampak:** `worker.html`, `scripts/printer_widget.js`, `temp_dev/worker.html`, tabel Supabase `print_queue`.
5. **Risiko & Trade-off Jujur:** 
   - *Risiko:* Jika printer fisik mengalami kertas macet (jam) saat status sudah `IN_PROGRESS`, label perlu dicetak ulang secara manual via tombol reprint.
   - *Mitigasi:* Sediakan tombol reprint per barcode di riwayat checkin/worker jika ada kegagalan hardware printer.

---

### GATE-02: Patch Halaman Souvenir (`souvenir.html`, `auth_guard.js`, `Main.gs`) & Saklar Off-Grid IndexedDB
1. **Fungsi Perubahan:** 
   - Menjadikan `souvenir.html` tahan standby 60 menit (bebas auto-logout 2 menit).
   - Memastikan data tamu yang sudah discan souvenir tersimpan permanen di Supabase dan Spreadsheet tanpa hilang saat reload/re-login.
   - Mengaktifkan offline-first IndexedDB dengan model saklar langsung (Direct Online vs Offline Queue Sync).
2. **Dari Kode Sebelumnya:** 
   - `auth_guard.js` tidak memasukkan string `souvenir` di whitelist `isOperationalPage`.
   - `backend/Main.gs` mengalami `ReferenceError` pada `COLUMN_JAM_PULANG`.
   - `souvenir.html` belum mengimpor `offline-db.js` dan tidak menyimpan riwayat scan lokal.
3. **Mengarah Kemana:** 
   - Menambahkan `'souvenir'` ke dalam `isOperationalPage` di `auth_guard.js`.
   - Memperbaiki `claimSouvenirCheckout` di `Main.gs` (tulis ke kolom souvenir dan kolom jam pulang).
   - Mengintegrasikan IndexedDB untuk `souvenir.html` dengan arsitektur:
     - **Mode Online:** Eksekusi langsung ke Supabase/GAS, IndexedDB di-update sebagai cermin lokal.
     - **Mode Offline:** Simpan transaksi ke `offline-db.js` (store `souvenir_claims`).
     - **Mode Kembali Online:** Sync engine otomatis mengirim antrean lokal yang belum terkirim.
4. **Cabang Routing Terdampak:** `souvenir.html`, `auth_guard.js`, `backend/Main.gs`, `offline-db.js`, `sync-engine.js`.
5. **Risiko & Trade-off Jujur:** 
   - *Risiko:* Sinkronisasi offline-to-online dapat mengalami konflik jika barcode yang sama di-scan di 2 device berbeda saat offline.
   - *Mitigasi:* Jam pulang tercepat yang akan dipertahankan (*first-claim-wins*), dan frontend menampilkan notifikasi klaim ganda jika data sudah ada di server.

---

### GATE-03: Pemetaan & Standarisasi Field Kapasitas Ballroom & Stok Souvenir
1. **Fungsi Perubahan:** Menyelaraskan penyimpanan data konfigurasi kapasitas ballroom dan stok souvenir di Supabase (tabel `config_welcome`, kolom `data`) dan Google Spreadsheet (sheet `CONFIG`, sel `B9` dan `B10`).
2. **Dari Kode Sebelumnya:** 
   - `config.html` hanya mengirim `urlFoto`, `teks1`, `teks2` ke endpoint GAS `saveWelcomePhotos`.
   - `Main.gs` tidak memiliki logika baca/tulis sel `KAPASITAS_BALLROOM` dan `STOK_SOUVENIR` di sheet `CONFIG`.
3. **Mengarah Kemana:** 
   - Memperbarui payload `saveWelcomePhotos` di `config.html` dan `profile.html` untuk menyertakan `kapasitasBallroom` dan `stokSouvenir`.
   - Memperbarui handler backend `saveWelcomePhotos` & `getSettings` di `Main.gs` agar membaca dan menulis sel `A9:B10` pada sheet `CONFIG`.
   - Sinkronisasi data di `analytics.html` dan `souvenir.html` agar dapat membaca dari Supabase sekaligus fallback ke GAS secara akurat.
4. **Cabang Routing Terdampak:** `config.html`, `profile.html`, `analytics.html`, `souvenir.html`, `backend/Main.gs`, tabel Supabase `config_welcome`, Google Sheet `CONFIG`.
5. **Risiko & Trade-off Jujur:** 
   - *Risiko:* Spreadsheet lama yang belum memiliki baris A9/A10 di sheet `CONFIG` harus dibuatkan header otomatis secara dinamis oleh GAS saat pertama kali disimpan.
   - *Mitigasi:* Tambahkan auto-header generator di `saveWelcomePhotos` jika sheet `CONFIG` belum memiliki baris kapasitas & stok souvenir.

---

### GATE-04: Standarisasi Universal Saklar Off-Grid untuk Seluruh Halaman Operasional (60 Menit)
1. **Fungsi Perubahan:** Menerapkan arsitektur saklar Off-Grid secara konsisten ke seluruh halaman operasional (`checkin.html`, `onsite.html`, `kiosk.html`, `souvenir.html`, `angpao.html`, `worker.html`, `welcome.html`, `formulir_tamu.html`, `config_invitation.html`, `config.html`).
2. **Dari Kode Sebelumnya:** 
   - Beberapa halaman operasional masih memiliki dependensi alur sync yang memutar data live lewat cache lokal secara tidak konsisten, atau sebaliknya belum memiliki fallback IndexedDB saat offline.
3. **Mengarah Kemana:** 
   - **Mode Online:** Saklar *direct* ke Supabase & Google Spreadsheet (IndexedDB hanya local copy / read buffer).
   - **Mode Offline:** Saklar *failover* ke IndexedDB untuk menampung mutasi lokal.
   - **Mode Reconnected:** Auto-async antrean mutasi lokal ke Supabase & GAS hingga tuntas.
4. **Cabang Routing Terdampak:** Seluruh 10 file halaman operasional, `offline-db.js`, `sync-engine.js`, `auth_guard.js`.
5. **Risiko & Trade-off Jujur:** 
   - *Risiko:* Beban memori browser sedikit bertambah karena mempertahankan IndexedDB store di tiap modul operasional.
   - *Mitigasi:* Gunakan lazy cleanup dan indexing spesifik per event `ssid`.

---

### GATE-05: Hirarki Status Deduplikasi Data & Proteksi Anti-Overwrite (Server-Authoritative Conflict Guard)
1. **Fungsi Perubahan:** Menjamin bahwa saat antrean lokal di-sync ulang ke Supabase/Spreadsheet, sistem hanya meng-update data yang belum ter-update di server. Data mirror cache lokal dilarang keras menimpa (*no blind overwrite*) data yang sudah terisi/diupdate lebih dulu di server oleh perangkat lain.
2. **Dari Kode Sebelumnya:** 
   - `sync-engine.js` melakukan `PATCH` secara *blind* (langsung menimpa field target tanpa memeriksa apakah status di server sudah berubah menjadi `1`, `HADIR`, `CLAIMED`, atau memiliki nilai non-kosong).
3. **Mengarah Kemana:** 
   - **Conditional Patching:** Menambahkan parameter query filter kondisi di Supabase REST (contoh: `status_hadir=eq.0`, `jam_pulang=is.null`).
   - **Pre-Check Diffing:** Memeriksa status terkini row di server sebelum menembakkan mutasi lokal. Jika data di server sudah lebih mutakhir atau bernilai final, mutasi lokal dilewati (*discarded*) dan ditandai `IGNORED_SERVER_PREVAILS`.
4. **Cabang Routing Terdampak:** `sync-engine.js`, `offline-db.js`, modul sinkronisasi Supabase & Google Apps Script.
5. **Risiko & Trade-off Jujur:** 
   - *Risiko:* Eksekusi sync membutuhkan satu langkah validasi/kondisi tambahan yang memakan sedikit round-trip waktu ekstra (<50ms).
   - *Mitigasi:* Gunakan conditional header Supabase `Prefer: return=minimal` dan batching filter agar efisiensi jaringan tetap maksimal.

---

## 📝 Tabel Log Keputusan

| Tanggal | ID GATE / Task | Status | Catatan / Tindak Lanjut |
|---|---|---|---|
| 2026-08-30 | GATE-01: Anti Double Print Check-in Label | SELESAI & TERUJI | Menerapkan *atomic item lock* (PATCH status `DONE` sebelum delay) dan *in-memory deduplication* di `worker.html` & `printer_widget.js`. |
| 2026-08-30 | GATE-02: Standby 60 Menit & Saklar Off-Grid Souvenir | SELESAI & TERUJI | Menambahkan `souvenir` & `angpao` ke `auth_guard.js` (60m), memperbaiki `claimSouvenirCheckout` di `Main.gs`, dan melengkapi integrasi IndexedDB & status di `souvenir.html`. |
| 2026-08-30 | GATE-03: Pemetaan Kapasitas & Souvenir Config | SELESAI & TERUJI | Menyelaraskan payload `config.html` dan handler `Main.gs` untuk pemetaan sheet `CONFIG` (sel A9:B10) & Supabase `config_welcome`. |
| 2026-08-30 | GATE-04: Universal Off-Grid Switch Halaman Operasional | SELESAI & TERUJI | 10 Halaman operasional terstandarisasi dengan saklar Off-Grid, IndexedDB mirror, sync-engine, dan banner offline. |
| 2026-08-30 | GATE-05: Server-Authoritative Conflict Guard | SELESAI & TERUJI | Proteksi anti-overwrite terpasang di `sync-engine.js` (pre-check diffing & conditional filtering). |


