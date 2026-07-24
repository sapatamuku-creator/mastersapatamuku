# SapaTamu × KnowHere Gallery AI — Face Recognition Check-in Workflow

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DUAL SYSTEM ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────┐     ┌─────────────────────────────┐   │
│  │      SAPATAMU (Online)      │     │   KNOWHERE GALLERY AI       │   │
│  │                             │     │      (Offline/Local)        │   │
│  │  • Supabase REST API        │     │                             │   │
│  │  • Google Sheets via GAS    │     │  • InsightFace GPU          │   │
│  │  • Guest database           │◄───►│  • Face embedding DB        │   │
│  │  • Check-in status          │ API │  • Real-time detection      │   │
│  │  • RSVP confirmation        │     │  • Local REST API :5001     │   │
│  └──────────────┬──────────────┘     └──────────────┬──────────────┘   │
│                 │                                    │                  │
│                 │         ┌──────────────┐           │                  │
│                 │         │   KIOSK      │           │                  │
│                 └────────►│   SELFIE     │◄──────────┘                  │
│                           │   CHECK-IN   │                              │
│                           │              │                              │
│                           │  • Camera    │                              │
│                           │  • Face scan │                              │
│                           │  • Auto      │                              │
│                           │    check-in  │                              │
│                           └──────────────┘                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## WORKFLOW 1: Pre-Event RSVP + Selfie Registration

```
TAMU MENDAPAT UNDANGAN (WhatsApp)
─────────────────────────────────

1. Tamu klik link RSVP
   │
   └─► Buka rsvp.html?kode=STK-XXXXX&u=Budi+Santoso
       │
       ▼
2. Form RSVP
   ┌─────────────────────────────────────────────────────────┐
   │  ✅ Konfirmasi Kehadiran: [Hadir] [Tidak Hadir]        │
   │  💬 Wishes: [ucapan selamat...]                         │
   │  📸 Selfie: [Ambil Foto] ← FITUR BARU                  │
   │                                                         │
   │  ┌─────────────────────────────────┐                    │
   │  │      [Camera Preview]           │                    │
   │  │                                 │                    │
   │  │    ┌───────────────────┐        │                    │
   │  │    │   Face Overlay    │        │                    │
   │  │    │   (guide frame)   │        │                    │
   │  │    └───────────────────┘        │                    │
   │  │                                 │                    │
   │  │        [📸 Ambil Selfie]        │                    │
   │  └─────────────────────────────────┘                    │
   │                                                         │
   │  [KIRIM KONFIRMASI]                                     │
   └─────────────────────────────────────────────────────────┘

3. Sistem Proses Selfie
   │
   ├─► Validasi wajah terlihat jelas
   │   ┌─────────────────────────────────────────────────┐
   │   │ • Cek face detection via browser (face-api.js)  │
   │   │ • Pastikan 1 wajah terdeteksi                   │
   │   │ • Pastikan wajah dalam frame                   │
   │   └─────────────────────────────────────────────────┘
   │
   ├─► Upload foto ke server
   │   ┌─────────────────────────────────────────────────┐
   │   │ POST /api/rsvp-selfie                          │
   │   │ Body: {                                         │
   │   │   kode: "STK-XXXXX",                           │
   │   │   nama: "Budi Santoso",                        │
   │   │   image_data: "data:image/jpeg;base64,..."     │
   │   │ }                                               │
   │   └─────────────────────────────────────────────────┘
   │
   ├─► Simpan ke Google Drive (SapaTamu)
   │   ┌─────────────────────────────────────────────────┐
   │   │ Folder: /SapaTamu_Selfies/{ssId}/              │
   │   │ File: STK-XXXXX_Budi_Santoso.jpg               │
   │   └─────────────────────────────────────────────────┘
   │
   ├─► Kirim ke KnowHere Gallery AI (Local Network)
   │   ┌─────────────────────────────────────────────────┐
   │   │ POST http://localhost:5001/register_new_guest   │
   │   │ Body: {                                         │
   │   │   kode_unik: "STK-XXXXX",                      │
   │   │   image_data: "data:image/jpeg;base64,..."     │
   │   │ }                                               │
   │   │                                                 │
   │   │ KnowHere akan:                                  │
   │   │ 1. Decode image                                 │
   │   │ 2. Extract face embedding (InsightFace)         │
   │   │ 3. Simpan ke database_QR/QR_GUEST_STK-XXXXX.jpg│
   │   │ 4. Reload face database in-memory               │
   │   └─────────────────────────────────────────────────┘
   │
   └─► Update Supabase
       ┌─────────────────────────────────────────────────┐
       │ PATCH /rest/v1/tamu?kode=eq.STK-XXXXX          │
       │ Body: { selfie_registered: true }               │
       └─────────────────────────────────────────────────┘

4. Konfirmasi ke Tamu
   ┌─────────────────────────────────────────────────────────┐
   │  ✅ Konfirmasi RSVP Berhasil!                           │
   │                                                         │
   │  Yth. Budi Santoso,                                     │
   │  Kehadiran Anda telah terkonfirmasi.                    │
   │  Selfie Anda telah tersimpan untuk check-in facial.     │
   │                                                         │
   │  Pada hari H, cukup hadir di depan kamera KIOSK         │
   │  dan wajah Anda akan otomatis terdeteksi.               │
   └─────────────────────────────────────────────────────────┘
```

---

## WORKFLOW 2: Kiosk Selfie Check-in (Hari H)

```
TAMU TIBA DI ACARA
──────────────────

1. Tamu berdiri di depan KIOSK
   │
   └─► Layar menampilkan:
       ┌─────────────────────────────────────────────────────────┐
       │                                                         │
       │              🎯 SELFIE CHECK-IN                         │
       │                                                         │
       │  ┌─────────────────────────────────────────────────┐   │
       │  │                                                 │   │
       │  │              [Camera Preview]                    │   │
       │  │              Real-time face detection            │   │
       │  │                                                 │   │
       │  │         ┌───────────────────────┐               │   │
       │  │         │                       │               │   │
       │  │         │     Face Frame        │               │   │
       │  │         │     Guide Overlay     │               │   │
       │  │         │                       │               │   │
       │  │         └───────────────────────┘               │   │
       │  │                                                 │   │
       │  │  Status: Menunggu wajah terdeteksi...           │   │
       │  │                                                 │   │
       │  └─────────────────────────────────────────────────┘   │
       │                                                         │
       │  💡 Tips: Hadapkan wajah ke kamera dengan pencahayaan  │
       │     yang cukup. Lepas masker jika memungkinkan.        │
       │                                                         │
       └─────────────────────────────────────────────────────────┘

2. Real-time Face Detection Loop
   │
   └─► Setiap 500ms:
       ┌─────────────────────────────────────────────────────────┐
       │  1. Capture frame dari camera                          │
       │  2. Kirim ke KnowHere Gallery AI:                      │
       │     POST http://localhost:5001/verify_face              │
       │     Body: { image_data: "data:image/jpeg;base64,..." } │
       │                                                         │
       │  3. Response:                                           │
       │     {                                                   │
       │       "status": "found",                                │
       │       "name": "Budi Santoso",                           │
       │       "results": [{                                     │
       │         "name": "Budi Santoso",                         │
       │         "status": "match",                              │
       │         "accuracy": 78.5                                │
       │       }]                                                │
       │     }                                                   │
       └─────────────────────────────────────────────────────────┘

3. Wajah Terdeteksi (First Time)
   │
   ├─► KnowHere mengembalikan status: "match" atau "locked"
   │
   ├─► Cek apakah sudah check-in sebelumnya
   │   ┌─────────────────────────────────────────────────┐
       │   │ GET /api/check-checkin?kode=STK-XXXXX      │
       │   │                                             │
       │   │ Response:                                   │
       │   │ { "already_checked_in": false }             │
       │   └─────────────────────────────────────────────┘
   │
   ├─► Jika BELUM check-in:
   │   ┌─────────────────────────────────────────────────┐
   │   │                                                 │
   │   │  🎉 Selamat Datang!                             │
   │   │                                                 │
   │   │  Yth. Budi Santoso,                             │
   │   │  Anda telah berhasil check-in!                  │
   │   │                                                 │
   │   │  ┌─────────────────────────────────┐            │
   │   │  │      [Foto Selfie Tamu]         │            │
   │   │  └─────────────────────────────────┘            │
   │   │                                                 │
   │   │  Status: ✅ HADIR                               │
   │   │  Waktu: 09:32 WIB                              │
   │   │  Sesi: Sesi 1 (09:00 - 11:00)                 │
   │   │                                                 │
   │   │  Silahkan masuk dan nikmati acara! 🎊          │
   │   │                                                 │
   │   └─────────────────────────────────────────────────┘
   │
   │   ├─► Update Supabase
   │   │   ┌─────────────────────────────────────────┐
   │   │   │ PATCH /rest/v1/tamu?kode=eq.STK-XXXXX  │
   │   │   │ Body: {                                 │
   │   │   │   status_hadir: "1",                    │
   │   │   │   jam_datang: "2026-07-24T09:32:00Z",   │
   │   │   │   real_hadir: "1"                       │
   │   │   │ }                                       │
   │   │   └─────────────────────────────────────────┘
   │   │
   │   ├─► Background: Sync ke Google Sheets
   │   │   ┌─────────────────────────────────────────┐
   │   │   │ action: "markCheckin"                   │
   │   │   │ ssId: CURRENT_SS_ID                     │
   │   │   │ kode: "STK-XXXXX"                       │
   │   │   │ jamDatang: "09:32"                      │
   │   │   └─────────────────────────────────────────┘
   │   │
   │   └─► Tampilkan selama 5 detik, lalu reset kamera
   │
   └─► Jika SUDAH check-in:
       ┌─────────────────────────────────────────────────┐
       │                                                 │
       │  ℹ️ Informasi                                   │
       │                                                 │
       │  Yth. Budi Santoso,                             │
       │  Anda sudah berhasil check-in.                  │
       │  Silahkan masuk.                                │
       │                                                 │
       │  Status: ✅ HADIR                               │
       │  Waktu: 08:45 WIB (sudah check-in)             │
       │                                                 │
       └─────────────────────────────────────────────────┘
       │
       └─► Tampilkan selama 3 detik, lalu reset kamera

4. Wajah Tidak Dikenal
   │
   └─► KnowHere mengembalikan status: "unknown"
       ┌─────────────────────────────────────────────────┐
       │                                                 │
       │  ❓ Wajah Tidak Dikenali                        │
       │                                                 │
       │  Maaf, wajah Anda tidak terdaftar dalam         │
       │  sistem. Silahkan hubungi petugas di meja       │
       │  registrasi untuk melakukan check-in manual.    │
       │                                                 │
       └─────────────────────────────────────────────────┘
       │
       └─► Tampilkan selama 4 detik, lalu reset kamera
```

---

## WORKFLOW 3: Dual Mode (Online + Offline)

```
MODE OPERASI KIOSK
──────────────────

┌─────────────────────────────────────────────────────────────────────────┐
│                          MODE: ONLINE                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Kamera → KnowHere API (localhost:5001) → Face Match                    │
│       │                                                                 │
│       ▼                                                                 │
│  Update Supabase (online) → Sync ke Google Sheets (background)         │
│                                                                         │
│  Fitur:                                                                 │
│  ✅ Real-time face recognition                                          │
│  ✅ Auto check-in ke Supabase                                           │
│  ✅ Sync ke Google Sheets                                               │
│  ✅ Update status tamu realtime                                          │
│  ✅ WhatsApp notification (optional)                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                          MODE: OFFLINE                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Kamera → KnowHere API (localhost:5001) → Face Match                    │
│       │                                                                 │
│       ▼                                                                 │
│  Simpan ke IndexedDB (lokal) + sync_queue                               │
│       │                                                                 │
│       ▼                                                                 │
│  Ketika kembali ONLINE:                                                 │
│  → SyncEngine.triggerSync()                                             │
│  → Process sync_queue                                                   │
│  → Update Supabase                                                      │
│  → Sync ke Google Sheets                                                │
│                                                                         │
│  Fitur:                                                                 │
│  ✅ Real-time face recognition (tetap jalan)                            │
│  ✅ Auto check-in ke IndexedDB (lokal)                                  │
│  ⏳ Sync ke Supabase (menunggu online)                                  │
│  ⏳ Sync ke Google Sheets (menunggu online)                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    INTELLIGENT FALLBACK                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Jika KnowHere Gallery AI TIDAK berjalan:                               │
│                                                                         │
│  1. Cek koneksi ke localhost:5001                                       │
│     ┌─────────────────────────────────────────────────┐                 │
│     │ fetch('http://localhost:5001/update_database')  │                 │
│     │   .then(...)                                    │                 │
│     │   .catch(() => {                                │                 │
│     │     // KnowHere offline                        │                 │
│     │     enableManualCheckinMode();                  │                 │
│     │   });                                           │                 │
│     └─────────────────────────────────────────────────┘                 │
│                                                                         │
│  2. Fallback ke mode manual:                                            │
│     ┌─────────────────────────────────────────────────┐                 │
│     │ • QR Code scan                                  │                 │
│     │ • Manual search by name                         │                 │
│     │ • Manual check-in button                        │                 │
│     └─────────────────────────────────────────────────┘                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## API ENDPOINTS

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SAPATAMU API (Online)                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  POST /api/rsvp-selfie                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Body: { kode, nama, image_data, wishes }                        │   │
│  │ Action:                                                         │   │
│  │ 1. Simpan foto ke Google Drive                                  │   │
│  │ 2. Kirim ke KnowHere API (localhost:5001)                       │   │
│  │ 3. Update Supabase: selfie_registered = true                    │   │
│  │ Response: { status: "success", face_registered: true }          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  GET /api/check-checkin?kode=STK-XXXXX                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Response: { already_checked_in: true/false, jam_datang: ... }   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  POST /api/kiosk-checkin                                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Body: { kode, nama, face_accuracy, image_data }                 │   │
│  │ Action:                                                         │   │
│  │ 1. Update Supabase: status_hadir = "1"                          │   │
│  │ 2. Simpan foto check-in ke Google Drive                         │   │
│  │ 3. Background: Sync ke Google Sheets                             │   │
│  │ Response: { status: "success", jam_datang: "09:32" }           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                KNOWHERE GALLERY AI API (Local :5001)                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  POST /verify_face                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Body: { image_data: "data:image/jpeg;base64,..." }             │   │
│  │ Response: {                                                    │   │
│  │   status: "found" | "no_face" | "unknown",                     │   │
│  │   name: "Budi Santoso",                                        │   │
│  │   results: [{ name, status, accuracy, box }]                   │   │
│  │ }                                                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  POST /register_new_guest                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Body: { kode_unik: "STK-XXXXX", image_data: "base64..." }      │   │
│  │ Action: Simpan ke database_QR/QR_GUEST_STK-XXXXX.jpg           │   │
│  │ Response: { status: "registered" | "already_registered" }      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  POST /api/register_selfie                                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Body: { name: "STK-XXXXX", image_data: "base64..." }          │   │
│  │ Action: Simpan + reload face database                           │   │
│  │ Response: { status: "success", name: "STK-XXXXX" }            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  POST /update_database                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Action: Reload face database in-memory                          │   │
│  │ Response: { status: "success", total_faces: 150 }              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## FILE STRUCTURE

```
SapaTamu (Online)
─────────────────
D:\Google Antigrafity\mastersapatamuku\
├── rsvp.html                    ← TAMBAH: Selfie capture section
├── checkin.html                 ← EXISTING: Manual check-in
├── kiosk_selfie_checkin.html    ← BARU: Kiosk face check-in
├── formulir_tamu.html           ← EXISTING: Guest registration
├── onsite.html                  ← EXISTING: Walk-in registration
│
├── temp_dev/                    ← Development versions
│   ├── rsvp.html
│   ├── kiosk_selfie_checkin.html
│   └── ...
│
└── api/
    └── rsvp-selfie.php          ← BARU: Handle selfie upload

KnowHere Gallery AI (Offline)
─────────────────────────────
C:\SapaTamu_AI\
├── kiosk_gallerystation.py      ← EXISTING: Face recognition API
│   ├── /verify_face             ← EXISTING: Face matching
│   ├── /register_new_guest      ← EXISTING: Register new face
│   └── /api/register_selfie     ← EXISTING: Selfie registration
│
├── database_QR/                 ← Face database (auto-created)
│   └── QR_GUEST_STK-XXXXX.jpg
│
├── database_vip/                ← VIP face database
│
└── input_foto/                  ← Temporary face input
```

---

## DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PRE-EVENT (RSVP)                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  RSVP.html                                                              │
│       │                                                                 │
│       ▼                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                 │
│  │  Camera     │───►│  Face API   │───►│  Validation │                 │
│  │  Capture    │    │  (browser)  │    │  (1 face)   │                 │
│  └─────────────┘    └─────────────┘    └──────┬──────┘                 │
│                                                │                        │
│                                                ▼                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    PARALLEL UPLOAD                               │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                                                                 │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │   │
│  │  │  Google     │    │  KnowHere   │    │  Supabase   │         │   │
│  │  │  Drive      │    │  Gallery AI │    │  (update)   │         │   │
│  │  │  (backup)   │    │  (face DB)  │    │  (status)   │         │   │
│  │  └─────────────┘    └─────────────┘    └─────────────┘         │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                       EVENT DAY (KIOSK CHECK-IN)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  KIOSK SELFIE CHECK-IN                                                  │
│       │                                                                 │
│       ▼                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                 │
│  │  Camera     │───►│  KnowHere   │───►│  Face       │                 │
│  │  (realtime) │    │  /verify    │    │  Match?     │                 │
│  └─────────────┘    └─────────────┘    └──────┬──────┘                 │
│                                                │                        │
│                              ┌─────────────────┼─────────────────┐      │
│                              │                 │                 │      │
│                              ▼                 ▼                 ▼      │
│                         ┌────────┐        ┌────────┐        ┌────────┐ │
│                         │ MATCH  │        │UNKNOWN │        │ALREADY │ │
│                         │ (new)  │        │        │        │ CHECKED│ │
│                         └───┬────┘        └───┬────┘        └───┬────┘ │
│                             │                 │                 │      │
│                             ▼                 │                 ▼      │
│                      ┌─────────────┐          │          ┌─────────────┐│
│                      │ AUTO        │          │          │ SHOW        ││
│                      │ CHECK-IN    │          │          │ "ALREADY    ││
│                      │             │          │          │  CHECKED"   ││
│                      └──────┬──────┘          │          └─────────────┘│
│                             │                 │                         │
│               ┌─────────────┼─────────────┐   │                         │
│               │             │             │   │                         │
│               ▼             ▼             ▼   ▼                         │
│          ┌────────┐   ┌────────┐   ┌────────┐                          │
│          │Supabase│   │ Google │   │ IndexedDB                        │
│          │ PATCH  │   │ Sheets │   │ (offline)                        │
│          └────────┘   └────────┘   └────────┘                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## CHALLENGE: Online + Offline Hybrid

```
CHALLENGE: Bagaimana kiosk bisa bekerja dalam 2 mode?
──────────────────────────────────────────────────────

SOLUSI: Dual-Layer Architecture

┌─────────────────────────────────────────────────────────────────────────┐
│                        LAYER 1: FACE RECOGNITION                        │
│                        (Always Local/Offline)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  • KnowHere Gallery AI berjalan di localhost:5001                       │
│  • Face recognition TIDAK memerlukan internet                           │
│  • Database wajah tersimpan lokal di C:\SapaTamu_AI\database_QR\       │
│  • Real-time detection tanpa koneksi                                    │
│                                                                         │
│  → SELALU BERJALAN, ONLINE ATAU OFFLINE                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        LAYER 2: DATA SYNC                               │
│                        (Online/Offline Hybrid)                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ONLINE:                                                                │
│  • Langsung update Supabase                                             │
│  • Langsung sync ke Google Sheets                                       │
│  • Real-time status update                                              │
│                                                                         │
│  OFFLINE:                                                               │
│  • Simpan ke IndexedDB                                                  │
│  • Tambah ke sync_queue                                                 │
│  • Ketika kembali online → SyncEngine.processQueue()                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

IMPLEMENTASI:
─────────────

// Kiosk Selfie Check-in JavaScript

const KNOWHERE_API = 'http://localhost:5001';
const SAPATAMU_API = 'https://script.google.com/macros/s/AKfycbz.../exec';
const SB_URL = 'https://llrapesaaoliyjrrrsjh.supabase.co';

let isKnowHereOnline = false;
let isSapaTamuOnline = navigator.onLine;

// Cek koneksi ke KnowHere
async function checkKnowHereConnection() {
    try {
        const res = await fetch(`${KNOWHERE_API}/update_database`, {
            method: 'POST',
            timeout: 2000
        });
        isKnowHereOnline = res.ok;
    } catch (e) {
        isKnowHereOnline = false;
    }
}

// Face detection loop
async function detectFace() {
    const video = document.getElementById('camera');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    try {
        const res = await fetch(`${KNOWHERE_API}/verify_face`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_data: imageData })
        });
        const data = await res.json();
        
        if (data.status === 'found' && data.results[0].status === 'match') {
            await handleFaceMatch(data.name, imageData, data.results[0].accuracy);
        } else if (data.status === 'no_face') {
            updateStatus('Hadapkan wajah ke kamera...');
        } else {
            updateStatus('Wajah tidak dikenali');
        }
    } catch (e) {
        console.error('KnowHere API error:', e);
    }
}

// Handle face match
async function handleFaceMatch(name, imageData, accuracy) {
    // 1. Cek apakah sudah check-in
    const checkinStatus = await checkIfAlreadyCheckedIn(name);
    
    if (checkinStatus.already_checked_in) {
        showAlreadyCheckedIn(name, checkinStatus.jam_datang);
        return;
    }
    
    // 2. Auto check-in
    if (isSapaTamuOnline) {
        // Online: langsung update Supabase
        await updateSupabase(name, imageData);
        await syncToGoogleSheets(name);
    } else {
        // Offline: simpan ke IndexedDB + sync_queue
        await saveToIndexedDB(name, imageData);
        await addToSyncQueue(name, imageData);
    }
    
    showSuccess(name);
}
```

---

## IMPLEMENTATION PLAN

```
PHASE 1: RSVP Selfie Registration
──────────────────────────────────
[ ] Modifikasi rsvp.html
    - Tambah section selfie capture
    - Integrasikan face-api.js untuk validasi
    - Tambah tombol "Ambil Selfie"

[ ] Buat API endpoint /api/rsvp-selfie
    - Simpan foto ke Google Drive
    - Kirim ke KnowHere API
    - Update Supabase

[ ] Testing flow RSVP + Selfie

PHASE 2: Kiosk Selfie Check-in
──────────────────────────────
[ ] Buat kiosk_selfie_checkin.html
    - Full-screen camera preview
    - Real-time face detection loop
    - Auto check-in logic
    - Success/error display

[ ] Integrasikan dengan KnowHere API
    - /verify_face endpoint
    - /register_new_guest endpoint

[ ] Implementasi dual mode (online/offline)
    - Online: langsung update Supabase
    - Offline: simpan ke IndexedDB + sync_queue

[ ] Testing kiosk mode

PHASE 3: Integration & Polish
─────────────────────────────
[ ] Testing end-to-end flow
[ ] Error handling & edge cases
[ ] Performance optimization
[ ] Documentation
```
