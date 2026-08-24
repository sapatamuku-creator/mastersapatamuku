# 05 — Offline-First & Sync Engine

> Sumber: `offline-db.js:1` (395 lines, 7 stores), `sync-engine.js:1` (331 lines), `sync_queue.js` legacy, `sw.js`, `subdomain_resolver.js`

## 5.1 IndexedDB Schema (canon — jangan ubah keyPath tanpa migrasi)

`DB_NAME='sapatamu_offline_db' v1` — 7 stores:

| Store | keyPath | Indexes | Isi |
|-------|---------|---------|-----|
| `auth` | `key` | — | `{key:'session', ssId, username, subdomain, login_at}` |
| `metadata` | `key` | — | `{key:'event', ...data, updated_at}` |
| `guests` | `kode` | `ssid,nama,kategori,status_wa,print_queue` | guest row + `local_updated_at, synced, ssid` |
| `sync_queue` | `op_id` | `timestamp,action` | `{op_id, action:INSERT|UPDATE|DELETE|UPDATE_STATUS, kode, data, timestamp, device_id, retries}` |
| `assets` | `key` | — | `{key, blob, cached_at, ...meta}` |
| `print_queue` | `op_id` | `status,timestamp` | `{op_id:'print_'+id, guest_kode, guest_name, label_type, status:WAITING|DONE}` |
| `sync_log` | `op_id` | — | `{op_id, synced_at}` dedup |

CRUD generic: `OfflineDB.put/get/getAll/remove/clear/count(store, key/data)` — semua Promise.

**Helpers:**

```js
OfflineDB.auth.save(ssId, username, subdomain)
OfflineDB.auth.get() -> {ssId, username, ...} | undefined
OfflineDB.auth.isLoggedIn()
OfflineDB.guests.save(guest) // merge + local_updated_at + synced:false
OfflineDB.guests.saveBulk(list) // transaction put loop
OfflineDB.guests.getBySSID(ssId) // via index
OfflineDB.guests.search(q) // filter nama/whatsapp/kategori/kode lower
OfflineDB.syncQueue.add(action,kode,data) // op_id = Date36+random9
OfflineDB.printQueue.add(kode,name,labelType)
OfflineDB.syncLog.exists/add
OfflineDB.estimateSize() // navigator.storage.estimate -> {used, quota, usedMB}
generateOpId() // Date36+random9
getDeviceId() // localStorage sapatamu_device_id 'dev_'+Date36+random6
```

## 5.2 SyncEngine (online 30s poll)

```js
SyncEngine.init() // listen online/offline, updateOnlineStatus, startAutoSync 30s
SyncEngine.triggerSync() // FIFO sync_queue -> check syncLog dedup -> processOperation -> syncLog.add -> remove; retry ≤5 else drop
SyncEngine.pullFromServer() // GET /rest/v1/tamu?ssid=eq.X&order=row.desc -> saveBulk map 14 fields; then metadata_client
SyncEngine.bootstrap(ssId, username, subdomain) // auth.save + pullFromServer
SyncEngine.startAutoSync() // setInterval 30s triggerSync+syncPrintQueue
SyncEngine.stopAutoSync()
SyncEngine.isOnline() / isSyncing()
```

`processOperation` switch:
- `INSERT` → POST `/rest/v1/tamu` body snake_case 14 cols + Prefer:return=minimal
- `UPDATE` → PATCH `?ssid=eq.X&kode=eq.Y` body updates
- `DELETE` → DELETE sama
- `UPDATE_STATUS` → PATCH status fields

`syncPrintQueue` → `print_queue.getWaiting()` → markDone DONE + PATCH `print_queue='DONE'`.

UI indicator: `#online-status-indicator` green `#10B981` / red `#EF4444` + glow, `#online-status-text` Online/Offline Mode, event `connectionChange {online}`.

## 5.3 Legacy sync_queue.js (jangan pakai di project baru — dokumentasi untuk migrasi)

- DB `SapaTamuOfflineDB` store `checkin_queue autoIncrement` + `fallbackEnqueue` ke `localStorage sapatamu_sync_queue` encrypted AES-GCM 256 PBKDF2 100k salt `sapatamu-queue-salt` seed `username+ssId+sapatamu-queue-encryption`.
- Monkey-patch `window.fetch` intercept GAS `confirm_checkin/broadcastWA/...` + Supabase `rest/v1` POST/PATCH/DELETE → fake 200 queued.
- Rate `1.5s ok /5s fail`, max 50, indicator `#sync-queue-badge` bottom fixed blur.
- **SLOP:** duplikasi DB dengan `offline-db.js` — project baru pilih **satu**: `offline-db.js` + `sync-engine.js`.

## 5.4 Service Worker sync hooks

- `sw.js` message `CACHE_IMAGES` + `sync sync-guests` → `postMessage TRIGGER_SYNC` → `SyncEngine.triggerSync()` (listen di main thread).
- Navigations network-first agar update langsung tampil; cross-origin bypass agar Drive/Supabase tidak di-intercept.

## 5.5 Bootstrap flow (first login)

```
login -> subdomain_resolver resolve -> saveSession + OfflineDB.auth.save -> SyncEngine.bootstrap(ssId, user, sub) -> pullFromServer -> ready offline
```

Offline read: `OfflineDB.guests.getBySSID(ssId)` → render skeleton → real cards (tanpa fetch). Online write: `guests.save` + `syncQueue.add` → instant UI → background sync 30s or `online` event.

## 5.6 Checklist offline

- [ ] DB v1 7 stores, keyPath benar, indexes ada
- [ ] saveBulk pakai transaction single, bukan loop put isolated
- [ ] op_id unik, retries ≤5, syncLog dedup
- [ ] offline read tanpa fetch, online write optimistic + queue
- [ ] indicator online/offline visible, tidak freeze main thread (micro-yield jika batch)
