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
    window.togglePasswordVisibility = window.togglePasswordVisibility || function(inputId, buttonEl) {
        const input = document.getElementById(inputId);
        if (!input) return;
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        if (isPassword) {
            buttonEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 20px; height: 20px; display: inline;"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>`;
            buttonEl.setAttribute('aria-label', 'Sembunyikan password');
        } else {
            buttonEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 20px; height: 20px; display: inline;"><path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>`;
            buttonEl.setAttribute('aria-label', 'Tampilkan password');
        }
    };

    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyFwzgwpC8RAup_73Qi4BaP8n2cBDASntsPXxtVyxg0cXwAMeLiNMivgyie7nCly0Q/exec";
    const SB_URL = "https://llrapesaaoliyjrrrsjh.supabase.co";
    const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxscmFwZXNhYW9saXlqcnJyc2poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNzU2ODUsImV4cCI6MjA5NDc1MTY4NX0.rZPCxRQmjb3SyimYDokgm1R1u2QSqj3iBv0gGEEteII";
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
        // Kembalikan undefined jika tidak ada role (sesi lama sebelum RBAC)
        // Guard hanya aktif jika role EKSPLISIT: 'client' atau 'usher'
        return getSession().role || undefined;
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
                <div style="position: relative; width: 100%; margin-bottom: 16px;">
                    <input type="password" id="sapa-admin-pass-input" placeholder="••••••" 
                        onkeydown="if(event.key==='Enter') SapaGuard.verifyAdmin()" style="margin-bottom: 0; padding-right: 48px;">
                    <button type="button" onclick="togglePasswordVisibility('sapa-admin-pass-input', this)" class="sapa-guard-exempt" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); background: none; border: none; padding: 0; cursor: pointer; color: #8C7560; display: flex; align-items: center; justify-content: center; outline: none;" aria-label="Tampilkan password">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 20px; height: 20px; display: inline;">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                    </button>
                </div>
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

    // ─── Public API ────────────────────────────────────────────────────────
    window.SapaGuard = {
        apply: function (mode) {
            window.SAPAGUARD_MODE = mode;
            if (mode === 'field')     applyFieldGuard();
            if (mode === 'sensitive') applySensitiveGuard();
        },
        getRole: getRole,
        isRestricted: function() {
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
                // ─── JALUR UTAMA: SUPABASE REST API ───
                const sbUrl = `${SB_URL}/rest/v1/clients?username=eq.admin_global&select=password`;
                const sbRes = await fetch(sbUrl, {
                    method: "GET",
                    headers: {
                        "apikey": SB_KEY,
                        "Authorization": `Bearer ${SB_KEY}`
                    }
                });

                if (!sbRes.ok) {
                    throw new Error("Supabase request failed, falling back to Google Sheets.");
                }

                const data = await sbRes.json();
                const adminGlobal = data[0];

                if (!adminGlobal || pass !== adminGlobal.password) {
                    // Coba fallback ke GAS untuk berjaga-jaga jika ada keterlambatan sync data
                    throw new Error("Incorrect local password check");
                }

                // Sukses verifikasi admin via Supabase!
                upgradeRoleToUsher();
                const overlay = document.getElementById('sapa-guard-overlay');
                const modal = document.getElementById('sapa-admin-modal');
                if (overlay) overlay.remove();
                if (modal) modal.remove();
                document.querySelectorAll('button, input, textarea, select').forEach(el => {
                    el.disabled = false;
                    el.style.cursor = '';
                });

            } catch (err) {
                console.warn("Jalur utama Supabase gagal, beralih ke cadangan GAS Spreadsheet: ", err);

                // ─── JALUR CADANGAN: GOOGLE SPREADSHEET (GAS) ───
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
            }
            btn.disabled = false;
            btn.innerText = 'Konfirmasi';
        }
    };
})();
