# Tasks & Work Breakdown — SapaTamu v3.4 (Evaluasi Event Patching)

> Rincian tugas perbaikan patch v3.4 yang telah divalidasi dengan `skill-decision-gate`, `sapatamu-projects`, dan `perf-ui-ux-3mode`.

---

## 📋 Task List & Status

### [x] Task 1 — Anti Double-Print Label Check-in (GATE-01)
- **File Terdampak:** `worker.html`, `scripts/printer_widget.js`, `temp_dev/worker.html`
- **Pekerjaan Selesai:**
  1. Mengubah alur batch di `worker.html` dan `printer_widget.js` menjadi *atomic item lock*: patch status `DONE` ke Supabase seketika sebelum jeda print delay agar tidak diambil kembali oleh polling/realtime fetch.
  2. Memasang in-memory `printedIdsInSession` (Set) di `worker.html` & `printer_widget.js` untuk deduplikasi ID dalam sesi aktif.

### [x] Task 2 — Perbaikan Halaman Souvenir & Standby 60 Menit (GATE-02)
- **File Terdampak:** `auth_guard.js`, `souvenir.html`, `backend/Main.gs`
- **Pekerjaan Selesai:**
  1. Mendaftarkan `souvenir` dan `angpao` ke array `isOperationalPage` di `auth_guard.js` (durasi idle timeout 60 menit).
  2. Memperbaiki fungsi `claimSouvenirCheckout` di `backend/Main.gs` (sinkronisasi ke Supabase dan Google Spreadsheet tanpa runtime error).
  3. Memperbaiki payload dan helper `isGuestClaimed` di `souvenir.html` untuk memvalidasi `jam_pulang` dan `souvenir: 'ya'`.
  4. Mengintegrasikan `offline-db.js`, `sync-engine.js`, `sw.js`, dan offline banner ke `souvenir.html`.

### [x] Task 3 — Standardisasi Field Kapasitas Ballroom & Stok Souvenir (GATE-03)
- **File Terdampak:** `config.html`, `backend/Main.gs`
- **Pekerjaan Selesai:**
  1. Menyertakan `kapasitasBallroom` dan `stokSouvenir` dalam payload `action: "saveWelcomePhotos"` di `config.html`.
  2. Memperbarui `saveWelcomePhotos` dan `getSettings` di `backend/Main.gs` untuk memetakan sel `A9:B9` (`KAPASITAS_BALLROOM`) dan `A10:B10` (`STOK_SOUVENIR`) di sheet `CONFIG` serta mirror ke Supabase tabel `config_welcome`.

### [x] Task 4 — Universal Saklar Off-Grid & Server-Authoritative Conflict Guard (GATE-04 & GATE-05)
- **File Terdampak:** `sync-engine.js`, `offline-db.js`, seluruh 10 halaman operasional
- **Pekerjaan Selesai:**
  1. Menerapkan Server-Authoritative Conflict Guard di `sync-engine.js` (`syncUpdate` & `syncUpdateStatus`) agar data offline tidak menimpa record yang sudah berstatus final di server (*no blind overwrite*).
  2. Memastikan seluruh 10 halaman operasional terstandarisasi dengan saklar Off-Grid, IndexedDB mirror, sync engine, dan service worker.
