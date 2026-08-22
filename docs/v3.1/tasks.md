# Tasks Breakdown — SapaTamu v3.1 (Live Progress UX & Telemetry)
> Fokus: Penerapan standar UI/UX live progress deterministik, visual counter telemetry (X dari Y data / %), micro-yielding, dan tema SapaTamu (Warm Sand, Rose, Gold) pada seluruh proses loading/batch/sinkronisasi/copy di sistem SapaTamu.
> **Gate wajib:** Sebelum kerjakan task apapun, jalankan `skill-decision-gate` (`docs/v3.0/skill-decision-gate/SKILL.md` / `.agents/skills/skill-decision-gate/SKILL.md`) — jelaskan 5 poin gamblang & jujur, tunggu LANJUT user. Catat di `docs/v3.1/DECISION_LOG.md`.

---

## 📑 Status & Peta Halaman

| ID Task | Halaman | Fitur & Jenis Proses | Status |
| :--- | :--- | :--- | :--- |
| **T1.1** | `formulir_tamu.html` | Import Excel, Sinkronisasi DB ⇄ Sheet, Bulk Delete Duplikat | ✅ **Done** |
| **T1.2** | `wa_blast.html` | Pengiriman Massal WA Blast (`executeMassBlast`) & Cooldown Delay | ✅ **Done** |
| **T1.3** | `sortir.html` | Ekspor Instan Foto (`directBrowserExport`) & Penyalinan RAW/JPG Lokal | ✅ **Done** |
| **T1.4** | `checkin.html` & `onsite.html` | Sinkronisasi Antrean Offline (`sync_queue.js`) & Pendaftaran Instan | ✅ **Done** |
| **T1.5** | `analytics.html` & `dashboard.html` | Master Data Initial Load & Skeleton Feedback | ✅ **Done** |
| **T1.6** | `formulir_tamu.html` | Dynamic Hero Ambient Photo Slideshow & Glass Info Cards | ✅ **Done** |
| **T1.7** | `checkin.html` & `onsite.html` | Dynamic Ambient Photo Slideshow di Background Section Scanner | ✅ **Done** |
| **T1.8** | `checkin.html` & `onsite.html` | Tablet Mode Dynamic Island Station Controls Capsule | ✅ **Done** |
| **T1.9** | `checkin.html` & `onsite.html` | Comprehensive Metadata di Details Mode (Desktop, Tablet, Mobile) | ✅ **Done** |
| **T1.10** | `checkin.html` & `onsite.html` | Dynamic Sort & Multi-Filter Dropdown Menu (Status Hadir, Kategori, Pihak, Sesi) | ✅ **Done** |

---

## Phase 1 — Core Batch & Sync Engines (P0)

- [x] **T1.1 M — `formulir_tamu.html` Live Progress Rollout**
  - Implementasi modal `#liveProgressOverlay` dengan styling SapaTamu (Warm Sand, Gold, Rose).
  - Helper runner `runWithLiveProgress()`, `showLiveProgress()`, `updateLiveProgress()`, `closeLiveProgress()`.
  - Integrasi pada `commitExcelGuests()`, `processSyncAction()`, dan `executeBulkDelete()`.
  - Dukungan responsif: Desktop (≥1024px), Tablet (768–1023px), Mobile (<768px).

- [x] **T1.2 M — `wa_blast.html` WA Blast Live Telemetry & Cooldown Progress**
  - Pasang komponen `#liveProgressOverlay` bertema SapaTamu di `wa_blast.html`.
  - Ganti spinner statis `toggleProcessing()` pada `executeMassBlast()` dengan live telemetry counter `X / Y Pesan Terkirim` dan progress bar dinamis per batch kirim.
  - Tampilkan target penerima pesan aktif secara realtime.
  - Visual cooldown countdown bar dengan indikator waktu sisa saat jeda antar batch (60 detik).
  - Uji responsif di desktop, tablet, dan mobile.

- [x] **T1.3 S — `sortir.html` Standardisasi Progress Modal Tema SapaTamu**
  - Standarisasi visual `#progress-modal` pada `directBrowserExport()` dan `localExportFiles()` agar seragam dengan tema SapaTamu (Warm Sand `#FFF9F5`, Gold `#C8962E`, Rose `#E07B7B`).
  - Pertahankan integrasi File System Access API dan file pair matching RAW/JPG.

---

## Phase 2 — Reception & Offline Resilience (P1)

- [x] **T1.4 S — `checkin.html` & `onsite.html` Offline Queue Telemetry Sync**
  - Tingkatkan transparansi status sinkronisasi background saat koneksi kembali online (`sync_queue.js`).
  - Menampilkan live telemetry counter `Sync: X/Y (Z%)`, sisa antrean, dan popup sukses transien saat semua data tersinkronisasi.

- [x] **T1.7 S — `checkin.html` & `onsite.html` Dynamic Ambient Photo Slideshow Background**
  - Layer ambient background dinamis di area section scanner dan header menggunakan foto dari `config_welcome`.
  - Random starting photo saat load/refresh halaman dan transisi crossfade halus (8.5s).
  - Translucent crystal overlay dengan header semi-transparan ber-blur halus (`backdrop-filter: blur(8px)`).
  - Uji responsif di desktop, tablet, dan mobile.

- [x] **T1.8 S — `checkin.html` & `onsite.html` Tablet Dynamic Island Station Controls**
  - Mengubah baris kontrol stasiun (Jalur, RT, CAM, FC, CD, QUICK) pada **Tablet Mode (768–1023px)** menjadi Dynamic Island Floating Capsule (`.station-di-trigger` & `.station-di-content`).
  - Efek glassmorphism pill collapsed default (`🟢 JALUR: ALL • RT OFF ▾`), tap/touch untuk expand popover card dengan smooth drop animation.
  - Mobile mode (<768px) dan Desktop mode (≥1024px) tetap utuh dan stabil.

- [x] **T1.9 S — `checkin.html` & `onsite.html` Comprehensive Details Mode Metadata**
  - Sinkronisasi kelengkapan metadata mode *Details* agar selengkap mode *Kartu* (Nama, WA, Gift Icon 🧧/🎁, Kategori, Pihak, Alamat, Sesi, Pax Plan, Status Hadir).
  - Dukungan 3 responsif: Desktop lega penuh, Tablet seimbang (Alamat + Sesi + Pax aktif), Mobile kompak ringkas (kolom sekunder tersembunyi).

- [x] **T1.10 S — `checkin.html` & `onsite.html` Sort & Multi-Filter Dropdown**
  - Pasang tombol dropdown Sortir (`URUTKAN: TERBARU/TERLAMA/A-Z/Z-A/KATEGORI/PIHAK`) dan Multi-Filter (`FILTER TAMU`) di samping label Status Kehadiran.
  - Dukungan filter Status Hadir (Sudah/Belum), Kategori, Pihak Pengundang, dan Sesi Undangan dengan badge counter aktif dan tombol reset.
  - Berlaku sinkron di Card Mode & Details Mode pada 3 breakpoint (Desktop, Tablet, Mobile).

---

## Phase 3 — Executive Dashboards & Analytics (P2)

- [x] **T1.5 S — `analytics.html` & `dashboard.html` Loader Optimization**
  - Standardisasi feedback visual saat load data master event pertama kali agar konsisten dengan `live-progress-ux`.
  - Tambahkan skeleton placeholder shimmer pada distribusi kategori, host, wilayah, dan flow monitoring sebelum agregasi query selesai.
  - Transisi fade-in lembut pada nama pengantin & paket di `dashboard.html`.

- [x] **T1.6 S — `formulir_tamu.html` Dynamic Hero Ambient Photo Slideshow**
  - Random starting photo on refresh, smooth crossfade looping (8.5s), translucent crystal overlay, `.hero-info-card` semi-transparan, dan 3 responsive breakpoints.
