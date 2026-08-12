/**
 * SAPATAMU.KU - GLOBAL SUBDOMAIN RESOLVER (VERSI SEDERHANA v1.5)
 */

window.SAPATAMU_RESOLVED = false;
window.CURRENT_SS_ID = null;
window.SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz5zBOJIO-b0MP-oqWhIUehqQaPbQt5pK9cMpTOYlj1pyT19LFD4VwynyJt_EAayBE/exec";

// SECURITY: URL parameter validation helpers
const VALID_CATEGORIES = ['wedding', 'birthday', 'anniversary', 'corporate', 'gathering'];
function validateSsId(val) {
  // Google Spreadsheet ID: alphanumeric, hyphens, underscores, 20-60 chars
  return val && /^[a-zA-Z0-9_-]{20,60}$/.test(val) ? val : null;
}
function validateUsername(val) {
  // Username: lowercase alphanumeric, 3-50 chars
  return val && /^[a-z0-9]{3,50}$/.test(val) ? val : null;
}
function validateCategory(val) {
  return val && VALID_CATEGORIES.includes(val.toLowerCase()) ? val.toLowerCase() : 'wedding';
}

async function resolveSapatamuSubdomain() {
    console.log("Resolving subdomain...");
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    const isMainDomain = (hostname === "sapatamu.id" || hostname === "www.sapatamu.id");



    // 0. DETEKSI MODE DEMO DARI URL
    const _urlParams = new URLSearchParams(window.location.search);
    const _urlDemo = _urlParams.get('demo') === 'true' || _urlParams.get('triggerDemo') === 'true';
    if (_urlDemo) {
        console.log("Demo session detected in URL.");
        // SECURITY: Demo mode hanya untuk akun demo yang sudah ditentukan
        // Tidak bisa manipulate package atau data lain via URL
        const demoSession = {
            ssId: "1URVle0-ptX2kyxR99E6HJruIkwuwcE5zES4k8BYnoJU",
            username: "akundemo",
            client_name: "Akun Demo SapaTamu",
            category: "wedding",
            package: "Bronze Guestbook", // FIXED: tidak bisa diubah via URL
            role: "client",
            is_demo: true,
            demo_started_at: new Date().toISOString()
        };
        localStorage.setItem('sapatamu_db', JSON.stringify(demoSession));
        sessionStorage.setItem('sapatamu_session', JSON.stringify(demoSession));

        window.CURRENT_SS_ID = demoSession.ssId;
        window.CURRENT_CATEGORY = demoSession.category;
        window.SAPATAMU_RESOLVED = true;

        // Bersihkan parameter demo dari URL tanpa reload
        const _newUrl = new URL(window.location.href);
        _newUrl.searchParams.delete('demo');
        _newUrl.searchParams.delete('triggerDemo');
        _newUrl.searchParams.delete('pkg');
        window.history.replaceState({}, '', _newUrl);

        return demoSession.ssId;
    }

    // 1. TRANSFER DATA DARI URL
    const _urlSsid = _urlParams.get('ssId');
    const _urlUser = _urlParams.get('user');

    if (_urlSsid) {
        // SECURITY: Validasi ssId sebelum digunakan
        const validSsId = validateSsId(_urlSsid);
        if (!validSsId) {
            console.warn("Invalid ssId parameter rejected");
        } else {
            window.CURRENT_SS_ID = validSsId;

            // Simpan ke storage jika ada data user/kategori
            if (_urlUser) {
                const validUser = validateUsername(_urlUser);
                const validCat = validateCategory(_urlParams.get('category'));
                if (!validUser) {
                    console.warn("Invalid username parameter rejected:", _urlUser);
                } else {
                    // Simpan role dari URL (jika baru login) atau pertahankan role yang ada
                    const _urlRole = _urlParams.get('role');
                    const _existingRole = (function () {
                        try { return JSON.parse(localStorage.getItem('sapatamu_db'))?.role; } catch (e) { return undefined; }
                    })();
                    const _sessionRole = _urlRole || _existingRole || 'client';
                    const _sessionData = { ssId: validSsId, username: validUser, category: validCat, role: _sessionRole };
                    localStorage.setItem('sapatamu_db', JSON.stringify(_sessionData));
                    sessionStorage.setItem('sapatamu_session', JSON.stringify(_sessionData));
                    window.CURRENT_CATEGORY = validCat;
                }
            }

            // Bersihkan URL tanpa reload
            const _newUrl = new URL(window.location.href);
            _newUrl.searchParams.delete('ssId');
            _newUrl.searchParams.delete('user');
            _newUrl.searchParams.delete('category');
            _newUrl.searchParams.delete('role');
            window.history.replaceState({}, '', _newUrl);
        }
    }

    // 1.5. CHECK FOR SORTIR SUBDOMAIN
    const isSortirSubdomain = (parts.length >= 3 && parts.includes('sortir')) || (_urlParams.get('subdomain') === 'sortir');
    if (isSortirSubdomain) {
        window.IS_SORTIR = true;
        console.log("Sortir subdomain detected");
        const path = window.location.pathname.toLowerCase();
        
        if (path === '/owner' || path === '/owner.html' || path === '/sortir_owner.html') {
            if (!window.location.pathname.includes('sortir_owner.html')) {
                window.location.replace('/sortir_owner.html');
            }
            window.SAPATAMU_RESOLVED = true;
            return null;
        }
        
        if (path === '/login' || path === '/login.html' || path === '/sortir_login.html') {
            if (!window.location.pathname.includes('sortir_login.html')) {
                window.location.replace('/sortir_login.html');
            }
            window.SAPATAMU_RESOLVED = true;
            return null;
        }

        if (path === '/register' || path === '/register.html' || path === '/sortir_register.html') {
            if (!window.location.pathname.includes('sortir_register.html')) {
                window.location.replace('/sortir_register.html');
            }
            window.SAPATAMU_RESOLVED = true;
            return null;
        }
        
        if (path === '/dashboard' || path === '/dashboard.html' || path === '/sortir_dashboard.html') {
            if (!window.location.pathname.includes('sortir_dashboard.html')) {
                window.location.replace('/sortir_dashboard.html');
            }
            window.SAPATAMU_RESOLVED = true;
            return null;
        }

        if (path === '/' || path === '/index.html') {
            const vendorSession = localStorage.getItem('sortir_vendor_session');
            if (vendorSession) {
                window.location.replace('/sortir_dashboard.html');
            } else {
                window.location.replace('/sortir_login.html');
            }
            window.SAPATAMU_RESOLVED = true;
            return null;
        }

        // If it's a slug path (e.g. /wedding-ryan-andin)
        if (!window.location.pathname.includes('sortir_culling.html') && !window.location.pathname.includes('.')) {
            const slug = window.location.pathname.substring(1);
            if (slug && slug !== 'favicon.ico') {
                window.location.replace('/sortir_culling.html?event=' + slug);
            }
        }
        
        window.SAPATAMU_RESOLVED = true;
        return null;
    }

    // 2. PROSES SUBDOMAIN
    if (!isMainDomain) {
        // Cek storage lokal subdomain ini
        const _localData = localStorage.getItem('sapatamu_db');
        if (_localData) {
            try {
                const _parsed = JSON.parse(_localData);
                // ✅ FIX: Validasi username/subdomain slug - hanya huruf kecil, angka, & tanda hubung (-)
                const isValidSlug = /^[a-z0-9-]+$/.test(_parsed.username || '');
                if (_parsed.ssId && isValidSlug) {
                    window.CURRENT_SS_ID = _parsed.ssId;
                    window.CURRENT_CATEGORY = _parsed.category || "wedding";
                    console.log("Sesi lokal ditemukan:", _parsed.username, "Kategori:", window.CURRENT_CATEGORY);
                } else if (_parsed.ssId && !isValidSlug) {
                    console.warn("[Resolver] Username tidak valid di localStorage:", _parsed.username, "→ Paksa re-resolve dari Supabase");
                    // Biarkan ssId tidak diset → resolver akan re-fetch
                }
            } catch (e) { }
        }

        // Fetch SSID jika masih kosong setelah cek localStorage
        if (!window.CURRENT_SS_ID && parts.length >= 3 && parts[0] !== 'www') {
            const sub = parts[0].toLowerCase();

            // ===== STEP 1: Supabase view (PRIMARY — cepat ~200ms, tanpa cold start) =====
            let resolvedFromSupabase = false;
            const sbUrl = (typeof SB_URL !== 'undefined') ? SB_URL : (window.SB_URL || '');
            const sbKey = (typeof SB_KEY !== 'undefined') ? SB_KEY : (window.SB_KEY || '');
            if (sbUrl && sbKey) {
                try {
                    const sbRes = await fetch(
                        `${sbUrl}/rest/v1/client_public_profile?subdomain=eq.${sub}&select=ssid,client_name,category,package`,
                        {
                            headers: {
                                "apikey": sbKey,
                                "Authorization": "Bearer " + sbKey
                            }
                        }
                    );
                    const sbData = await sbRes.json();
                if (Array.isArray(sbData) && sbData.length > 0 && sbData[0].ssid) {
                    window.CURRENT_SS_ID = sbData[0].ssid;
                    window.CURRENT_CATEGORY = sbData[0].category || "wedding";
                    const _existRole = (function () {
                        try { return JSON.parse(localStorage.getItem('sapatamu_db'))?.role; } catch (e) { return undefined; }
                    })();
                    const _isDemoUser = sub === 'akundemo';
                    // ✅ FIX: Gunakan subdomain slug (sub) sebagai username, bukan client_name
                    // client_name = "Meri & Rosid" tidak bisa dipakai utk query ?username=eq.xxx
                    const _resolvedData = { ssId: sbData[0].ssid, username: sub, client_name: sbData[0].client_name || sub, category: window.CURRENT_CATEGORY, package: sbData[0].package || '' };
                    if (_existRole) _resolvedData.role = _existRole;
                    if (_isDemoUser) _resolvedData.is_demo = true;
                    localStorage.setItem('sapatamu_db', JSON.stringify(_resolvedData));
                    sessionStorage.setItem('sapatamu_session', JSON.stringify(_resolvedData));
                    resolvedFromSupabase = true;
                    console.log("Subdomain Resolved via Supabase:", sub, "Paket:", sbData[0].package || '-');

                    // ===== STEP 2: GAS verification (BACKGROUND — fire-and-forget, tidak blokir UI) =====
                    fetch(`${window.SCRIPT_URL}?action=resolveSubdomain&subdomain=${sub}`)
                        .then(r => r.json())
                        .then(res => {
                            if (res.status === "success" && res.ssId && res.ssId !== sbData[0].ssid) {
                                console.warn("[Resolver] SSID mismatch Supabase vs GAS — Supabase:", sbData[0].ssid, "GAS:", res.ssId);
                            }
                        })
                        .catch(() => { }); // silent — tidak pengaruh ke UI
                }
            } catch (e) {
                console.warn("Supabase resolve gagal, mencoba GAS fallback:", e);
            }
            }

            // ===== STEP 3: GAS fallback (hanya jika Supabase gagal) =====
            if (!resolvedFromSupabase) {
                try {
                    const response = await fetch(`${window.SCRIPT_URL}?action=resolveSubdomain&subdomain=${sub}`);
                    const res = await response.json();
                    if (res.status === "success") {
                        window.CURRENT_SS_ID = res.ssId;
                        window.CURRENT_CATEGORY = res.category || "wedding";
                        const _existRole = (function () {
                            try { return JSON.parse(localStorage.getItem('sapatamu_db'))?.role; } catch (e) { return undefined; }
                        })();
                        const _isDemoUser = sub === 'akundemo';
                        // ✅ FIX: Gunakan subdomain slug (sub) sebagai username
                        const _resolvedData = { ssId: res.ssId, username: sub, client_name: res.clientName || sub, category: window.CURRENT_CATEGORY, package: res.package || '' };
                        _resolvedData.role = _existRole || 'client';
                        if (_isDemoUser) _resolvedData.is_demo = true;
                        localStorage.setItem('sapatamu_db', JSON.stringify(_resolvedData));
                        sessionStorage.setItem('sapatamu_session', JSON.stringify(_resolvedData));
                        console.log("Subdomain Resolved via GAS (fallback):", sub);
                    }
                } catch (e) {
                    console.error("GAS fallback juga gagal:", e);
                }
            }
        }

        // 3. SATPAM AKHIR (Hanya di Subdomain): Jika masih kosong, tendang ke login
        // KECUALI untuk halaman publik / auth (undangan, welcome, worker, login)
        const publicPages = ["undangan.html", "welcome.html", "worker.html", "invitation.html", "rsvp.html", "login.html", "login", "guestbook.html", "guestbook"];
        const isPublicPage = publicPages.some(page => window.location.pathname.includes(page));

        if (!window.CURRENT_SS_ID && !isPublicPage) {
            console.warn("Akses ditolak: Tidak ada sesi valid di subdomain ini.");
            window.location.replace("https://sapatamu.id/login.html?reason=unauthenticated");
            return null;
        }
    }

    console.log("Resolution Complete. Domain:", hostname, "ID:", window.CURRENT_SS_ID);
    window.SAPATAMU_RESOLVED = true;
    return window.CURRENT_SS_ID;
}

// Jalankan otomatis
resolveSapatamuSubdomain();
