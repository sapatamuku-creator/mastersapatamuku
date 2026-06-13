/**
 * SAPATAMU.KU - AUTO SYNC QUEUE SYSTEM (CLIENT-SIDE)
 * Mencegah Google Apps Script Down karena Overload Request Paralel & Kehilangan Sinyal
 */
(function() {
    const QUEUE_KEY = 'sapatamu_sync_queue';
    let isProcessing = false;

    // 1. Ambil antrean dari localStorage
    function getQueue() {
        try {
            return JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];
        } catch(e) {
            return [];
        }
    }

    // 2. Simpan antrean ke localStorage
    function saveQueue(queue) {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        updateQueueIndicator(queue.length);
    }

    // 3. Tambahkan request ke dalam antrean
    function enqueue(url, options) {
        const queue = getQueue();
        
        // Simpan data esensial request agar bisa direkonstruksi nanti
        queue.push({
            id: Date.now() + Math.random().toString(36).substr(2, 5),
            url: url,
            method: options.method || 'POST',
            headers: options.headers || {},
            body: options.body,
            retryCount: 0
        });
        
        saveQueue(queue);
        if (!isProcessing) processQueue();
    }

    // 4. Kirim request antrean satu per satu (Sekuensial)
    async function processQueue() {
        const queue = getQueue();
        if (queue.length === 0) {
            isProcessing = false;
            updateQueueIndicator(0);
            return;
        }

        isProcessing = true;
        const currentReq = queue[0];

        try {
            // Lakukan request asli menggunakan fetch bawaan dengan mode: 'no-cors'
            // untuk mencegah kegagalan CORS karena redirect redirect Google Apps Script
            await window.originalFetch(currentReq.url, {
                method: currentReq.method,
                headers: currentReq.headers,
                body: currentReq.body,
                mode: 'no-cors'
            });

            // Jika fetch tidak melempar error, dianggap sukses (data sudah terkirim ke server)
            const updatedQueue = getQueue().filter(req => req.id !== currentReq.id);
            saveQueue(updatedQueue);
            
            // Berikan jeda 1.5 detik sebelum memproses antrean berikutnya (Rate Limiting)
            setTimeout(processQueue, 1500);
        } catch (err) {
            console.warn("Sync Queue retrying: Gagal mengirim request background GAS. Mencoba lagi...", err);
            
            // Jeda lebih panjang sebelum mencoba ulang jika terjadi kegagalan jaringan (Exponential Backoff)
            setTimeout(processQueue, 5000); 
        }
    }

    // 5. Intercept fungsi fetch global browser
    if (!window.originalFetch) {
        window.originalFetch = window.fetch;
        window.fetch = function(url, options) {
            // Hanya intercept background request GAS (POST no-cors)
            if (options && options.method === 'POST' && options.mode === 'no-cors') {
                try {
                    const payload = JSON.parse(options.body);
                    const interceptActions = ['confirm_checkin', 'broadcastWA', 'uploadSelfie', 'register_new_onsite', 'sendAutomationBlast'];
                    
                    if (interceptActions.includes(payload.action)) {
                        enqueue(url, options);
                        
                        // Kembalikan Promise sukses palsu ke frontend asli agar tidak merusak alur JS utama
                        return Promise.resolve(new Response(JSON.stringify({ status: 'queued' }), {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' }
                        }));
                    }
                } catch (e) {
                    // Jika parser body gagal, jalankan fetch asli
                }
            }
            return window.originalFetch.apply(this, arguments);
        };
    }

    // 6. Tampilkan Indikator Sinkronisasi Latar Belakang yang Elegan
    function updateQueueIndicator(pendingCount) {
        let indicator = document.getElementById('sync-queue-badge');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'sync-queue-badge';
            
            // Inject dynamic style for pulse animation
            if (!document.getElementById('sync-queue-style')) {
                const styleEl = document.createElement('style');
                styleEl.id = 'sync-queue-style';
                styleEl.innerHTML = `
                    @keyframes syncPulse {
                        0% { transform: scale(0.95); opacity: 0.5; }
                        50% { transform: scale(1.1); opacity: 1; }
                        100% { transform: scale(0.95); opacity: 0.5; }
                    }
                `;
                document.head.appendChild(styleEl);
            }

            indicator.style = `
                position: fixed;
                bottom: 80px;
                right: 20px;
                background: rgba(74, 63, 53, 0.95);
                backdrop-filter: blur(10px);
                border: 1px solid var(--border, #F0E6DE);
                color: #FFF9F5;
                padding: 8px 14px;
                border-radius: 30px;
                font-size: 9px;
                font-weight: 800;
                z-index: 99999;
                display: none;
                align-items: center;
                gap: 8px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.15);
                transition: 0.3s;
                font-family: 'Plus Jakarta Sans', sans-serif;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            `;
            document.body.appendChild(indicator);
        }

        if (pendingCount > 0) {
            indicator.style.display = 'flex';
            indicator.innerHTML = `
                <span style="display:inline-block; width:6px; height:6px; background:#C8962E; border-radius:50%; animation:syncPulse 1.5s infinite;"></span>
                Sync Spreadsheet: ${pendingCount} Tamu Mengantre
            `;
        } else {
            indicator.style.display = 'none';
        }
    }

    // Jalankan antrean saat pertama kali aplikasi dibuka jika masih ada sisa antrean
    window.addEventListener('DOMContentLoaded', () => {
        if (getQueue().length > 0) processQueue();
    });
})();
