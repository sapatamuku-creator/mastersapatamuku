/* ═══════════════════════════════════════════════════════════
   SYNC-ENGINE.JS — Offline Sync Engine for SapaTamu PWA
   ═══════════════════════════════════════════════════════════ */

const SyncEngine = (() => {
    const SB_HEADERS = {
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json'
    };
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz5zBOJIO-b0MP-oqWhIUehqQaPbQt5pK9cMpTOYlj1pyT19LFD4VwynyJt_EAayBE/exec';

    let isOnline = navigator.onLine;
    let isSyncing = false;
    let syncInterval = null;

    // ── Initialize ──
    function init() {
        // Listen for online/offline events
        window.addEventListener('online', () => {
            isOnline = true;
            updateOnlineStatus(true);
            triggerSync();
        });

        window.addEventListener('offline', () => {
            isOnline = false;
            updateOnlineStatus(false);
        });

        // Initial status
        updateOnlineStatus(navigator.onLine);

        // Auto sync every 30 seconds when online
        startAutoSync();

        console.log('[SyncEngine] Initialized. Online:', isOnline);
    }

    // ── Online Status UI ──
    function updateOnlineStatus(online) {
        const indicator = document.getElementById('online-status-indicator');
        const text = document.getElementById('online-status-text');

        if (indicator) {
            indicator.style.background = online ? '#10B981' : '#EF4444';
            indicator.style.boxShadow = online
                ? '0 0 0 0 rgba(16, 185, 129, 0.4)'
                : '0 0 0 0 rgba(239, 68, 68, 0.4)';
        }

        if (text) {
            text.textContent = online ? 'Online' : 'Offline Mode';
            text.style.color = online ? '#10B981' : '#EF4444';
        }

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('connectionChange', {
            detail: { online }
        }));
    }

    // ── Sync Queue Processor ──
    async function triggerSync() {
        if (!isOnline || isSyncing) return;

        isSyncing = true;
        console.log('[SyncEngine] Starting sync...');

        try {
            const queue = await OfflineDB.syncQueue.getAll();
            if (queue.length === 0) {
                console.log('[SyncEngine] Nothing to sync');
                isSyncing = false;
                return;
            }

            console.log(`[SyncEngine] Processing ${queue.length} operations`);

            for (const op of queue) {
                // Check if already synced
                const alreadySynced = await OfflineDB.syncLog.exists(op.op_id);
                if (alreadySynced) {
                    await OfflineDB.syncQueue.remove(op.op_id);
                    continue;
                }

                try {
                    await processOperation(op);
                    await OfflineDB.syncLog.add(op.op_id);
                    await OfflineDB.syncQueue.remove(op.op_id);
                    console.log(`[SyncEngine] Synced: ${op.op_id}`);
                } catch (err) {
                    console.error(`[SyncEngine] Failed: ${op.op_id}`, err);
                    // Increment retry count
                    op.retries = (op.retries || 0) + 1;
                    if (op.retries >= 5) {
                        await OfflineDB.syncQueue.remove(op.op_id);
                        console.warn(`[SyncEngine] Dropped after 5 retries: ${op.op_id}`);
                    } else {
                        await OfflineDB.syncQueue.put(op);
                    }
                }
            }

            console.log('[SyncEngine] Sync complete');
        } catch (err) {
            console.error('[SyncEngine] Sync error:', err);
        } finally {
            isSyncing = false;
        }
    }

    // ── Process Individual Operation ──
    async function processOperation(op) {
        const session = await OfflineDB.auth.get();
        const ssId = session?.ssId;
        if (!ssId) throw new Error('No session found');

        switch (op.action) {
            case 'INSERT':
                return await syncInsert(ssId, op.data);
            case 'UPDATE':
                return await syncUpdate(ssId, op.kode, op.data);
            case 'DELETE':
                return await syncDelete(ssId, op.kode);
            case 'UPDATE_STATUS':
                return await syncUpdateStatus(ssId, op.kode, op.data);
            default:
                console.warn('[SyncEngine] Unknown action:', op.action);
        }
    }

    // ── Sync Operations ──
    async function syncInsert(ssId, guestData) {
        const payload = {
            ssid: ssId,
            kode: guestData.kode,
            nama: guestData.nama,
            whatsapp: guestData.whatsapp || '',
            kategori: guestData.kategori || 'Umum',
            pihak_pengundang: guestData.pihakPengundang || '-',
            souvenir: guestData.souvenir || 'tidak',
            alamat: guestData.alamat || '-',
            rencana_hadir: guestData.rencanaHadir || 1,
            sesi: guestData.sesi || '-',
            status_wa: guestData.statusWA || 'BELUM TERKIRIM',
            status_hadir: guestData.statusHadir || '0',
            real_hadir: '0',
            jam_datang: '-',
            status_hadiah: '-',
            tanda_kasih: 0,
            subdomain: guestData.subdomain || '',
            event_date: guestData.event_date || new Date().toISOString().split('T')[0]
        };

        const res = await fetch(`${SB_URL}/rest/v1/tamu`, {
            method: 'POST',
            headers: { ...SB_HEADERS, 'Prefer': 'return=minimal' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(`Insert failed: ${res.status}`);
    }

    async function syncUpdate(ssId, kode, updates) {
        const res = await fetch(
            `${SB_URL}/rest/v1/tamu?ssid=eq.${ssId}&kode=eq.${kode}`,
            {
                method: 'PATCH',
                headers: { ...SB_HEADERS, 'Prefer': 'return=minimal' },
                body: JSON.stringify(updates)
            }
        );

        if (!res.ok) throw new Error(`Update failed: ${res.status}`);
    }

    async function syncDelete(ssId, kode) {
        const res = await fetch(
            `${SB_URL}/rest/v1/tamu?ssid=eq.${ssId}&kode=eq.${kode}`,
            {
                method: 'DELETE',
                headers: SB_HEADERS
            }
        );

        if (!res.ok && res.status !== 204) throw new Error(`Delete failed: ${res.status}`);
    }

    async function syncUpdateStatus(ssId, kode, data) {
        const res = await fetch(
            `${SB_URL}/rest/v1/tamu?ssid=eq.${ssId}&kode=eq.${kode}`,
            {
                method: 'PATCH',
                headers: { ...SB_HEADERS, 'Prefer': 'return=minimal' },
                body: JSON.stringify(data)
            }
        );

        if (!res.ok) throw new Error(`Status update failed: ${res.status}`);
    }

    // ── Sync Print Queue ──
    async function syncPrintQueue() {
        if (!isOnline) return;

        const waiting = await OfflineDB.printQueue.getWaiting();
        for (const item of waiting) {
            // Mark done in IndexedDB
            await OfflineDB.printQueue.markDone(item.op_id);

            // Sync to Supabase
            try {
                const session = await OfflineDB.auth.get();
                if (session?.ssId) {
                    await fetch(
                        `${SB_URL}/rest/v1/tamu?ssid=eq.${session.ssId}&kode=eq.${item.guest_kode}`,
                        {
                            method: 'PATCH',
                            headers: { ...SB_HEADERS, 'Prefer': 'return=minimal' },
                            body: JSON.stringify({ print_queue: 'DONE' })
                        }
                    );
                }
            } catch (err) {
                console.warn('[SyncEngine] Print queue sync failed:', err);
            }
        }
    }

    // ── Load Data from Server ──
    async function pullFromServer() {
        if (!isOnline) return null;

        const session = await OfflineDB.auth.get();
        if (!session?.ssId) return null;

        try {
            // Pull guests
            const res = await fetch(
                `${SB_URL}/rest/v1/tamu?ssid=eq.${session.ssId}&order=row.desc`,
                { headers: SB_HEADERS }
            );

            if (!res.ok) throw new Error('Pull failed');
            const guests = await res.json();

            // Save to IndexedDB
            await OfflineDB.guests.saveBulk(guests.map(g => ({
                kode: g.kode,
                nama: g.nama,
                whatsapp: g.whatsapp,
                kategori: g.kategori,
                pihakPengundang: g.pihak_pengundang,
                souvenir: g.souvenir,
                alamat: g.alamat,
                rencanaHadir: g.rencana_hadir,
                sesi: g.sesi,
                statusWA: g.status_wa,
                statusHadir: g.status_hadir,
                jamDatang: g.jam_datang,
                realHadir: g.real_hadir,
                row: g.row,
                event_date: g.event_date
            })));

            // Pull metadata
            const metaRes = await fetch(
                `${SB_URL}/rest/v1/metadata_client?ssid=eq.${session.ssId}&select=*`,
                { headers: SB_HEADERS }
            );

            if (metaRes.ok) {
                const metaData = await metaRes.json();
                if (metaData.length > 0) {
                    await OfflineDB.metadata.save(metaData[0]);
                }
            }

            console.log(`[SyncEngine] Pulled ${guests.length} guests from server`);
            return guests;
        } catch (err) {
            console.error('[SyncEngine] Pull error:', err);
            return null;
        }
    }

    // ── Auto Sync ──
    function startAutoSync() {
        if (syncInterval) clearInterval(syncInterval);
        syncInterval = setInterval(() => {
            if (isOnline && !isSyncing) {
                triggerSync();
                syncPrintQueue();
            }
        }, 30000); // Every 30 seconds
    }

    function stopAutoSync() {
        if (syncInterval) {
            clearInterval(syncInterval);
            syncInterval = null;
        }
    }

    // ── Full Bootstrap (first login) ──
    async function bootstrap(ssId, username, subdomain) {
        // 1. Save auth
        await OfflineDB.auth.save(ssId, username, subdomain);

        // 2. Pull all data from server
        await pullFromServer();

        console.log('[SyncEngine] Bootstrap complete');
    }

    // ── Public API ──
    return {
        init,
        triggerSync,
        pullFromServer,
        bootstrap,
        startAutoSync,
        stopAutoSync,
        isOnline: () => isOnline,
        isSyncing: () => isSyncing
    };
})();

window.SyncEngine = SyncEngine;
