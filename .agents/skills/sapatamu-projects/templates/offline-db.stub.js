const OfflineDB_STUB = { DB_NAME:'sapatamu_offline_db', DB_VERSION:1 };
// Copy full schema from references/05-offline-sync.md — 7 stores: auth(metadata, guests, sync_queue, assets, print_queue, sync_log)
// See offline-db.js:1 for full impl. Minimal bootstrap:
// await OfflineDB.auth.save(ssId, username, subdomain)
// await OfflineDB.guests.saveBulk(list)
// await OfflineDB.syncQueue.add('INSERT', kode, data)
// SyncEngine.init(); SyncEngine.bootstrap(ssId, user, sub);
