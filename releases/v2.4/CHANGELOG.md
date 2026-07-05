# SapaTamu v2.4 — Release Notes
**Tanggal Rilis:** 5 Juli 2026  
**Status:** Stable Release (Rollback Point)  
**Branch:** main

---

## ✅ Perbaikan & Fitur Baru di v2.4

### 🔑 Perbaikan Sinkronisasi RLS Metadata (GAS → Supabase)
- **Bypass RLS Menggunakan Service Role Key**: 
  - File `backend/CentralBackend.gs` pada fungsi `syncMetadataClientToSupabase` telah diperbarui untuk mengambil kunci akses rahasia (`SUPABASE_KEY` dari Script Properties) secara langsung.
  - Panggilan HTTP menggunakan kunci ini sebagai `apikey` dan `Authorization: Bearer` untuk mengidentifikasi request dari role `service_role` (admin), sehingga **kebijakan RLS (Row Level Security) otomatis dilewati/bypassed**.
  - Menyelesaikan kendala di mana pembaruan teks pesan custom (kolom C6) di spreadsheet gagal disinkronkan ke Supabase karena kebijakan keamanan database.
- **HTTP Response Logging**: Menambahkan logger detail respons status HTTP dari Supabase di sisi server Google Apps Script untuk debugging mandiri jika terjadi kesalahan di masa mendatang.

### 🔄 Alur Sinkronisasi Pasif (Passive Auto-Sync Fallback)
- **Background Fallback Sync**:
  - File `backend/Main.gs` pada fungsi `getSpreadsheetGuestCount` (fungsi yang selalu dipanggil secara asinkron saat halaman Formulir Tamu dimuat) kini dibekali pemanggil fungsi `syncMetadataClientToSupabase`.
  - Ini memastikan bahwa setiap kali halaman dibuka, data metadata di Google Sheets secara pasif dipaksa sinkron dengan database Supabase, bertindak sebagai pengaman utama jika pemicu edit instan (`onEdit`) terhenti.

### ⚡ Pembaruan Cepat UI Frontend (`formulir_tamu.html`)
- **Asynchronous Refetch**:
  - Halaman `formulir_tamu.html` tetap memuat data metadata dari database Supabase (cepat, hemat bandwidth, dan tanpa delay API Google).
  - Namun, segera setelah panggilan background `getSpreadsheetGuestCount` pada Google Apps Script menyelesaikan sinkronisasi datanya ke Supabase, frontend akan secara otomatis memicu refetch asinkron ke tabel `metadata_client` di Supabase untuk memperbarui variabel lokal `window.WA_TEMPLATE_CUSTOM` dan variabel terkait lainnya.
  - Menghasilkan pengalaman pengguna yang mulus: template terbaru dapat digunakan dalam waktu 1-2 detik setelah pemuatan halaman tanpa perlu klik tombol refresh.

### 📱 Penyelarasan Placeholder & Pesan Fallback
- **Mixed-case `{NAMA_TAMU}` Replacement**:
  - `formulir_tamu.html` kini mendukung penggantian placeholder `{NAMA_TAMU}` (mixed-case) pada blast manual agar memiliki keselarasan fungsionalitas dengan modul `wa_blast.html`.
- **Standarisasi Pesan Default Fallback**:
  - Pesan fallback lokal pada kedua halaman (`formulir_tamu.html` dan `wa_blast.html`) telah distandarisasi untuk menyertakan frasa `[Undangan ini bersifat personal & tidak untuk disebarluaskan]` di bawah link undangan.

---

## 📦 File Utama yang Diperbarui
| File | Perubahan |
|---|---|
| `backend/CentralBackend.gs` | RLS bypass di `syncMetadataClientToSupabase` menggunakan Service Role Key, logging error. |
| `backend/Main.gs` | Penambahan fallback trigger `syncMetadataClientToSupabase` di dalam `getSpreadsheetGuestCount`. |
| `formulir_tamu.html` | Alur asinkron refetch metadata pasca-GAS check, penanganan placeholder `{NAMA_TAMU}`. |

---

## 🔄 Cara Rollback ke v2.4
```
git checkout v2.4
```
atau copy seluruh file dari folder `releases/v2.4/` ke root project.

---

## 🚧 Rencana v2.5 (Upcoming Patch)
- Siap untuk pengembangan update fungsionalitas lanjutan berikutnya.
