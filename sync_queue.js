/**
 * SAPATAMU.KU - AUTO SYNC QUEUE SYSTEM (INDEXEDDB CLIENT-SIDE)
 * Mencegah Google Apps Script & Supabase Overload Request Paralel & Kehilangan Sinyal
 */
(function() {
    const DB_NAME = 'SapaTamuOfflineDB';
    const STORE_NAME = 'checkin_queue';
    const DB_VERSION = 1;
    let isProcessing = false;
    let dbPromise = null;

    // ── ENCRYPTION HELPERS (Web Crypto API) ──
    const ENCRYPTION_ALGO = 'AES-GCM';
    const KEY_DERIVATION_ALGO = 'PBKDF2';
    const ITERATIONS = 100000;

    async function getEncryptionKey() {
        // Derive key dari session data (unique per-user)
        let sessionSeed = 'sapatamu-default-key';
        try {
            const session = JSON.parse(localStorage.getItem('sapatamu_db') || '{}');
            sessionSeed = (session.username || '') + (session.ssId || '') + 'sapatamu-queue-encryption';
        } catch (e) {}

        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw', encoder.encode(sessionSeed), KEY_DERIVATION_ALGO, false, ['deriveKey']
        );
        return crypto.subtle.deriveKey(
            { name: KEY_DERIVATION_ALGO, salt: encoder.encode('sapatamu-queue-salt'), iterations, hash: 'SHA-256' },
            keyMaterial,
            { name: ENCRYPTION_ALGO, length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    async function encryptData(data) {
        try {
            const key = await getEncryptionKey();
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encoded = new TextEncoder().encode(JSON.stringify(data));
            const encrypted = await crypto.subtle.encrypt({ name: ENCRYPTION_ALGO, iv }, key, encoded);
            return { iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)) };
        } catch (e) {
            return null; // Fallback ke plaintext jika encryption gagal
        }
    }

    async function decryptData(enc) {
        try {
            const key = await getEncryptionKey();
            const iv = new Uint8Array(enc.iv);
            const data = new Uint8Array(enc.data);
            const decrypted = await crypto.subtle.decrypt({ name: ENCRYPTION_ALGO, iv }, key, data);
            return JSON.parse(new TextDecoder().decode(decrypted));
        } catch (e) {
            return null;
        }
    }

    // Inisialisasi/koneksi IndexedDB
    function getDB() {
        if (!window.indexedDB) {
            console.error('[SyncQueue] Browser tidak mendukung IndexedDB.');
            return null;
        }
        if (dbPromise) return dbPromise;
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                    store.createIndex('status_sync', 'status_sync', { unique: false });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.target.error);
        });
        return dbPromise;
    }

    // Antrekan request fallback ke localStorage jika IndexedDB bermasalah (ENCRYPTED)
    async function fallbackEnqueue(url, options) {
        try {
            const queue = JSON.parse(localStorage.getItem('sapatamu_sync_queue')) || [];
            const item = {
                id: 'fb_' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : (Date.now() + '_' + Math.random().toString(36).substr(2, 9))),
                url: url,
                method: options.method || 'POST',
                headers: options.headers || {},
                body: options.body,
                retryCount: 0,
                isFallback: true
            };
            // Encrypt sebelum simpan ke localStorage
            const encrypted = await encryptData(item);
            queue.push(encrypted || item); // Fallback plaintext jika encryption gagal
            localStorage.setItem('sapatamu_sync_queue', JSON.stringify(queue));
            updateQueueCount();
            if (!isProcessing) processQueue();
        } catch(e) {}
    }

    // Tambahkan request ke dalam antrean IndexedDB
    async function enqueue(url, options) {
        try {
            const db = await getDB();
            if (!db) {
                fallbackEnqueue(url, options);
                return;
            }

            const newItem = {
                url: url,
                method: options.method || 'POST',
                headers: options.headers || {},
                body: options.body,
                status_sync: 'pending',
                timestamp: Date.now(),
                retries: 0,
                error_log: ''
            };

            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.add(newItem);

            tx.oncomplete = () => {
                console.log('[SyncQueue] Request dimasukkan ke antrean IndexedDB:', url);
                updateQueueCount();
                if (!isProcessing) processQueue();
            };
        } catch (e) {
            console.error('[SyncQueue] Gagal menyimpan antrean ke IndexedDB:', e);
            fallbackEnqueue(url, options);
        }
    }

    // Ambil request berikutnya (FIFO) dari fallback localStorage atau IndexedDB
    async function getNextQueueItem() {
        try {
            const fbQueue = JSON.parse(localStorage.getItem('sapatamu_sync_queue')) || [];
            if (fbQueue.length > 0) {
                let item = fbQueue[0];
                // Decrypt jika data ter-encrypt
                if (item && item.iv && item.data) {
                    const decrypted = await decryptData(item);
                    if (decrypted) item = decrypted;
                }
                return {
                    id: item.id,
                    url: item.url,
                    method: item.method,
                    headers: item.headers,
                    body: item.body,
                    isFallback: true
                };
            }
        } catch(e) {}

        try {
            const db = await getDB();
            if (!db) return null;
            return new Promise((resolve) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const index = store.index('timestamp');
                const request = index.openCursor();
                request.onsuccess = (e) => {
                    const cursor = e.target.result;
                    if (cursor) {
                        const item = cursor.value;
                        if (item.status_sync === 'pending' || item.status_sync === 'failed') {
                            resolve(item);
                        } else {
                            cursor.continue();
                        }
                    } else {
                        resolve(null);
                    }
                };
                request.onerror = () => resolve(null);
            });
        } catch(e) {
            return null;
        }
    }

    // Update status antrean IndexedDB
    async function updateStatus(id, status, errorMsg = '') {
        if (typeof id === 'string' && id.startsWith('fb_')) return;
        try {
            const db = await getDB();
            if (!db) return;
            return new Promise((resolve) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const request = store.get(id);
                request.onsuccess = () => {
                    const data = request.value;
                    if (data) {
                        data.status_sync = status;
                        if (status === 'failed') {
                            data.retries = (data.retries || 0) + 1;
                            data.error_log = errorMsg;
                        }
                        store.put(data);
                    }
                };
                tx.oncomplete = () => {
                    updateQueueCount();
                    resolve();
                };
            });
        } catch(e) {}
    }

    // Hapus antrean setelah sukses dikirim
    async function deleteItem(id) {
        if (typeof id === 'string' && id.startsWith('fb_')) {
            try {
                const fbQueue = JSON.parse(localStorage.getItem('sapatamu_sync_queue')) || [];
                const updated = fbQueue.filter(item => {
                    // Handle both encrypted ({iv, data}) and plaintext ({id}) formats
                    if (item && item.iv && item.data) return true; // Keep encrypted items (can't check id without decrypt)
                    return item.id !== id;
                });
                localStorage.setItem('sapatamu_sync_queue', JSON.stringify(updated));
                updateQueueCount();
            } catch(e) {}
            return;
        }
        try {
            const db = await getDB();
            if (!db) return;
            return new Promise((resolve) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                store.delete(id);
                tx.oncomplete = () => {
                    updateQueueCount();
                    resolve();
                };
            });
        } catch(e) {}
    }

    // Kirim request antrean satu per satu secara terkontrol (Sequensial)
    async function processQueue() {
        if (isProcessing) return;
        
        const nextItem = await getNextQueueItem();
        if (!nextItem) {
            isProcessing = false;
            updateQueueCount();
            return;
        }

        isProcessing = true;
        
        if (!nextItem.isFallback) {
            await updateStatus(nextItem.id, 'syncing');
        }

        try {
            const fetchOptions = {
                method: nextItem.method,
                headers: nextItem.headers,
                body: nextItem.body
            };
            
            // Bypass CORS redirect pada request Google Apps Script
            if (nextItem.url.includes('script.google.com')) {
                fetchOptions.mode = 'no-cors';
            }

            await window.originalFetch(nextItem.url, fetchOptions);

            // Sukses, hapus dari database lokal
            await deleteItem(nextItem.id);
            
            isProcessing = false;
            // Jeda 1.5 detik sebelum memproses berikutnya (Rate Limiter)
            setTimeout(processQueue, 1500);
        } catch (err) {
            console.warn("[SyncQueue] Gagal mengirim request background. Retrying...", err);
            
            if (!nextItem.isFallback) {
                await updateStatus(nextItem.id, 'failed', err.message);
            }
            
            isProcessing = false;
            // Jeda 5 detik jika terjadi timeout/koneksi putus sebelum retry
            setTimeout(processQueue, 5000); 
        }
    }

    // Hitung total sisa antrean dan perbarui UI indicator
    async function updateQueueCount() {
        let count = 0;
        try {
            const fbQueue = JSON.parse(localStorage.getItem('sapatamu_sync_queue')) || [];
            count += fbQueue.length;
        } catch(e) {}

        try {
            const db = await getDB();
            if (db) {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const request = store.count();
                request.onsuccess = () => {
                    count += request.result;
                    updateQueueIndicator(count);
                };
                request.onerror = () => {
                    updateQueueIndicator(count);
                };
                return;
            }
        } catch(e) {}
        
        updateQueueIndicator(count);
    }

    // Intercept fungsi fetch global browser (dengan safeguards)
    if (!window.originalFetch) {
        window.originalFetch = window.fetch;
        const MAX_QUEUE_SIZE = 50; // Batas maksimal antrean
        window.fetch = function(url, options) {
            let shouldIntercept = false;
            
            if (options) {
                const method = (options.method || 'GET').toUpperCase();
                
                // 1. Intersepsi GAS background requests (POST + no-cors)
                if (method === 'POST' && options.mode === 'no-cors') {
                    try {
                        const payload = JSON.parse(options.body);
                        const interceptActions = ['confirm_checkin', 'broadcastWA', 'uploadSelfie', 'register_new_onsite', 'sendAutomationBlast'];
                        if (interceptActions.includes(payload.action)) {
                            shouldIntercept = true;
                        }
                    } catch(e) {}
                }
                
                // 2. Intersepsi Supabase REST API writes (POST, PATCH, DELETE)
                if (['POST', 'PATCH', 'DELETE'].includes(method) && url.includes('supabase.co/rest/v1/')) {
                    shouldIntercept = true;
                }
            }
            
            if (shouldIntercept) {
                // Cek batas antrean sebelum enqueue
                const currentCount = document.getElementById('sync-queue-badge')?.dataset?.count || 0;
                if (parseInt(currentCount) >= MAX_QUEUE_SIZE) {
                    console.warn('[SyncQueue] Antrean penuk, request diabaikan:', url);
                    return Promise.resolve(new Response(JSON.stringify({ status: 'queue_full', error: 'Queue limit reached' }), {
                        status: 503,
                        headers: { 'Content-Type': 'application/json' }
                    }));
                }
                
                enqueue(url, options);
                
                // Kembalikan Response sukses palsu ke frontend asli agar tidak merusak alur JS utama
                return Promise.resolve(new Response(JSON.stringify({ status: 'queued' }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                }));
            }
            
            return window.originalFetch.apply(this, arguments);
        };
    }

    let maxPendingPeak = 0;
    let syncSuccessTimeout = null;

    // Tampilkan Indikator Sinkronisasi Latar Belakang yang Elegan (live-progress-ux)
    function updateQueueIndicator(pendingCount) {
        let indicator = document.getElementById('sync-queue-badge');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'sync-queue-badge';
            
            if (!document.getElementById('sync-queue-style')) {
                const styleEl = document.createElement('style');
                styleEl.id = 'sync-queue-style';
                styleEl.innerHTML = `
                    @keyframes syncPulse {
                        0% { transform: scale(0.92); opacity: 0.6; }
                        50% { transform: scale(1.15); opacity: 1; }
                        100% { transform: scale(0.92); opacity: 0.6; }
                    }
                    @keyframes syncSlideIn {
                        from { transform: translateY(16px); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                    #sync-queue-badge {
                        position: fixed;
                        bottom: 80px;
                        right: 20px;
                        background: rgba(74, 63, 53, 0.96);
                        backdrop-filter: blur(12px);
                        -webkit-backdrop-filter: blur(12px);
                        border: 1px solid var(--border, #F0E6DE);
                        color: #FFF9F5;
                        padding: 9px 16px;
                        border-radius: 30px;
                        font-size: 9.5px;
                        font-weight: 800;
                        z-index: 99999;
                        display: none;
                        align-items: center;
                        gap: 10px;
                        box-shadow: 0 8px 24px rgba(74, 63, 53, 0.2);
                        transition: all 0.25s cubic-bezier(0.32, 0.72, 0, 1);
                        font-family: 'Plus Jakarta Sans', sans-serif;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        animation: syncSlideIn 0.3s ease-out;
                    }
                    @media (max-width: 767.98px) {
                        #sync-queue-badge {
                            bottom: 74px;
                            right: 12px;
                            padding: 7px 12px;
                            font-size: 8.5px;
                            gap: 7px;
                        }
                    }
                `;
                document.head.appendChild(styleEl);
            }
            document.body.appendChild(indicator);
        }

        if (pendingCount > 0) {
            if (syncSuccessTimeout) {
                clearTimeout(syncSuccessTimeout);
                syncSuccessTimeout = null;
            }
            if (pendingCount > maxPendingPeak) {
                maxPendingPeak = pendingCount;
            }

            const doneCount = Math.max(0, maxPendingPeak - pendingCount);
            const percent = maxPendingPeak > 0 ? Math.round((doneCount / maxPendingPeak) * 100) : 0;

            indicator.style.display = 'flex';
            indicator.dataset.count = pendingCount; // Store count for fetch patch queue limit check

            if (isProcessing && maxPendingPeak > 1) {
                indicator.innerHTML = `
                    <span style="display:inline-block; width:7px; height:7px; background:#C8962E; border-radius:50%; animation:syncPulse 1.2s infinite; flex-shrink:0;"></span>
                    <span>Sync: ${doneCount}/${maxPendingPeak} (${percent}%)</span>
                    <span style="color:#C8962E; font-size:8.5px;">⏳ ${pendingCount} antrean</span>
                `;
            } else {
                indicator.innerHTML = `
                    <span style="display:inline-block; width:7px; height:7px; background:#C8962E; border-radius:50%; animation:syncPulse 1.5s infinite; flex-shrink:0;"></span>
                    <span>Antrean Offline: ${pendingCount} Data</span>
                `;
            }
        } else {
            indicator.dataset.count = 0;
            if (maxPendingPeak > 0) {
                // Show completion banner briefly
                indicator.style.display = 'flex';
                indicator.innerHTML = `
                    <span style="color:#10B981; font-size:12px;">✓</span>
                    <span style="color:#10B981;">Semua Data Tersinkron!</span>
                `;
                maxPendingPeak = 0;
                syncSuccessTimeout = setTimeout(() => {
                    indicator.style.display = 'none';
                }, 2200);
            } else {
                indicator.style.display = 'none';
            }
        }
    }

    // Cek sisa antrean saat pertama kali aplikasi dibuka
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            updateQueueCount();
            processQueue();
        }, 1000);
    });
})();
