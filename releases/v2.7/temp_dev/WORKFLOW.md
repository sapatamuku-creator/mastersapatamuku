# SapaTamu Offline-First PWA — Workflow Diagram

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ IndexedDB│  │ sync_queue│  │ sync_log │  │ Service Worker│  │
│  │ (guests, │  │ (pending  │  │ (op_id   │  │ (cache-first │  │
│  │  auth,   │  │  ops)     │  │  dedup)  │  │  strategy)   │  │
│  │  meta)   │  │           │  │          │  │              │  │
│  └────┬─────┘  └─────┬─────┘  └──────────┘  └──────────────┘  │
│       │              │                                          │
│  ┌────▼──────────────▼──────────────────────────────────────┐  │
│  │              SyncEngine (auto-sync every 30s)             │  │
│  └────────────────────────┬─────────────────────────────────┘  │
└───────────────────────────┼─────────────────────────────────────┘
                            │
              ┌─────────────▼─────────────┐
              │       NETWORK STATUS       │
              └─────┬───────────────┬──────┘
                    │               │
            ┌───────▼───────┐ ┌────▼────────┐
            │    ONLINE     │ │   OFFLINE    │
            └───────┬───────┘ └────┬────────┘
                    │              │
        ┌───────────▼──┐    ┌─────▼──────────┐
        │  Supabase    │    │  Queue Wait    │
        │  REST API    │    │  (retry when   │
        │  + Realtime  │    │   back online) │
        └──────┬───────┘    └────────────────┘
               │
    ┌──────────▼──────────┐
    │   Google Sheets     │
    │   via GAS Webhook   │
    └─────────────────────┘
```

---

## WORKFLOW: ONLINE MODE

```
USER ACTION                    SYSTEM RESPONSE
─────────────                  ───────────────

1. Buka App
   │
   ├─► Service Worker
   │   ┌─────────────────────────────────────┐
   │   │ Cache-first: serve dari cache        │
   │   │ Lalu fetch update di background      │
   │   └─────────────────────────────────────┘
   │
   ├─► Auth Check
   │   ┌─────────────────────────────────────┐
   │   │ Cek ssId di IndexedDB                │
   │   │ Ada? → Langsung load data            │
   │   │ Tidak? → Redirect ke login           │
   │   └─────────────────────────────────────┘
   │
   └─► Load Data (Parallel)
       ┌─────────────────────────────────────┐
       │ 1. Supabase: GET /rest/v1/tamu      │ ◄── Primary source
       │ 2. Supabase: GET /rest/v1/metadata  │
       │ 3. GAS: getSpreadsheetGuestCount    │ ◄── Background check
       └─────────────────────────────────────┘

2. Tambah Tamu (Form Submit)
   │
   ├─► Generate kode unik (client-side)
   │   ┌─────────────────────────────────────┐
   │   │ Kode = STK-XXXXX (random 5 char)    │
   │   └─────────────────────────────────────┘
   │
   ├─► Supabase INSERT (langsung)
   │   ┌─────────────────────────────────────┐
   │   │ POST /rest/v1/tamu                  │
   │   │ Body: {ssid, kode, nama, wa, ...}   │
   │   │ Return: 201 Created                 │
   │   └─────────────────────────────────────┘
   │
   ├─► Render UI (optimistic)
   │   ┌─────────────────────────────────────┐
   │   │ Tambah ke MASTER_LIST               │
   │   │ Tampilkan card dengan status sync   │
   │   └─────────────────────────────────────┘
   │
   └─► Background: Sync ke Google Sheets
       ┌─────────────────────────────────────┐
       │ POST to GAS endpoint                │
       │ action: "saveGuestsToSheet"          │
       │ guests: [{kode, nama, wa, ...}]     │
       │ (fire-and-forget, tidak block UI)   │
       └─────────────────────────────────────┘

3. Edit Tamu
   │
   ├─► Supabase PATCH (langsung)
   │   ┌─────────────────────────────────────┐
   │   │ PATCH /rest/v1/tamu?kode=eq.XXX     │
   │   └─────────────────────────────────────┘
   │
   ├─► Update MASTER_LIST (optimistic)
   │
   └─► Background: Sync ke GAS
       ┌─────────────────────────────────────┐
       │ action: "editGuest"                 │
       └─────────────────────────────────────┘

4. Hapus Tamu
   │
   ├─► Supabase DELETE (langsung)
   │   ┌─────────────────────────────────────┐
   │   │ DELETE /rest/v1/tamu?kode=eq.XXX    │
   │   └─────────────────────────────────────┘
   │
   ├─► Hapus dari MASTER_LIST (optimistic)
   │
   └─► Background: Hapus dari GAS
       ┌─────────────────────────────────────┐
       │ action: "deleteGuest"               │
       └─────────────────────────────────────┘

5. Check-in Tamu
   │
   ├─► Supabase PATCH
   │   ┌─────────────────────────────────────┐
   │   │ status_hadir = "1"                  │
   │   │ jam_datang = ISO timestamp          │
   │   └─────────────────────────────────────┘
   │
   └─► Background: Sync ke GAS
       ┌─────────────────────────────────────┐
       │ action: "markCheckin"               │
       └─────────────────────────────────────┘

6. WA Blast Undangan
   │
   ├─► Buka WhatsApp API
   │   ┌─────────────────────────────────────┐
   │   │ wa.me/phone?text=encoded_msg        │
   │   └─────────────────────────────────────┘
   │
   ├─► Supabase PATCH (optimistic)
   │   ┌─────────────────────────────────────┐
   │   │ status_wa = "✅ [DD/MM HH:MM]"      │
   │   └─────────────────────────────────────┘
   │
   └─► Background: Sync ke GAS
       ┌─────────────────────────────────────┐
       │ action: "markSent"                  │
       └─────────────────────────────────────┘
```

---

## WORKFLOW: OFFLINE MODE

```
USER ACTION                    SYSTEM RESPONSE
─────────────                  ───────────────

1. Buka App (OFFLINE)
   │
   ├─► Service Worker
   │   ┌─────────────────────────────────────┐
   │   │ Cache-first: serve dari cache        │
   │   │ Asset tersedia (HTML, CSS, JS)       │
   │   └─────────────────────────────────────┘
   │
   ├─► Auth Check
   │   ┌─────────────────────────────────────┐
   │   │ Cek ssId di IndexedDB                │
   │   │ Ada? → Load data dari IndexedDB      │
   │   │ Tidak? → Tidak bisa offline          │
   │   └─────────────────────────────────────┘
   │
   └─► Load Data dari IndexedDB
       ┌─────────────────────────────────────┐
       │ OfflineDB.guests.getAll()            │
       │ OfflineDB.metadata.get()             │
       │ Render UI dengan data lokal          │
       └─────────────────────────────────────┘

2. Tambah Tamu (OFFLINE)
   │
   ├─► Generate kode unik
   │   ┌─────────────────────────────────────┐
   │   │ Kode = OFF-XXXXX (prefix OFF-)      │
   │   └─────────────────────────────────────┘
   │
   ├─► Simpan ke IndexedDB
   │   ┌─────────────────────────────────────┐
   │   │ OfflineDB.guests.save(guest)         │
   │   │ Status: synced = false               │
   │   └─────────────────────────────────────┘
   │
   ├─► Tambah ke sync_queue
   │   ┌─────────────────────────────────────┐
   │   │ OfflineDB.syncQueue.add(             │
   │   │   'INSERT', kode, guestData          │
   │   │ )                                    │
   │   └─────────────────────────────────────┘
   │
   ├─► Tambah ke sync_log (dedup)
   │   ┌─────────────────────────────────────┐
   │   │ OfflineDB.syncLog.add(opId)          │
   │   │ Cegah operasi ganda saat sync        │
   │   └─────────────────────────────────────┘
   │
   └─► Render UI (optimistic)
       ┌─────────────────────────────────────┐
       │ Tampilkan card dengan badge "LOCAL" │
       │ Sync badge: "1 operasi menunggu"    │
       └─────────────────────────────────────┘

3. Edit Tamu (OFFLINE)
   │
   ├─► Update IndexedDB
   │   ┌─────────────────────────────────────┐
   │   │ OfflineDB.guests.save(updatedGuest)  │
   │   └─────────────────────────────────────┘
   │
   ├─► Tambah ke sync_queue
   │   ┌─────────────────────────────────────┐
   │   │ OfflineDB.syncQueue.add(             │
   │   │   'UPDATE', kode, changes            │
   │   │ )                                    │
   │   └─────────────────────────────────────┘
   │
   └─► Render UI (optimistic)

4. Hapus Tamu (OFFLINE)
   │
   ├─► Hapus dari IndexedDB
   │   ┌─────────────────────────────────────┐
   │   │ OfflineDB.guests.delete(kode)        │
   │   └─────────────────────────────────────┘
   │
   ├─► Tambah ke sync_queue
   │   ┌─────────────────────────────────────┐
   │   │ OfflineDB.syncQueue.add(             │
   │   │   'DELETE', kode, null               │
   │   │ )                                    │
   │   └─────────────────────────────────────┘
   │
   └─► Render UI (optimistic)

5. Check-in Tamu (OFFLINE)
   │
   ├─► Update IndexedDB
   │   ┌─────────────────────────────────────┐
   │   │ statusHadir = '1'                    │
   │   │ jamDatang = new Date().toISOString() │
   │   └─────────────────────────────────────┘
   │
   └─► Tambah ke sync_queue
       ┌─────────────────────────────────────┐
       │ OfflineDB.syncQueue.add(             │
       │   'UPDATE', kode,                    │
       │   { statusHadir: '1', jamDatang }    │
       │ )                                    │
       └─────────────────────────────────────┘

6. Kembali ONLINE
   │
   ├─► SyncEngine.triggerSync()
   │   ┌─────────────────────────────────────┐
   │   │ 1. Baca sync_queue dari IndexedDB   │
   │   │ 2. Proses per operasi:              │
   │   │    - INSERT → POST Supabase         │
   │   │    - UPDATE → PATCH Supabase        │
   │   │    - DELETE → DELETE Supabase       │
   │   │ 3. Cek sync_log (skip jika sudah)   │
   │   │ 4. Hapus dari queue setelah sukses  │
   │   │ 5. Background: Sync ke GAS          │
   │   └─────────────────────────────────────┘
   │
   └─► Pull dari Server
       ┌─────────────────────────────────────┐
       │ GET /rest/v1/tamu?ssid=eq.XXX       │
       │ Update IndexedDB dengan data fresh  │
       │ Render UI dengan data terbaru       │
       └─────────────────────────────────────┘
```

---

## CONFLICT RESOLUTION

```
SCENARIO: Same guest edited on 2 devices offline
─────────────────────────────────────────────────

Device A (offline)              Device B (offline)
─────────────────               ─────────────────
Edit nama: "Budi"               Edit nama: "Budi Santoso"
     │                               │
     ▼                               ▼
IndexedDB: nama="Budi"         IndexedDB: nama="Budi Santoso"
sync_queue: UPDATE             sync_queue: UPDATE
     │                               │
     └───────────┬───────────────────┘
                 │
         Kembali ONLINE
                 │
                 ▼
    ┌────────────────────────────┐
    │    SyncEngine processes    │
    │                            │
    │  Device A: PATCH nama=Budi │
    │  Device B: PATCH nama=...  │
    │                            │
    │  Last-write-wins:          │
    │  Device B menang (later)   │
    └────────────────────────────┘

CONFLICT STRATEGY:
┌─────────────────────────────────────────────────────┐
│ 1. op_id per operation (UUID)                       │
│    → Cegah operasi ganda di-sync_queue              │
│                                                     │
│ 2. sync_log table in IndexedDB                      │
│    → Record op_id setelah sync sukses               │
│    → Skip jika op_id sudah ada                      │
│                                                     │
│ 3. Last-write-wins (same-field)                     │
│    → Supabase: ON CONFLICT (ssid, kode) UPSERT      │
│    → Field terakhir yang di-write menang            │
│                                                     │
│ 4. Separate-field merge (future)                    │
│    → Jika edit field berbeda, merge otomatis        │
│    → Contoh: A edit nama, B editalamat              │
└─────────────────────────────────────────────────────┘
```

---

## DATA FLOW: IndexedDB Schema

```
┌─────────────────────────────────────────────────────────┐
│                    IndexedDB Store                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  auth                                                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ { ssId, username, role, loginTime }              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  metadata                                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │ { ssId, nama_pengantin, hari_tanggal,           │   │
│  │   waktu_acara, lokasi_acara, sesi_1..3 }        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  guests                                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │ { kode, nama, whatsapp, kategori,               │   │
│  │   pihakPengundang, souvenir, alamat,            │   │
│  │   rencanaHadir, sesi, statusWA,                 │   │
│  │   statusHadir, jamDatang, synced }              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  sync_queue                                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │ { op_id, op_type, kode, payload, created_at }   │   │
│  │ op_type: INSERT | UPDATE | DELETE                │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  sync_log                                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │ { op_id, synced_at }                            │   │
│  │ Prevent duplicate sync                           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  print_queue                                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │ { kode, nama, status: WAITING|DONE }            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  assets (untuk gambar background)                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │ { url, blob, compressed }                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## SYNC ENGINE FLOW

```
┌─────────────────────────────────────────────────────────┐
│                   SyncEngine.init()                      │
│                                                         │
│  1. Register online/offline listeners                   │
│  2. Start auto-sync interval (30s)                      │
│  3. If online → triggerSync()                           │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  triggerSync()                           │
│                                                         │
│  if (!navigator.onLine) return;                         │
│                                                         │
│  1. Baca sync_queue dari IndexedDB                      │
│  2. Sort by created_at (FIFO)                           │
│  3. Proses per batch (max 10 per cycle)                 │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│               processOperation(op)                       │
│                                                         │
│  1. Cek sync_log → skip jika op_id sudah ada            │
│                                                         │
│  2. Switch(op_type):                                    │
│     ┌───────────────────────────────────────────────┐  │
│     │ INSERT:                                       │  │
│     │   POST /rest/v1/tamu                          │  │
│     │   Body: {ssid, kode, nama, ...}               │  │
│     ├───────────────────────────────────────────────┤  │
│     │ UPDATE:                                       │  │
│     │   PATCH /rest/v1/tamu?kode=eq.XXX             │  │
│     │   Body: {changed fields}                      │  │
│     ├───────────────────────────────────────────────┤  │
│     │ DELETE:                                       │  │
│     │   DELETE /rest/v1/tamu?kode=eq.XXX            │  │
│     └───────────────────────────────────────────────┘  │
│                                                         │
│  3. Jika sukses:                                        │
│     - Hapus dari sync_queue                             │
│     - Tambah op_id ke sync_log                          │
│     - Update guest.synced = true                        │
│                                                         │
│  4. Background: Sync ke Google Sheets via GAS           │
│     POST to GAS endpoint                                │
│     action: saveGuestsToSheet / deleteGuest / markSent   │
└─────────────────────────────────────────────────────────┘
```

---

## SERVICE WORKER STRATEGY

```
┌─────────────────────────────────────────────────────────┐
│                    sw.js — Cache-First                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  INSTALL:                                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Cache static assets:                            │   │
│  │ - HTML files (all pages)                        │   │
│  │ - CSS (animations.css)                          │   │
│  │ - JS (offline-db.js, sync-engine.js)            │   │
│  │ - Fonts (Google Fonts)                          │   │
│  │ - Icons (favicon.png)                           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  FETCH (Cache-First):                                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 1. Cek cache → ada? → return dari cache         │   │
│  │ 2. Tidak ada? → fetch dari network              │   │
│  │ 3. Simpan ke cache → return response            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  FETCH (API calls — Network-First):                     │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 1. Fetch dari network                           │   │
│  │ 2. Jika gagal → return dari cache               │   │
│  │ 3. Jika sukses → update cache                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  BENEFIT:                                               │
│  - App bisa dibuka tanpa internet                      │
│  - Semua halaman tersedia di cache                      │
│  - Formulir, check-in, onsite, welcome                 │
│  - Data dari IndexedDB (sudah tersimpan)               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## OFFLINE INDICATOR

```
┌─────────────────────────────────────────────────────────┐
│              User Experience States                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ONLINE:                                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │ • Data loaded dari Supabase                     │   │
│  │ • Semua fitur aktif                              │   │
│  │ • Real-time updates                              │   │
│  │ • WA Blast tersedia                              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  OFFLINE:                                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │ • Banner "⚠️ OFFLINE — Data tersimpan lokal"   │   │
│  │ • Data dari IndexedDB                            │   │
│  │ • Form submit → simpan lokal + queue             │   │
│  │ • WA Blast tidak tersedia (butuh internet)       │   │
│  │ • Sync badge menunggu koneksi                    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  RECONNECTING:                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ • Banner hilang                                  │   │
│  │ • SyncEngine triggerSync()                       │   │
│  │ • Process semua operasi di queue                 │   │
│  │ • Pull data terbaru dari server                  │   │
│  │ • Render ulang UI                                │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## FILE STRUCTURE

```
temp_dev/
├── manifest.json          ← PWA config
├── sw.js                  ← Service Worker
├── offline-db.js          ← IndexedDB helper library
├── sync-engine.js         ← Sync engine + conflict resolution
│
├── formulir_tamu.html     ← Guest registration (offline-first)
├── checkin.html           ← Check-in scanner (offline-first)
├── onsite.html            ← Walk-in registration (offline-first)
├── welcome.html           ← Welcome/splash (offline-first)
│
├── dashboard.html         ← Dashboard
├── analytics.html         ← Analytics
├── wa_blast.html          ← WA Blast
├── undangan.html          ← Undangan
├── luckydraw.html         ← Lucky Draw
├── angpao.html            ← Angpao
├── monitor.html           ← Monitor
├── worker.html            ← Worker
├── kiosk.html             ← Kiosk mode
├── ... (31 total HTML files)
```
