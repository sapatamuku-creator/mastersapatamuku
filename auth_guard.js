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
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbygBaFZE1n36jh8q7ZBICvmPcvVjvIjYKFmf-Gg5XS5F09Sr59SHTSymrLgOTuxcPDA/exec";
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
        return getSession().role || 'client';
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
    function applyViewOnlyContent() {
        // Tunggu DOM siap
        const disable = () => {
            // Disable semua input/button/textarea KECUALI search input & select (boleh)
            document.querySelectorAll(
                'button:not(.sapa-guard-exempt), input:not([type="text"][id*="search"]):not(.sapa-guard-exempt), textarea:not(.sapa-guard-exempt)'
            ).forEach(el => {
                if (!el.closest('#sapa-guard-overlay') &&
                    !el.closest('#sapa-admin-modal') &&
                    !el.closest('#sapa-guard-banner')) {
                    el.disabled = true;
                    el.style.cursor = 'default';
                }
            });
            // Form submit prevention
            document.querySelectorAll('form').forEach(f => {
                f.addEventListener('submit', e => e.preventDefault(), true);
            });
        };
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', disable);
        } else {
            disable();
            // Re-disable setelah render dinamis (delay kecil)
            setTimeout(disable, 1500);
        }
    }

    // ─── MODE A: Halaman Lapangan (kiosk/checkin/onsite/worker) ──────────
    // CLIENT: tampilkan overlay warning + Switch to Admin
    // USHER : langsung full access
    function applyFieldGuard() {
        const role = getRole();
        if (role === 'usher') return; // Usher full access, tidak ada guard

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
                /* Setelah dismiss: overlay tipis pointer-events block di konten */
                background: transparent;
                backdrop-filter: none;
                pointer-events: none;
            }
            #sapa-guard-overlay.dismissed #sapa-guard-box { display: none; }
            #sapa-guard-overlay.dismissed::after {
                content: '';
                position: fixed; inset: 0;
                pointer-events: all;
                z-index: 999998;
            }
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
        if (role !== 'usher') return; // Client full access

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
            if (mode === 'field')     applyFieldGuard();
            if (mode === 'sensitive') applySensitiveGuard();
        },
        getRole: getRole,

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
})();
