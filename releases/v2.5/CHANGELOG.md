# CHANGELOG — SapaTamu v2.5 (Agentic AI Monitoring)
**Tanggal Rilis:** 7 Juli 2026
**Status:** Production-Ready Rollback Snapshot

---

## ✨ Fitur Baru

### 🤖 Agentic AI Monitoring System (Vercel + Gemini + Fonnte)
- **`api/monitor-alert.js`** — Vercel Serverless Function baru yang menerima webhook error dari Supabase, menganalisis penyebab error menggunakan **Gemini 1.5 Flash API**, lalu mengirimkan notifikasi alert ke **WhatsApp Admin via Fonnte** secara otomatis.
- Tabel database baru **`system_logs`** di Supabase sebagai pusat audit trail lintas layer (Frontend, GAS, Supabase).

### 🔌 GAS Monitoring Logger (`backend/MonitoringLogger.gs`)
- File Google Apps Script baru sebagai helper terpusat: fungsi `logToSupabase()`.
- Terintegrasi langsung ke fungsi-fungsi kritis berikut:

| File | Fungsi Dipantau | Tipe Log |
|---|---|---|
| `WhatsAppFormulir.gs` | `executeFonnteBlast` | FAILED/WARNING/SUCCESS per blast |
| `WhatsAppFormulir.gs` | `handleWAFormPost` | FAILED saat error fatal |
| `CentralBackend.gs` | `handleRegister` | FAILED saat pendaftaran klien gagal |
| `CentralBackend.gs` | `handleRegisterAndActivate` | FAILED saat aktivasi akun gagal |
| `CentralBackend.gs` | `sendWA` | FAILED saat Fonnte menolak kirim WA |

### 📊 Dashboard Monitor Realtime (`monitor.html`)
- Menambahkan pemuat riwayat log (`fetchSystemLogs`) — menampilkan 30 log terakhir dari `system_logs` saat halaman pertama kali dibuka.
- Menambahkan subscriber realtime (`subscribeToSystemLogs`) — entri log baru muncul secara instan di console log tanpa perlu refresh.
- Log berstatus `FAILED` otomatis memunculkan notifikasi pop-up merah di dasbor.

---

## 🔧 Perbaikan dari v2.4

### `formulir_tamu.html`
- Menambahkan fitur **Pengurutan Daftar Tamu** (Terbaru, Terlama, A-Z, Z-A) — user dapat memilih urutan sesuai kebutuhan.
- Menambahkan **debouncing pada input pencarian** (delay 350ms) untuk mengeliminasi lag saat mengetik di kotak pencarian data tamu.

---

## 📦 File Rilis Ini Mencakup

- **30 halaman HTML produksi** (semua halaman operasional)
- **Backend GAS** (12 file `.gs` termasuk `MonitoringLogger.gs` baru)
- **API Vercel** (`api/monitor-alert.js`, `api/og.jsx`, `api/undangan.js`)
- **Dokumentasi** (`PANDUAN_SETUP_MONITORING_v2.5.md`)
- **SQL Setup** (`setup_system_logs.sql`, `setup_presence_monitor.sql`, `supabase_rls.sql`)
- **PDF Referensi** (`blueprint_agentic_ai_monitoring.pdf`, `Patch_Pencegahan_Blokir_SapaTamu.pdf`)

---

## 🚀 Cara Rollback ke Versi Ini

Jika perlu rollback ke versi ini dari kondisi produksi yang rusak:

1. Salin semua file `.html` dari folder ini ke root direktori proyek.
2. Salin folder `backend/` ke root — lalu jalankan `clasp push --force` dari dalam folder `backend/`.
3. Salin folder `api/` ke root — lalu `git push` untuk trigger redeploy Vercel.
4. Pastikan tabel `system_logs` sudah ada di Supabase (jalankan `setup_system_logs.sql` jika belum).
5. Pastikan Environment Variables di Vercel sudah terkonfigurasi: `GEMINI_API_KEY`, `FONNTE_TOKEN`, `ADMIN_PHONE`, `MONITOR_SECRET`.
