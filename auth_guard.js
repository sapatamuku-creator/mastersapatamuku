/**
 * auth_guard.js — SapaTamu RBAC Guard
 * =====================================
 * Diinclude di setiap halaman yang dilindungi.
 * Otomatis menerapkan akses berdasarkan role session.
 *
 * USAGE (di bagian <head> atau awal <script> halaman):
 *   <script src="auth_guard.js"></script>
 *   Kemudian di startApp/initApp:
 *     SapaGuard.apply('field');   // untuk kiosk/checkin/onsite/worker
 *     SapaGuard.apply('sensitive'); // untuk formulir/wa_blast/config/angpao
 */

(function () {
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz5zBOJIO-b0MP-oqWhIUehqQaPbQt5pK9cMpTOYlj1pyT19LFD4VwynyJt_EAayBE/exec";
    const SESSION_KEY = 'sapatamu_session';
    const LOCAL_DB = 'sapatamu_db';

    // ─── Baca session & role ───────────────────────────────────────────────
    function getSession() {
        try {
            return JSON.parse(sessionStorage.getItem(SESSION_KEY)) ||
                JSON.parse(localStorage.getItem(LOCAL_DB)) || {};
        } catch (e) { return {}; }
    }

    function getRole() {
        const s = getSession();
        if (s.is_demo || s.username === 'akundemo') return undefined;
        // Kembalikan undefined jika tidak ada role (sesi lama sebelum RBAC)
        // Guard hanya aktif jika role EKSPLISIT: 'client' atau 'usher'
        return s.role || undefined;
    }

    // ─── Upgrade role di session (Switch to Admin) ─────────────────────────
    function upgradeRoleToUsher() {
        const s = getSession();
        s.role = 'usher';
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
        // localStorage juga diupdate agar persistent dalam tab
        localStorage.setItem(LOCAL_DB, JSON.stringify(s));
    }

    // ─── Disable seluruh konten (view-only) ───────────────────────────────
    // NAV SELALU BEBAS: elemen di dalam #nav-scroll / .nav-scroll-container
    // tidak pernah di-disable agar user tetap bisa pindah halaman
    function isInsideNav(el) {
        return el.closest('#nav-scroll') ||
            el.closest('.nav-scroll-container') ||
            el.closest('[id^="nav-"]') ||
            el.classList.contains('nav-link');
    }

    let observer = null;
    function applyViewOnlyContent() {
        const disable = () => {
            // Disable semua button/input/textarea KECUALI:
            // - elemen guard sendiri (overlay, modal, banner)
            // - elemen di dalam nav bar
            // - search input & select (bisa scroll & filter)
            document.querySelectorAll(
                'button:not(.sapa-guard-exempt), input:not(.sapa-guard-exempt), textarea:not(.sapa-guard-exempt)'
            ).forEach(el => {
                const isGuardEl = el.closest('#sapa-guard-overlay') ||
                    el.closest('#sapa-admin-modal') ||
                    el.closest('#sapa-guard-banner');
                const isNavEl = isInsideNav(el);
                // Biarkan search input & select tetap bisa dipakai
                const isSearchInput = el.tagName === 'INPUT' &&
                    (el.id.toLowerCase().includes('search') ||
                        el.classList.contains('sapa-guard-exempt'));
                if (!isGuardEl && !isNavEl && !isSearchInput) {
                    el.disabled = true;
                    el.style.cursor = 'default';
                }
            });
            // Pastikan semua <a> di nav tetap clickable
            document.querySelectorAll('#nav-scroll a, .nav-scroll-container a, .nav-link').forEach(a => {
                a.style.pointerEvents = 'auto';
            });
            // Form submit prevention
            document.querySelectorAll('form').forEach(f => {
                f.addEventListener('submit', e => e.preventDefault(), true);
            });
        };

        const startObserver = () => {
            if (observer) return;
            observer = new MutationObserver(() => {
                observer.disconnect();
                disable();
                observer.observe(document.body, {
                    attributes: true,
                    childList: true,
                    subtree: true,
                    attributeFilter: ['disabled']
                });
            });
            observer.observe(document.body, {
                attributes: true,
                childList: true,
                subtree: true,
                attributeFilter: ['disabled']
            });
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                disable();
                startObserver();
            });
        } else {
            disable();
            startObserver();
        }
    }

    // ─── MODE A: Halaman Lapangan (kiosk/checkin/onsite/worker) ──────────
    // CLIENT: tampilkan overlay warning + Switch to Admin
    // USHER : langsung full access
    function applyFieldGuard() {
        const role = getRole();
        // Hanya terapkan guard jika role EKSPLISIT 'client'
        // Usher → full access | Tidak ada role (sesi lama) → full access (backward compat)
        if (role !== 'client') return;
        // Cegah double-inject jika initApp() dipanggil ulang saat retry SAPATAMU_RESOLVED
        if (document.getElementById('sapa-guard-overlay')) return;

        // Inject CSS
        const style = document.createElement('style');
        style.textContent = `
            #sapa-guard-overlay {
                position: fixed; inset: 0; z-index: 999999;
                background: rgba(74,63,53,0.5);
                backdrop-filter: blur(6px);
                display: flex; align-items: center; justify-content: center;
                animation: sapaFadeIn 0.3s ease;
            }
            #sapa-guard-overlay.dismissed {
                /* Setelah dismiss: overlay hilang sepenuhnya, interaksi diblokir via JS disabled */
                background: transparent;
                backdrop-filter: none;
                pointer-events: none;   /* overlay sendiri tidak blokir klik */
            }
            #sapa-guard-overlay.dismissed #sapa-guard-box { display: none; }
            /* TIDAK ada ::after — nav dan halaman bisa di-scroll/klik sesuai hak */
            #sapa-guard-box {
                background: #fff;
                width: 90%; max-width: 380px;
                border-radius: 35px;
                padding: 45px 35px;
                text-align: center;
                box-shadow: 0 30px 60px rgba(0,0,0,0.2);
                animation: sapaPopIn 0.4s cubic-bezier(0.34,1.56,0.64,1);
            }
            #sapa-guard-box h3 {
                font-family: 'Lora', serif;
                font-size: 20px; font-weight: 700;
                color: #4A3F35; margin: 15px 0 12px;
            }
            #sapa-guard-box p {
                font-size: 13px; color: #8C7560;
                line-height: 1.6; margin-bottom: 30px;
            }
            .sapa-guard-btn-row { display: flex; gap: 10px; }
            .sapa-guard-btn {
                flex: 1; padding: 14px; border-radius: 15px;
                font-weight: 800; font-size: 11px; letter-spacing: 0.5px;
                cursor: pointer; border: none; transition: 0.2s;
            }
            .sapa-guard-btn.secondary {
                background: #F0E6DE; color: #4A3F35;
            }
            .sapa-guard-btn.primary {
                background: #4A3F35; color: #fff;
            }
            .sapa-guard-btn:hover { transform: scale(1.02); }
            /* Admin modal */
            #sapa-admin-modal {
                position: fixed; inset: 0; z-index: 9999999;
                background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);
                display: none; align-items: center; justify-content: center;
            }
            #sapa-admin-modal-box {
                background: #fff; width: 90%; max-width: 340px;
                border-radius: 30px; padding: 40px 30px; text-align: center;
                box-shadow: 0 30px 60px rgba(0,0,0,0.3);
                animation: sapaPopIn 0.3s cubic-bezier(0.34,1.56,0.64,1);
            }
            #sapa-admin-modal-box h3 {
                font-family: 'Lora', serif; font-size: 18px;
                font-weight: 700; color: #4A3F35; margin-bottom: 8px;
            }
            #sapa-admin-modal-box p { font-size: 12px; color: #8C7560; margin-bottom: 20px; }
            #sapa-admin-pass-input {
                width: 100%; padding: 14px 18px; border: 1.5px solid #F0E6DE;
                border-radius: 12px; font-size: 15px; box-sizing: border-box;
                margin-bottom: 16px; text-align: center; letter-spacing: 3px;
                outline: none; font-weight: 700;
            }
            #sapa-admin-pass-input:focus { border-color: #4A3F35; }
            #sapa-admin-err { color: #E07B7B; font-size: 11px; font-weight: 700; min-height: 16px; margin-bottom: 12px; }
            @keyframes sapaFadeIn { from { opacity:0 } to { opacity:1 } }
            @keyframes sapaPopIn { from { transform:scale(0.85); opacity:0 } to { transform:scale(1); opacity:1 } }
        `;
        document.head.appendChild(style);

        // Inject overlay HTML
        const overlay = document.createElement('div');
        overlay.id = 'sapa-guard-overlay';
        overlay.innerHTML = `
            <div id="sapa-guard-box">
                <div style="font-size:48px">⚠️</div>
                <h3>Akses Terbatas</h3>
                <p>Halaman ini hanya dapat dioperasikan oleh <strong>Admin/Usher Sapatamu</strong> yang bertugas.<br><br>Anda dapat melihat halaman ini, namun tidak dapat berinteraksi.</p>
                <div class="sapa-guard-btn-row">
                    <button class="sapa-guard-btn secondary" onclick="SapaGuard.dismissOverlay()">Mengerti</button>
                    <button class="sapa-guard-btn primary" onclick="SapaGuard.showAdminModal()">🔑 Masuk Admin</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Inject admin modal
        const modal = document.createElement('div');
        modal.id = 'sapa-admin-modal';
        modal.innerHTML = `
            <div id="sapa-admin-modal-box">
                <div style="font-size:36px; margin-bottom:10px">🔑</div>
                <h3>Masuk sebagai Admin</h3>
                <p>Masukkan password Admin Sapatamu untuk mengaktifkan halaman ini.</p>
                <input type="password" id="sapa-admin-pass-input" placeholder="••••••" 
                    onkeydown="if(event.key==='Enter') SapaGuard.verifyAdmin()">
                <div id="sapa-admin-err"></div>
                <div class="sapa-guard-btn-row">
                    <button class="sapa-guard-btn secondary" onclick="SapaGuard.hideAdminModal()">Batal</button>
                    <button class="sapa-guard-btn primary" id="sapa-admin-confirm-btn" onclick="SapaGuard.verifyAdmin()">Konfirmasi</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Disable semua interaksi di bawah overlay
        applyViewOnlyContent();
    }

    // ─── MODE B: Halaman Sensitif (formulir/wa_blast/config/angpao) ───────
    // USHER : tampilkan banner VIEW ONLY + disable input/button
    // CLIENT: full access, tidak ada guard
    function applySensitiveGuard() {
        const role = getRole();
        // Hanya terapkan view-only jika role EKSPLISIT 'usher'
        // Client → full access | Tidak ada role (sesi lama) → full access (backward compat)
        if (role !== 'usher') return;
        // Cegah double-inject jika initApp() dipanggil ulang
        if (document.getElementById('sapa-guard-banner')) return;

        // Inject CSS banner
        const style = document.createElement('style');
        style.textContent = `
            #sapa-guard-banner {
                position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
                background: linear-gradient(135deg, #4A3F35, #6B5A4E);
                color: #fff;
                display: flex; align-items: center; justify-content: center;
                gap: 10px; padding: 10px 20px;
                font-size: 11px; font-weight: 800; letter-spacing: 1px;
                text-transform: uppercase;
                box-shadow: 0 4px 20px rgba(74,63,53,0.3);
                animation: sapaFadeIn 0.4s ease;
            }
            #sapa-guard-banner span { opacity: 0.7; font-weight: 600; text-transform: none; letter-spacing: 0; }
            @keyframes sapaFadeIn { from { opacity:0; transform:translateY(-10px) } to { opacity:1; transform:translateY(0) } }
            /* Push konten agar tidak tertutup banner */
            body { padding-top: 44px !important; }
        `;
        document.head.appendChild(style);

        const banner = document.createElement('div');
        banner.id = 'sapa-guard-banner';
        banner.innerHTML = `
            🔒 Mode Lihat Saja
            <span>— Halaman ini tidak dapat diedit oleh Usher/Admin Lapangan</span>
        `;
        document.body.prepend(banner);

        // Disable semua interaksi
        applyViewOnlyContent();
    }

    function isAuthenticated() {
        const s = getSession();
        // Sesi demo dianggap terautentikasi
        if (s.is_demo || s.username === 'akundemo') return true;
        // Sesi operasional harus memiliki role eksplisit client atau usher
        return s.role === 'client' || s.role === 'usher';
    }

    // ─── Public API ────────────────────────────────────────────────────────
    window.SapaGuard = {
        apply: function (mode) {
            window.SAPAGUARD_MODE = mode;
            if (!isAuthenticated()) {
                console.warn("[SapaGuard] Sesi tidak valid atau belum login. Mengarahkan ke login.html...");
                window.location.replace("login.html?reason=unauthenticated");
                return;
            }
            if (mode === 'field') applyFieldGuard();
            if (mode === 'sensitive') applySensitiveGuard();
        },
        getRole: getRole,
        isRestricted: function () {
            const role = getRole();
            return (window.SAPAGUARD_MODE === 'field' && role === 'client') ||
                (window.SAPAGUARD_MODE === 'sensitive' && role === 'usher');
        },

        dismissOverlay: function () {
            const overlay = document.getElementById('sapa-guard-overlay');
            if (overlay) overlay.classList.add('dismissed');
            // Re-apply disable setelah overlay hilang
            applyViewOnlyContent();
        },

        showAdminModal: function () {
            document.getElementById('sapa-admin-modal').style.display = 'flex';
            document.getElementById('sapa-admin-pass-input').value = '';
            document.getElementById('sapa-admin-err').innerText = '';
            setTimeout(() => document.getElementById('sapa-admin-pass-input').focus(), 100);
        },

        hideAdminModal: function () {
            document.getElementById('sapa-admin-modal').style.display = 'none';
        },

        verifyAdmin: async function () {
            const pass = document.getElementById('sapa-admin-pass-input').value;
            const errEl = document.getElementById('sapa-admin-err');
            const btn = document.getElementById('sapa-admin-confirm-btn');

            if (!pass) { errEl.innerText = 'Masukkan password terlebih dahulu.'; return; }

            btn.disabled = true;
            btn.innerText = '...';
            errEl.innerText = '';

            try {
                const res = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'verifyAdminPassword', password: pass })
                });
                const data = await res.json();

                if (data.status === 'success') {
                    // Upgrade session ke usher
                    upgradeRoleToUsher();
                    // Hapus overlay & modal
                    const overlay = document.getElementById('sapa-guard-overlay');
                    const modal = document.getElementById('sapa-admin-modal');
                    if (overlay) overlay.remove();
                    if (modal) modal.remove();
                    // Re-enable semua elemen
                    document.querySelectorAll('button, input, textarea, select').forEach(el => {
                        el.disabled = false;
                        el.style.cursor = '';
                    });
                } else {
                    errEl.innerText = '❌ ' + (data.message || 'Password salah');
                    document.getElementById('sapa-admin-pass-input').value = '';
                    document.getElementById('sapa-admin-pass-input').focus();
                }
            } catch (e) {
                errEl.innerText = '⚠️ Gagal menghubungi server.';
            }
            btn.disabled = false;
            btn.innerText = 'Konfirmasi';
        }
    };

    // ─── Terapkan Proteksi Timeout & Visibility Terpusat ───────────────────
    (function initTimeoutAndVisibility() {
        const path = window.location.pathname.toLowerCase();

        // 1. Tentukan durasi idle berdasarkan halaman (Optimasi Supabase Pooler)
        let idleTimeoutDuration = 2 * 60 * 1000; // Standar 2 Menit (Dashboard & Undangan)

        // Halaman operasional Hari H dengan akses konstan mendapatkan batas atas 60 Menit
        if (
            path.includes('kiosk.html') || 
            path.includes('worker.html') || 
            path.includes('onsite.html') || 
            path.includes('checkin.html') ||
            path.includes('welcome.html')
        ) {
            idleTimeoutDuration = 60 * 60 * 1000; // 60 Menit
        }

        // 2. Pembersihan Koneksi Realtime Supabase Dinamis
        async function cleanupSupabaseConnections() {
            console.warn("[SapaGuard] Mengaktifkan pembersihan koneksi Supabase...");
            const potentialKeys = ['supabaseClient', 'arrivalRealtimeClient', 'supabase'];
            const clientsToClean = [];

            potentialKeys.forEach(key => {
                if (window[key] && typeof window[key].removeAllChannels === 'function') {
                    clientsToClean.push(window[key]);
                }
            });

            for (let key in window) {
                try {
                    if (window[key] && typeof window[key] === 'object' && !potentialKeys.includes(key)) {
                        if (typeof window[key].removeAllChannels === 'function') {
                            clientsToClean.push(window[key]);
                        }
                    }
                } catch (e) { }
            }

            for (const client of clientsToClean) {
                try {
                    await client.removeAllChannels();
                    console.log("[SapaGuard] Realtime channel Supabase berhasil diputus.");
                } catch (err) {
                    console.error("[SapaGuard] Gagal memutuskan channel realtime:", err);
                }
                if (client.auth && typeof client.auth.signOut === 'function') {
                    try {
                        await client.auth.signOut();
                        console.log("[SapaGuard] Berhasil sign out dari Supabase Auth.");
                    } catch (e) {
                        console.error("[SapaGuard] Gagal sign out dari Supabase Auth:", e);
                    }
                }
            }
        }

        // 3. Deteksi Input Belum Disimpan (Mencegah Kehilangan Ketikan di Form)
        function hasUnsavedFormChanges() {
            const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), textarea');
            for (let input of inputs) {
                if (input.value && input.value.trim() !== "" && !input.readOnly && !input.disabled) {
                    return true;
                }
            }
            return false;
        }

        // 3b. Deteksi Proses Aktif (Mencegah idle timeout saat sinkronisasi/impor berjalan)
        function hasActiveProcesses() {
            if (window.isQueueRunning === true) return true;
            if (window.isBusy === true) return true;
            if (window.isProcessing === true) return true;
            if (window.syncQueue && Array.isArray(window.syncQueue) && window.syncQueue.length > 0) return true;
            
            const loadingGlobal = document.getElementById('loading-global');
            if (loadingGlobal && loadingGlobal.style.display !== 'none') return true;
            
            const loadingElement = document.getElementById('loading');
            if (loadingElement && loadingElement.style.display !== 'none') return true;
            
            const globalBlocker = document.getElementById('global-blocker');
            if (globalBlocker) return true;
            
            return false;
        }

        // 4. Pengaktifan Proteksi Idle (Seluruh halaman terikat aturan timeout)
        let idleTimeoutId;

        const handleIdleLogout = async () => {
            if (hasActiveProcesses()) {
                console.log("[SapaGuard] Sesi idle terdeteksi tetapi ada proses berjalan. Menunda logout...");
                resetIdleTimer();
                return;
            }
            console.warn("[SapaGuard] Sesi idle terdeteksi. Membersihkan koneksi & memaksa logout...");
            await cleanupSupabaseConnections();

            // Bersihkan sesi storage
            sessionStorage.clear();
            localStorage.clear();

            // Redirect ke login
            window.location.replace('login.html?reason=idle_timeout');
        };

        const resetIdleTimer = () => {
            clearTimeout(idleTimeoutId);
            if (hasActiveProcesses()) {
                // Jika ada proses berjalan, tunda pengecekan idle berikutnya selama 10 detik
                idleTimeoutId = setTimeout(resetIdleTimer, 10000);
                return;
            }
            idleTimeoutId = setTimeout(handleIdleLogout, idleTimeoutDuration);
        };

        // Event listener aktivitas fisik (pergerakan mouse atau sentuhan/tekan layar)
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        activityEvents.forEach(event => {
            window.addEventListener(event, resetIdleTimer, { passive: true });
        });

        // Event listener custom untuk reset timer secara programmatik (misal: event check-in/wishes realtime)
        window.addEventListener('sapa-activity', resetIdleTimer, { passive: true });

        // Jalankan inisialisasi awal timer
        resetIdleTimer();

        // 5. Page Visibility API (Menghemat koneksi saat tab tidak aktif lebih dari 30 detik)
        let visibilityTimeoutId;
        document.addEventListener('visibilitychange', () => {
            // Pengecualian halaman yang berjalan di latar belakang (seperti WA Blast atau Formulir Tamu)
            // Welcome TV Screen tidak lagi dikecualikan sepenuhnya agar mengikuti 60 menit timeout
            const isExemptFromVisibility = path.includes('wa_blast.html') || path.includes('formulir_tamu.html') || window.SapaExemptVisibility;
            if (isExemptFromVisibility) {
                console.log("[SapaGuard] Halaman dikecualikan dari pemutus koneksi otomatis saat tab tidak aktif.");
                return;
            }

            if (document.hidden) {
                // Jika tab tersembunyi, tunggu 30 detik sebelum memutuskan channel
                visibilityTimeoutId = setTimeout(async () => {
                    await cleanupSupabaseConnections();
                    window.SAPAGUARD_CHANNELS_CLEANED = true;
                    console.log("[SapaGuard] Koneksi disuspensi karena tab tidak aktif lebih dari 30 detik.");
                }, 30000);
            } else {
                clearTimeout(visibilityTimeoutId);
                // Jika koneksi sudah sempat disuspensi, lakukan refresh/restore saat kembali
                if (window.SAPAGUARD_CHANNELS_CLEANED) {
                    window.SAPAGUARD_CHANNELS_CLEANED = false;

                    if (hasUnsavedFormChanges()) {
                        // Tampilkan toast pemberitahuan ramah daripada langsung mereload form terisi
                        const toast = document.createElement('div');
                        toast.id = 'sapa-realtime-warning';
                        toast.style.cssText = 'position:fixed; top:20px; left:50%; transform:translateX(-50%); z-index:999999; background:#FFEBEB; color:#D93838; border:1px solid #FFC4C4; padding:12px 24px; border-radius:30px; font-size:12px; font-weight:700; box-shadow:0 8px 24px rgba(217,56,56,0.15); font-family:sans-serif; display:flex; align-items:center; gap:10px;';
                        toast.innerHTML = '⚠️ Koneksi realtime dijeda. <span style="text-decoration:underline; cursor:pointer;" onclick="window.location.reload()">Refresh Halaman</span> untuk menyambungkan kembali.';
                        document.body.appendChild(toast);
                        setTimeout(() => { if (toast) toast.remove(); }, 10000);
                    } else {
                        console.log("[SapaGuard] Memuat ulang halaman untuk memulihkan koneksi realtime...");
                        window.location.reload();
                    }
                }
            }
        });

        // 6. Teardown koneksi secara instan saat tab ditutup oleh pengguna
        window.addEventListener('beforeunload', () => {
            cleanupSupabaseConnections();
            // Untrack presence saat tab ditutup
            if (window._sapaPresenceChannel) {
                try { window._sapaPresenceChannel.untrack(); } catch(e) {}
            }
        });
    })();

    // ─── Presence Tracking: Daftarkan browser user ke Supabase Realtime ─────
    (function initPresenceTracking() {
        const SB_URL = "https://llrapesaaoliyjrrrsjh.supabase.co";
        const SB_KEY = "sb_publishable_414hQDyPBaFi0fnzmIKyZw_Iwa09Q0u";
        const SESSION_KEY = 'sapatamu_session';
        const LOCAL_DB = 'sapatamu_db';

        // Tunggu sampai subdomain resolver selesai (SAPATAMU_RESOLVED = true)
        // lalu baca sesi. Retry max 30x (tiap 300ms = 9 detik)
        function waitForSession(cb, tries = 0) {
            const resolved = window.SAPATAMU_RESOLVED === true || typeof window.SAPAGUARD_RESOLVED === 'undefined';
            let session = {};
            try {
                session = JSON.parse(sessionStorage.getItem(SESSION_KEY)) ||
                          JSON.parse(localStorage.getItem(LOCAL_DB)) || {};
            } catch(e) {}

            if (resolved) {
                if (!session.username) {
                    const path = window.location.pathname.toLowerCase();
                    const pageName = path.split('/').pop() || 'index.html';
                    const urlParams = new URLSearchParams(window.location.search);
                    const rawGuest = urlParams.get('u') || urlParams.get('nama');
                    
                    if (rawGuest) {
                        session.username = `Tamu: ${decodeURIComponent(rawGuest)}`;
                        session.role = 'guest';
                    } else if (pageName.includes('welcome.html')) {
                        session.username = 'TV Welcome Screen';
                        session.role = 'display';
                    } else if (pageName.includes('landing.html') || pageName === 'index.html' || pageName === '') {
                        session.username = 'Pengunjung Landing';
                        session.role = 'public';
                    } else if (pageName.includes('invitation.html') || pageName.includes('undangan.html')) {
                        session.username = 'Pengunjung Undangan';
                        session.role = 'public';
                    } else if (pageName.includes('formulir_tamu.html')) {
                        session.username = 'Pengisi Buku Tamu';
                        session.role = 'public';
                    } else if (pageName.includes('monitor.html')) {
                        session.username = 'System Monitor';
                        session.role = 'admin';
                    } else if (pageName.includes('login.html')) {
                        session.username = 'Halaman Login';
                        session.role = 'public';
                    } else {
                        const cleanName = pageName.replace('.html', '');
                        session.username = `Public: ${cleanName.charAt(0).toUpperCase() + cleanName.slice(1)}`;
                        session.role = 'public';
                    }
                }
                cb(session);
            } else if (tries < 30) {
                setTimeout(() => waitForSession(cb, tries + 1), 300);
            } else {
                // Fallback jika resolver timeout: tetap daftarkan ke monitor
                if (!session.username) {
                    session.username = 'Pengunjung (Unresolved Subdomain)';
                    session.role = 'public';
                }
                cb(session);
            }
        }

        // Tunggu sampai Supabase SDK siap.
        // Jika SDK belum ada di halaman, inject secara dinamis.
        function waitForSupabaseSDK(cb, tries = 0) {
            if (window.supabase && typeof window.supabase.createClient === 'function') {
                cb();
            } else if (tries === 0) {
                // Cek apakah script CDN sudah ada (tapi belum loaded)
                const existing = document.querySelector('script[src*="supabase-js"]');
                if (!existing) {
                    // Inject CDN dinamis
                    const s = document.createElement('script');
                    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
                    s.onload = () => waitForSupabaseSDK(cb, 1);
                    s.onerror = () => console.error('[SapaPresence] Gagal load Supabase CDN.');
                    document.head.appendChild(s);
                } else {
                    setTimeout(() => waitForSupabaseSDK(cb, tries + 1), 300);
                }
            } else if (tries < 20) {
                setTimeout(() => waitForSupabaseSDK(cb, tries + 1), 300);
            } else {
                console.error('[SapaPresence] Supabase SDK tidak tersedia setelah 6 detik.');
            }
        }

        waitForSession((session) => {
            waitForSupabaseSDK(() => {
                try {
                    const client = window.supabase.createClient(SB_URL, SB_KEY);
                    const pageName = window.location.pathname.split('/').pop() || 'unknown';
                    const presenceKey = `${session.username}_${Date.now()}`;

                    // Join channel 'sapatamu-online'
                    const channel = client.channel('sapatamu-online', {
                        config: { presence: { key: presenceKey } }
                    });

                    channel.subscribe(async (status) => {
                        if (status === 'SUBSCRIBED') {
                            // Track kehadiran user ini
                            await channel.track({
                                username:   session.username || 'unknown',
                                ssid:       session.ssId || session.ssid || '-',
                                role:       session.role || 'client',
                                page:       pageName,
                                is_demo:    session.is_demo || false,
                                joined_at:  new Date().toISOString(),
                                user_agent: navigator.userAgent.substring(0, 80)
                            });
                            console.log('[SapaPresence] Terdaftar di channel sapatamu-online sebagai:', session.username, 'di', pageName);
                        }
                    });

                    // Simpan reference channel ke window agar bisa di-untrack saat tab ditutup
                    window._sapaPresenceChannel = channel;
                    window._sapaPresenceClient = client;

                    // Hanya daftarkan kick listener dan poller untuk role operasional (client/usher)
                    if (session.role === 'client' || session.role === 'usher') {
                        // ── Force-Disconnect Listener ──────────────────────────────────
                        try {
                            const kickChannel = client.channel('sapatamu-kick-signal')
                                .on('broadcast', { event: 'force-disconnect' }, (payload) => {
                                    const target = payload.payload && payload.payload.username;
                                    if (target && target === session.username) {
                                        console.warn('[SapaGuard] Force-disconnect signal diterima dari Monitor!');
                                        _handleForceDisconnect(client);
                                    }
                                })
                                .subscribe();

                            window._sapaKickChannel = kickChannel;
                        } catch(e) {
                            console.error('[SapaPresence] Gagal setup kick listener:', e);
                        }

                        // Juga polling terminated_sessions sebagai fallback (setiap 15 detik)
                        async function checkTerminated() {
                            try {
                                const res = await fetch(
                                    `${SB_URL}/rest/v1/terminated_sessions?username=eq.${encodeURIComponent(session.username)}&limit=1`,
                                    { headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY } }
                                );
                                if (res.ok) {
                                    const rows = await res.json();
                                    if (rows && rows.length > 0) {
                                        console.warn('[SapaGuard] Terdeteksi di terminated_sessions. Force logout!');
                                        _handleForceDisconnect(client);
                                    }
                                }
                            } catch(e) {}
                        }
                        // Cek pertama setelah 5 detik, lalu tiap 15 detik
                        setTimeout(checkTerminated, 5000);
                        window._sapaKickPoller = setInterval(checkTerminated, 15000);
                    }

                } catch(e) {
                    console.error('[SapaPresence] Gagal inisialisasi presence tracking:', e);
                }
            });
        });

        // Handler force disconnect: bersihkan semua & redirect ke login
        async function _handleForceDisconnect(client) {
            clearInterval(window._sapaKickPoller);
            try { if (window._sapaPresenceChannel) await window._sapaPresenceChannel.untrack(); } catch(e) {}
            try { if (client) await client.removeAllChannels(); } catch(e) {}
            sessionStorage.clear();
            localStorage.removeItem('sapatamu_db');
            // Tampilkan notifikasi sebelum redirect
            const msg = document.createElement('div');
            msg.style.cssText = 'position:fixed;inset:0;z-index:9999999;background:rgba(74,63,53,0.92);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;font-family:sans-serif;';
            msg.innerHTML = '<div style="text-align:center;color:#fff;"><div style="font-size:48px;margin-bottom:16px">🔒</div><div style="font-size:20px;font-weight:800;margin-bottom:8px">Sesi Diakhiri</div><div style="font-size:13px;opacity:0.7">Admin memutus koneksi Anda. Anda akan diarahkan ke halaman login.</div></div>';
            document.body.appendChild(msg);
            setTimeout(() => window.location.replace('login.html?reason=force_disconnect'), 2500);
        }
    })();
})();
