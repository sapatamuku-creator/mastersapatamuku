/* ═══════════════════════════════════════════════════════════
   OFFLINE-DB.JS — IndexedDB Helper for SapaTamu PWA
   ═══════════════════════════════════════════════════════════ */

const OfflineDB = (() => {
    const DB_NAME = 'sapatamu_offline_db';
    const DB_VERSION = 1;
    let dbInstance = null;

    // ── Open/Create DB ──
    async function openDB() {
        if (dbInstance) return dbInstance;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Auth store
                if (!db.objectStoreNames.contains('auth')) {
                    db.createObjectStore('auth', { keyPath: 'key' });
                }

                // Metadata store
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'key' });
                }

                // Guests store (primary data)
                if (!db.objectStoreNames.contains('guests')) {
                    const guestsStore = db.createObjectStore('guests', { keyPath: 'kode' });
                    guestsStore.createIndex('ssid', 'ssid', { unique: false });
                    guestsStore.createIndex('nama', 'nama', { unique: false });
                    guestsStore.createIndex('kategori', 'kategori', { unique: false });
                    guestsStore.createIndex('status_wa', 'status_wa', { unique: false });
                    guestsStore.createIndex('print_queue', 'print_queue', { unique: false });
                }

                // Sync queue (offline operations)
                if (!db.objectStoreNames.contains('sync_queue')) {
                    const syncStore = db.createObjectStore('sync_queue', { keyPath: 'op_id' });
                    syncStore.createIndex('timestamp', 'timestamp', { unique: false });
                    syncStore.createIndex('action', 'action', { unique: false });
                }

                // Assets store (images, backgrounds)
                if (!db.objectStoreNames.contains('assets')) {
                    db.createObjectStore('assets', { keyPath: 'key' });
                }

                // Print queue store
                if (!db.objectStoreNames.contains('print_queue')) {
                    const printStore = db.createObjectStore('print_queue', { keyPath: 'op_id' });
                    printStore.createIndex('status', 'status', { unique: false });
                    printStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Sync log (prevent duplicate sync)
                if (!db.objectStoreNames.contains('sync_log')) {
                    db.createObjectStore('sync_log', { keyPath: 'op_id' });
                }
            };

            request.onsuccess = (event) => {
                dbInstance = event.target.result;
                console.log('[IndexedDB] Database opened:', DB_NAME);
                resolve(dbInstance);
            };

            request.onerror = (event) => {
                console.error('[IndexedDB] Error opening:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    // ── Generic CRUD ──
    async function put(storeName, data) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function get(storeName, key) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function getAll(storeName) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function remove(storeName, key) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async function clear(storeName) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async function count(storeName) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // ── Auth helpers ──
    const auth = {
        async save(ssId, username, subdomain) {
            await put('auth', {
                key: 'session',
                ssId,
                username,
                subdomain,
                login_at: Date.now()
            });
        },
        async get() {
            return await get('auth', 'session');
        },
        async clear() {
            await clear('auth');
        },
        async isLoggedIn() {
            const session = await this.get();
            return !!(session && session.ssId);
        }
    };

    // ── Metadata helpers ──
    const metadata = {
        async save(data) {
            await put('metadata', { key: 'event', ...data, updated_at: Date.now() });
        },
        async get() {
            return await get('metadata', 'event');
        }
    };

    // ── Guests helpers ──
    const guests = {
        async save(guest) {
            const existing = await get('guests', guest.kode);
            const data = {
                ...guest,
                ssid: guest.ssid || (await auth.get())?.ssId,
                local_updated_at: Date.now(),
                synced: existing ? existing.synced : false
            };
            await put('guests', data);
            return data;
        },
        async saveBulk(guestList) {
            const db = await openDB();
            const tx = db.transaction('guests', 'readwrite');
            const store = tx.objectStore('guests');
            guestList.forEach((g) => {
                store.put({
                    ...g,
                    ssid: g.ssid || '',
                    local_updated_at: Date.now(),
                    synced: false
                });
            });
            return new Promise((resolve, reject) => {
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
            });
        },
        async get(kode) {
            return await get('guests', kode);
        },
        async getAll() {
            return await getAll('guests');
        },
        async getBySSID(ssId) {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('guests', 'readonly');
                const store = tx.objectStore('guests');
                const index = store.index('ssid');
                const request = index.getAll(ssId);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        },
        async update(kode, updates) {
            const existing = await get('guests', kode);
            if (!existing) return null;
            const data = { ...existing, ...updates, local_updated_at: Date.now(), synced: false };
            await put('guests', data);
            return data;
        },
        async remove(kode) {
            await remove('guests', kode);
        },
        async search(query) {
            const allGuests = await this.getAll();
            const q = query.toLowerCase();
            return allGuests.filter(g =>
                (g.nama || '').toLowerCase().includes(q) ||
                (g.whatsapp || '').toLowerCase().includes(q) ||
                (g.kategori || '').toLowerCase().includes(q) ||
                (g.kode || '').toLowerCase().includes(q)
            );
        },
        async count() {
            return await count('guests');
        }
    };

    // ── Sync Queue helpers ──
    const syncQueue = {
        async add(action, kode, data) {
            const opId = generateOpId();
            await put('sync_queue', {
                op_id: opId,
                action,   // INSERT, UPDATE, DELETE
                kode,
                data,
                timestamp: Date.now(),
                device_id: getDeviceId(),
                retries: 0
            });
            return opId;
        },
        async getAll() {
            return await getAll('sync_queue');
        },
        async remove(opId) {
            await remove('sync_queue', opId);
        },
        async clear() {
            await clear('sync_queue');
        },
        async count() {
            return await count('sync_queue');
        }
    };

    // ── Print Queue helpers ──
    const printQueue = {
        async add(guestKode, guestName, labelType) {
            const opId = 'print_' + generateOpId();
            await put('print_queue', {
                op_id: opId,
                guest_kode: guestKode,
                guest_name: guestName,
                label_type: labelType,
                status: 'WAITING',
                timestamp: Date.now(),
                device_id: getDeviceId()
            });
            return opId;
        },
        async markDone(opId) {
            const existing = await get('print_queue', opId);
            if (existing) {
                await put('print_queue', { ...existing, status: 'DONE', done_at: Date.now() });
            }
        },
        async getWaiting() {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('print_queue', 'readonly');
                const store = tx.objectStore('print_queue');
                const index = store.index('status');
                const request = index.getAll('WAITING');
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        },
        async getAll() {
            return await getAll('print_queue');
        }
    };

    // ── Assets helpers ──
    const assets = {
        async save(key, blob, meta = {}) {
            await put('assets', {
                key,
                blob,
                ...meta,
                cached_at: Date.now()
            });
        },
        async get(key) {
            const asset = await get('assets', key);
            return asset ? asset.blob : null;
        },
        async getURL(key) {
            const blob = await this.get(key);
            if (!blob) return null;
            return URL.createObjectURL(blob);
        },
        async remove(key) {
            await remove('assets', key);
        }
    };

    // ── Sync Log helpers ──
    const syncLog = {
        async exists(opId) {
            const log = await get('sync_log', opId);
            return !!log;
        },
        async add(opId) {
            await put('sync_log', { op_id: opId, synced_at: Date.now() });
        }
    };

    // ── Utilities ──
    function generateOpId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    function getDeviceId() {
        let deviceId = localStorage.getItem('sapatamu_device_id');
        if (!deviceId) {
            deviceId = 'dev_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
            localStorage.setItem('sapatamu_device_id', deviceId);
        }
        return deviceId;
    }

    // ── Database size estimation ──
    async function estimateSize() {
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            return {
                used: estimate.usage,
                available: estimate.quota,
                usedMB: (estimate.usage / 1024 / 1024).toFixed(2),
                availableMB: (estimate.quota / 1024 / 1024).toFixed(2)
            };
        }
        return null;
    }

    // ── Public API ──
    return {
        openDB,
        auth,
        metadata,
        guests,
        syncQueue,
        printQueue,
        assets,
        syncLog,
        estimateSize,
        put, get, getAll, remove, clear, count
    };
})();

// Expose globally
window.OfflineDB = OfflineDB;
