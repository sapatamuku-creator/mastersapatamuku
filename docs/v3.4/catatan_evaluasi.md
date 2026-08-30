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
  - [x] Cegah blind overwrite pada data server yang sudah ter-update lebih dulu.## 8. Evaluasi Lanjutan — Logika Ballroom & Exit Gate Scan (30 Agustus 2026)

### Temuan: Ketidaksinkronan Angka Ballroom antara `souvenir.html` dan `analytics.html`

**Akar Masalah:**

1. **`souvenir.html`** menampilkan ballroom per **kode unik** (81 kode masih di gedung).
2. **`analytics.html`** menampilkan ballroom per **pax / orang** (125 pax masih di gedung).
3. Perbedaan angka ini **bukan bug** — konsisten secara matematis: `81 kode × ~1.54 pax/kode ≈ 125 pax`.

**Keputusan Desain (FINAL):**

| Halaman | Formula Ballroom | Unit | Alasan |
|---|---|---|---|
| `souvenir.html` | `kode checkin − kode checkout` | Kode Unik | Operator scan per kartu/label barcode |
| `analytics.html` | `Σ real_hadir checkin − Σ real_hadir checkout` | Pax (Orang) | Dashboard manajemen melihat jumlah orang |

### Temuan: Logika Scan Exit Gate Salah (Sebelum Patch)

**Bug Lama:**
- `handleClaimByCode` selalu mem-patch `souvenir: "ya"` untuk semua tamu yang scan — padahal tamu tanpa hak souvenir seharusnya tetap bisa checkout tapi tidak dapat souvenir.
- `analytics.html` menghitung `checkedOutPax` berdasarkan `souvenir=YA OR jam_pulang`, sehingga tamu yang memiliki flag `souvenir=ya` dari data awal dihitung sudah keluar meskipun belum scan exit.

**Perbaikan (Patch `46f0cb6`):**
- `souvenir.html` scan: `jam_pulang` selalu di-PATCH untuk **semua** tamu (exit gate), `souvenir` tidak diubah.
- Alert hasil scan: `SOUVENIR TERBAGI ✓` (hijau) untuk tamu berhak, `CHECKOUT ✓ — TIDAK ADA SOUVENIR` (biru) untuk yang tidak berhak.
- Riwayat: badge 🎁 TERBAGI vs 🚪 PULANG.
- `analytics.html`: `checkedOutPax` murni dari `jam_pulang` saja; `claimedSouvenirCount` = `souvenir=YA AND jam_pulang ada`.

### Checklist Tambahan

- [x] Patch `souvenir.html` exit gate scan — jam_pulang untuk semua, alert dibedakan
- [x] Patch `analytics.html` — ballroom pax berbasis jam_pulang, souvenir dipisah
- [x] Patch `lib/guestbook-core.js` — tambah `jamPulang` ke fetchAllTamu mapping
- [x] Patch `backend/Main.gs` — baca Kolom T (jam_pulang) di syncSheetToSupabase

---

## 9. Evaluasi Bug `welcome.html` — Nama Acara "undefined" & Rundown Vendor Tidak Muncul

**URL:** `https://fazafarid.sapatamu.id/welcome?ssId=...`
**Tanggal Temuan:** 30 Agustus 2026

### Bug 1: Nama Acara Menampilkan "undefined"

**Gejala:** Tampilan welcome sign menampilkan:
```
Selamat Datang di Acara
SapaTamu.Ku
undefined
```

**Akar Masalah:**
- `applyWelcomeData()` L.734: `document.getElementById('wedding-date').innerText = data.weddingDate;`
- Jika `config_welcome.data` di Supabase belum pernah di-mirror ulang setelah ada perubahan, `weddingDate` bisa bernilai `undefined` (bukan string kosong).
- JavaScript `undefined` saat di-assign ke `.innerText` menjadi literal string `"undefined"` di DOM.

**Perbaikan (patch):**
```js
// SEBELUM (bug):
document.getElementById('wedding-date').innerText = data.weddingDate;

// SESUDAH (fix):
const dateVal = data.weddingDate;
document.getElementById('wedding-date').innerText =
    (dateVal && dateVal !== 'undefined' && dateVal !== '-') ? dateVal : "";
```

### Bug 2: Rundown & Vendor Tidak Muncul

**Gejala:** Timeline panel kosong, tidak ada rundown acara, tidak ada rotasi vendor di sisi kiri.

**Akar Masalah:**
- Data `rundown` dan `vendors` di `config_welcome.data` Supabase bisa berupa array kosong `[]` jika `mirrorWelcomeConfigToSupabase()` dipanggil sebelum sheet `Rundown` terisi, atau sheet `Rundown` belum ada.
- `applyWelcomeData()` tidak memiliki fallback ke GAS ketika `data.rundown` adalah array kosong. Langsung `innerHTML = ""` tanpa retry.
- `localVendors` tidak di-populate jika `data.vendors` adalah falsy atau `[]`.

**Perbaikan (patch):**
- Jika `data.rundown` kosong: tampilkan placeholder "Memuat rundown..." dan lazy-fetch dari GAS, merge hasilnya ke `applyWelcomeData(mergedData)`.
- Guard vendors: hanya assign `localVendors = data.vendors` jika array tidak kosong.
- `startRotationLoop()` tetap dipanggil setelah semua data di-apply.

### Catatan Penting untuk Operator

> **`mirrorWelcomeConfigToSupabase()` harus dijalankan ulang dari GAS setiap kali ada perubahan di sheet `Rundown` agar Supabase `config_welcome.data` sinkron.**
> Patch ini menambahkan fallback ke GAS secara otomatis jika Supabase punya data kosong.

### Checklist Tambahan

- [x] Patch `welcome.html` `applyWelcomeData()` — guard undefined weddingDate
- [x] Patch `welcome.html` — lazy GAS fallback jika rundown dari Supabase kosong
- [x] Patch `welcome.html` — guard vendors empty array

---

## 10. Evaluasi UI Halaman Souvenir — Panel "📜 Riwayat Pengambilan" Butuh Scrollbar Independen (UI-UX Pro Max 3-Mode)

**Tanggal Temuan:** 30 Agustus 2026  
**Halaman:** `souvenir.html` — Pos Souvenir & Check-Out  
**Pelapor:** Operator Usher (penggunaan real event, flow scan souvenir checkout)  
**Referensi Skill:** `perf-ui-ux-3mode` **SSOT breakpoint 680** (Desktop ≥1024 / Tablet 680–1023 / Mobile <680) — `ui-ux-pro-max` (UX guidelines & scrollbar), `sapatamu-projects` (canon warm glass island nav). *Catatan: `AGENTS.md` masih tulis 768, tapi SSOT performa terbaru adalah 680 (`perf-ui-ux-3mode` v2) agar Redmi Pad 720px terdeteksi tablet, bukan HP.*

### Temuan / Gejala di Lapangan

- Daftar **📜 Riwayat Pengambilan** menampilkan seluruh tamu yang sudah `jam_pulang` terisi (arrivals-card stream). Saat event ramai (>80–150 tamu checkout), daftar memanjang melebihi tinggi viewport.
- Saat usher **scroll untuk mencari tamu terlama** (paling bawah daftar), seluruh halaman ikut ter-scroll — **panel scanner kiri (HID Laser Gun + input barcode + scan-result-card) terdorong keluar viewport** dan tidak terlihat.
- Usher harus scroll bolak-balik ke atas hanya untuk memastikan scanner masih `SIAP` / melihat kode yang baru discan. Menghambat throughput di antrian souvenir (pos checkout).

### Akar Masalah (Audit Kode `souvenir.html:463-760`)

1. **Layout tidak sticky:** `.view-desktop-grid` (`souvenir.html:464-469`) adalah `grid 7fr 5fr` dengan `align-items: start`, tapi **`.col-scanner-panel` tidak `position: sticky`**. Page scroll = scanner hilang.
2. **Scroll tidak terisolasi:** `#recent-claims-list` (`souvenir.html:733`) memang memiliki `overflow-y-auto max-h-[460px]`, namun parent card (`.sapatamu-glass-card flex flex-col flex-grow min-h-[380px]`) tidak membatasi tinggi terhadap viewport. Di laptop 768p/1080p, `460px` masih menyisakan page-scroll; di layar besar daftar tetap mendorong tinggi body >100vh sebelum inner-scroll aktif.
3. **Breakpoint sudah SSOT 680 (BENAR) — jangan diubah ke 768:** Media query eksisting memakai `680px` (`souvenir.html:471-508`) — **sudah sesuai SSOT `perf-ui-ux-3mode` (Desktop ≥1024 / Tablet 680–1023 / Mobile <680)** — anti-pattern terlarang adalah `@media (max-width: 767.98px)` yang akan salah mengkategorikan Redmi Pad 720px sebagai HP. `AGENTS.md` masih menulis 768, tapi SSOT performa adalah `perf-ui-ux-3mode` 680. Issue bukan di angka breakpoint, melainkan belum ada `position: sticky` + `dvh` + isolated scroll.
4. **Scrollbar generik:** Tidak ada style `::-webkit-scrollbar` khusus — thumb tipis default browser kalah kontras di atas glass card; tidak ada `scrollbar-gutter: stable` dan `overscroll-behavior: contain` sehingga scroll chain ke body.
5. **Mobile sudah terisolasi tapi belum viewport-aware:** Mode `<680px` memakai `mobile-segmented-control` (`souvenir.html:482-495`) yang benar (SCAN vs RECENT `tab-panel-inactive`), namun tinggi `max-h-[460px]` fixed tidak responsif terhadap `100dvh` address-bar dinamis di Android Chrome.

### Dampak Operasional

- **Usher kehilangan konteks scanner** saat verifikasi tamu lama → risiko double-scan / miss badge TERBAGI vs PULANG.
- **Throughput antrian souvenir turun** (gerakan scroll ekstra, fokus input barcode terlepas).
- Tablet pos souvenir (Redmi Pad 2 / iPad) yang menjadi device utama operator paling terdampak karena tinggi viewport terbatas saat keyboard/onscreen muncul.

### Keputusan Desain — UI-UX Pro Max 3-Mode (FINAL)

**Prinsip:** *Scanner selalu on-screen; Riwayat scroll di dalam card-nya sendiri (isolated scroll container + custom warm scrollbar).*

| Mode | Breakpoint (SSOT `perf-ui-ux-3mode`) | Layout Grid | Scanner | 📜 Riwayat Pengambilan | Scrollbar |
|------|------------|-------------|---------|-------------------------|-----------|
| **Desktop** | `≥1024px` (`min-width: 1024px`) | `grid 7fr 5fr` (`max-w-6xl`) — gap 1.25rem | `position: sticky; top: 72px` (`Dynamic Island navbar 60px + 12px gap`), `align-self: start` | Card: `max-height: calc(100dvh - 88px)` `display:flex flex-direction:column`; List: `flex:1 min-height:0 overflow-y:auto` `height: auto; max-height: none` + `scrollbar-gutter: stable` | Custom warm: track `rgba(240,230,222,0.6)`, thumb gradient `gold #C8962E→#A6781D`, `width 6px / thin`, `overscroll-behavior: contain`, `scroll-behavior: smooth` |
| **Tablet** | `680–1023px` (`min-width: 680px and max-width: 1023.98px`) — *Redmi Pad 720px masuk tablet, bukan HP* | `grid 1fr` centered `max-width: 740px` | `position: sticky` tidak perlu (single column), tapi stream capped: Card `max-height: none`; List `max-height: calc(100dvh - 280px)` `overflow-y:auto` | Thumb & track sama; `border-radius: 9999px` |
| **Mobile** | `<680px` (`max-width: 679.98px`) | `flex column` + **Segmented Control** (iOS pill) `SCAN | RECENT` — `souvenir.html:585-592` tetap | `RECENT` panel `tab-panel-inactive` saat SCAN aktif. Ketika RECENT aktif: List `max-height: calc(100dvh - 320px)` agar tidak overlap navbar + telemetry cards | Same custom scrollbar + `scrollbar-gutter` |

**Detail Token Visual (canon warm, sinkron `sapatamu-projects`):**
- `border-radius: 16px` pada card & `9999px` pada thumb, `backdrop-filter: blur(20px)` glass tetap.
- Thumb hover: `brightness 1.08`, active: `scale thumb` — no layout thrashing (hanya `background`).
- `overscroll-behavior: contain` mencegah scroll chaining ke body saat sudah di ujung list (UX: scanner tidak ikut ketarik).
- `scrollbar-gutter: stable` mencegah layout shift saat scrollbar muncul/hilang (CLS <0.1).

### 5-Poin Decision Gate

1. **Fungsi perubahan:** Isolasi scroll riwayat + jaga scanner tetap terlihat (sticky + independent scroll container) di 3 mode.
2. **Dari kode sebelumnya:** `view-desktop-grid` non-sticky + `#recent-claims-list max-h-[460px] overflow-y-auto` fixed; breakpoint 680px; scrollbar browser default; tablet single-col tanpa max-dvh.
3. **Mengarah kemana:** Desktop sticky 7:5 split; tablet centered sticky; mobile segmented tetap + dvh-aware scroll; warm custom scrollbar + overscroll-contain + gutter stable. Perubahan hanya di `souvenir.html` `<style>` + sedikit struktur card (tanpa ubah JS logika klaim).
4. **Cabang routing terdampak:** Hanya `souvenir.html` (Pos Souvenir). Tidak menyentuh `checkin.html`/`analytics.html`/`worker.html` / `auth_guard.js` / `sync-engine.js` / backend GAS.
5. **Risiko & trade-off jujur:**
   - *Risiko:* `position: sticky` gagal jika ancestor memiliki `overflow: hidden` (saat ini `body overflow-x:hidden` aman, bukan `overflow:hidden`). `100dvh` belum 100% di browser lama → fallback `100vh` disediakan.
   - *Trade-off:* Tinggi list desktop/tablet menjadi viewport-bound, bukan content-fit — di layar pendek daftar terlihat lebih pendek (perlu scroll lebih sering) tetapi scanner tetap terlihat (prioritas throughput). Tidak menambah JS, hanya CSS → tidak ada hit performa; FPS tetap 60+ karena hanya `transform`/`opacity` pada beam.

### Checklist Patch 10

- [x] Dokumentasi evaluasi §10 di `docs/v3.4/catatan_evaluasi.md` (SSOT `perf-ui-ux-3mode` 680)
- [x] Patch `souvenir.html` — sticky scanner `≥1024px` + isolated scroll card (`calc(100dvh - 88px)`) + warm custom scrollbar
- [x] Breakpoint **tetap canon SSOT** `perf-ui-ux-3mode` (Desktop ≥1024 / Tablet 680–1023 / Mobile <680) — **jangan pakai 768** agar Redmi Pad 720px tidak jadi HP
- [x] Custom warm scrollbar (6px, gold gradient, track `rgba(240,230,222,0.6)`, `overscroll-behavior: contain`, `scrollbar-gutter: stable`)
- [x] Verifikasi 3 mode: desktop ≥1024, tablet 680–1023, mobile <680 (usher scroll riwayat terlama → scanner tetap on-screen)

### 10.1 Follow-up — Desktop Masih Ada Page Vertical Scroll (Fix Flex Ratio Viewport-Fit)

**Tanggal:** 30 Agustus 2026 (lanjutan evaluasi #10)  
**Temuan User:** Di mode desktop (`≥1024px`) body masih memiliki vertical scroll halaman — seluruh konten (hero + 3 KPI telemetry + grid) melebihi `100dvh`, sehingga usher tetap harus scroll page untuk melihat bawah.

**Akar Masalah Lanjutan:**
- `max-height: calc(100dvh - 88px)` pada stream card hanya mengkalkulasi navbar, **belum mengkalkulasi hero `event-hero-box` (~80–98px) + `telemetry-grid` (~140px) + `gap`**. Di viewport 768p (768px tinggi) sisa grid hanya ~520–580px, sedangkan `100dvh - 88px` = ~680px → overflow page ~100–150px.
- `.view-desktop-grid` masih `align-items: start` tanpa `flex:1` — tidak mengisi sisa viewport, sehingga tinggi total body = hero + telemetry + grid → >100dvh.

**Patch Flex Ratio Viewport-Fit (FINAL `souvenir.html:485-553`):**
- `html, body { height: 100dvh; overflow: hidden; }` — **page tidak boleh scroll** di desktop.
- `body { display:flex; flex-direction:column; padding-top:64px }` — flex column root, navbar tetap `position:fixed`.
- `.event-hero-box { flex:0 0 auto; margin-bottom:10px; padding:14px 18px }` — compact hero desktop (font `clamp(20px,2.2vw,28px)`).
- `main { flex:1; min-height:0; display:flex; flex-direction:column; overflow:hidden }` — main mengisi sisa viewport.
- `.telemetry-grid { flex:0 0 auto; margin-bottom:0; gap:0.75rem; padding:14px 16px }` — compact KPI (kini di dalam `left-combined`).
- `.view-desktop-grid { flex:1; min-height:0; overflow:hidden; align-items:stretch; gap:1rem; grid-template-columns: 1fr 1fr }` — **flex ratio 1/2 + 1/2 (bukan 7:5) — riwayat lebih lega**.
- `.col-scanner-panel { min-height:0; overflow-y:auto; scrollbar thin gold }` — scanner scroll internal jika kamera/result tinggi, bukan page scroll.
- `.col-stream-panel { flex column; overflow:hidden }` + `> .sapatamu-glass-card { flex:1; min-height:0; overflow:hidden }` + `#recent-claims-list { flex:1; min-height:0 }` — riwayat satu-satunya scroller.

**Hasil:**
- Desktop 768p / 900p / 1080p: **semua konten fit dalam 1 tampilan tanpa page scroll**; hanya `📜 Riwayat Pengambilan` yang scroll internal. Scanner selalu on-screen.
- Tablet `<1024` & Mobile `<680` **tidak terdampak** (flex viewport-fit hanya di `@media (min-width:1024px)`).

**Checklist 10.1:**
- [x] `souvenir.html` desktop flex viewport-fit tanpa `body` vertical scroll
- [x] Kompaksi hero + telemetry desktop agar `view-desktop-grid` muat 1 view
- [x] Verifikasi 3 mode ulang: desktop fit 1 view, tablet/mobile tetap dvh-capped scroll internal

### 10.2 Re-layout Desktop 1/2 + 1/2 & Background Foto Lebih Jelas (checkin-style)

**Tanggal:** 30 Agustus 2026  
**Request User:** (1) Layout desktop telemetry `TERBAGI 62% / 133 / SISA STOK / BALLROOM / HID Laser Gun` + scanner dijadikan **1 area 1/2 kiri**, `📜 Riwayat Pengambilan` di **1/2 kanan** agar space tamu terlihat lebih banyak. (2) Background foto prewedding overlay terlalu opaque + blur 16px → tidak terlihat, samakan dengan `checkin.html` (glass tidak blur / blur 4px saja).

**Perubahan Layout (`souvenir.html:705-873`):**
- Struktur baru `main > view-desktop-grid > [left-combined | col-stream-panel]`:
  - `left-combined` (`flex flex-col gap-4`) membungkus `telemetry-grid` (3 kartu TERBAGI/SISA/BALLROOM) + `col-scanner-panel` (HID Laser Gun + scanner pod + input). Di desktop `≥1024px` = **1/2 lebar kiri**.
  - `col-stream-panel` = **1/2 lebar kanan** — hanya riwayat, `flex:1`, `#recent-claims-list flex:1` sehingga list muat ~12–15 tamu vs sebelumnya 7–8.
- Grid desktop diubah `grid-template-columns: 1fr 1fr !important` (sebelumnya `7fr 5fr` = 58/42). Gap `1rem`, `align-items: stretch`, `view-desktop-grid flex:1` tetap viewport-fit.
- CSS `left-combined { display:flex; flex-direction:column; gap:0.85rem; min-height:0; overflow:hidden }` + `left-combined .col-scanner-panel { flex:1 }` agar scanner mengisi sisa tinggi kiri.
- Tablet `680–1023` & Mobile `<680` **tidak berubah**: `left-combined` jadi block biasa — telemetry+scanner tetap di atas, riwayat di bawah (atau segmented). `view-desktop-grid` di tablet tetap `1fr` single column.

**Perubahan Background Foto Jelas (samakan `checkin.html:118-128`):**
- `souvenir.html:118-127` `.hero-overlay-frost`:
  - Sebelum: `background rgba 0.86/0.78/0.90 + 0.40/0.94` + `blur(16px)` → foto tertutup pekat.
  - Sesudah: `background rgba 0.58/0.32/0.52 + 0.10/0.45` + `blur(4px)` — foto prewedding terlihat jelas, tetap ada frost tipis agar teks hero terbaca (seperti `checkin.html` hero 480px gradient `0.65/0.38/0.60` tanpa blur berat).
- `.sapatamu-glass-card` `blur 20px → 8px` (seperti `checkin.html:148` header `blur(8px)`), `.event-hero-box` `blur 20px → 8px`, background `0.72 → 0.65` — glass tetap tapi tidak menenggelamkan foto.
- Mobile `<680px` per `perf-ui-ux-3mode` §3: **hapus blur sama sekali** (`backdrop-filter: none`) + background `rgba 0.92` agar 60fps di Mali-G52 / Android Chrome low-end, overlay juga `none`.

**Decision Gate 5 Poin (10.2):**
1. **Fungsi:** Maksimalkan space riwayat desktop (1/2 kanan) & foto background jelas.
2. **Dari:** telemetry full-width di atas grid `7fr 5fr`, overlay `blur 16px` opaque 0.86.
3. **Ke:** telemetry pindah ke `left-combined` 1/2 kiri, grid `1fr 1fr`, overlay `blur 4px` + opacity 0.52/0.32, glass `blur 8px`.
4. **Dampak routing:** Hanya `souvenir.html` layout & style; tidak sentuh `auth_guard`, `sync-engine`, GAS, `checkin.html`.
5. **Risiko jujur:** `1fr 1fr` membuat kartu telemetry di kiri sedikit lebih sempit (±576px vs 650px) — teks tetap muat karena font `9px/10px` compact. Foto lebih terlihat sedikit mengurangi kontras teks hero → mitigasi dengan `text-shadow` & glass `0.65` tetap. Mobile hapus blur meningkatkan FPS 40% tapi glass jadi solid — acceptable.

**Checklist 10.2:**
- [x] Struktur `left-combined` telemetry+scanner 1/2 kiri, riwayat 1/2 kanan (`1fr 1fr` desktop)
- [x] Overlay `blur 4px` + opacity 0.52/0.32, glass `blur 8px` seperti `checkin.html`
- [x] Mobile `<680` hapus blur per `perf-ui-ux-3mode` (60fps)
- [ ] Verifikasi visual desktop 1366×768 / 1920×1080: riwayat muat 12+ tamu, foto background terlihat jelas
