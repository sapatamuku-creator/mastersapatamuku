# SapaTamu v2.3 — Release Notes
**Tanggal Rilis:** 5 Juli 2026  
**Status:** Stable Release (Rollback Point)  
**Branch:** main

---

## ✅ Perbaikan & Fitur Baru di v2.3

### 🗓️ Event Date — Fetch dari Metadata Client
- `formulir_tamu.html`: Fungsi `parseIndonesianDate` + `formatIndonesianDate` ditambahkan untuk parsing teks tanggal bahasa Indonesia ke format ISO (`YYYY-MM-DD`) dan sebaliknya.
- `event_date` sekarang di-fetch dari `metadata_client` (Supabase) → tidak fallback ke `new Date()` lagi.
- Field `event_date` dilampirkan ke semua jalur insert tamu:
  - Input manual (`handleV3Submit`)
  - Batch import Excel
  - Tamu offline dari `angpao.html`

### 📅 Calendar Picker untuk Edit Detail Acara
- Field **Tanggal Acara** di modal Edit Detail Acara sekarang menggunakan native calendar picker (bukan input teks bebas).
- Klik field → kalender muncul → setelah pilih tanggal → otomatis dikonversi ke format Indonesia: `"Sabtu, 11 Juli 2026"`.
- Saat modal dibuka, kalender otomatis menunjuk ke tanggal acara yang sudah tersimpan.

### 📊 Indikator Sync Real-time (GAS → Spreadsheet)
- Spinner kecil diganti dengan badge angka live: **`849(realtime)/2017 guest`**
- Dot animasi sonar (ping keluar) menggantikan pulse sederhana.
- Angka menghitung naik (processed), bukan mundur.
- Saat selesai: label berubah ke `(selesai)`, dot berhenti beranimasi, badge hilang otomatis.

### 🔗 Perbaikan Filter & Tamu di WA Blast
- Dropdown **Pilih Pihak Pengundang** di `wa_blast.html` sekarang diisi dari unique `pihak_pengundang` aktual di Supabase — bukan dari kategori GAS yang bisa tidak cocok.
- Tamu sekarang langsung terlihat saat halaman pertama dimuat (tidak tersaring habis karena mismatch nilai).
- Saat refresh, pilihan filter sebelumnya tetap dipertahankan.

### 📱 Normalisasi Nomor WhatsApp (Prefix 62)
- `wa_blast.html`: Fungsi `normalizeWaNumber()` baru — menangani semua format:
  - `08xxx` → `628xxx` ✅
  - `8xxx` → `628xxx` ✅  
  - `628xxx` → `628xxx` (tidak diubah) ✅
- Diterapkan di dua titik: cek duplikat nomor dan target blast.
- Sebelumnya hanya handle awalan `0`, nomor `8xxx` tidak terbaca oleh Fonnte.

### 🚀 Idle Timeout — Aware Background Process
- Idle timeout tidak terhitung selama ada proses aktif/background berjalan.
- Timer reset jika proses baru terdeteksi di tengah countdown.

---

## 📦 File Utama yang Diperbarui
| File | Perubahan |
|---|---|
| `formulir_tamu.html` | event_date, calendar picker, batch import, manual submit, sync counter |
| `wa_blast.html` | filter dropdown fix, phone normalization, tamu visibility fix |
| `angpao.html` | event_date di offline guest payload |
| `auth_guard.js` | idle timeout process-aware |

---

## 🔄 Cara Rollback ke v2.3
```
git checkout v2.3
```
atau copy file dari folder `releases/v2.3/` ke root project.

---

## 🚧 Rencana v2.4 (Upcoming)
- TBD — siap menerima permintaan fitur berikutnya.
