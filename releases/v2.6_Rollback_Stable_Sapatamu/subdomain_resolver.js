/**
 * SAPATAMU.KU - GLOBAL SUBDOMAIN RESOLVER (VERSI SEDERHANA v1.5)
 */

window.SAPATAMU_RESOLVED = false;
window.CURRENT_SS_ID = null;
window.SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz5zBOJIO-b0MP-oqWhIUehqQaPbQt5pK9cMpTOYlj1pyT19LFD4VwynyJt_EAayBE/exec";

async function resolveSapatamuSubdomain() {
    console.log("Resolving subdomain...");
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    const isMainDomain = (hostname === "sapatamu.id" || hostname === "www.sapatamu.id");

    // 0. DETEKSI MODE DEMO DARI URL
    const _urlParams = new URLSearchParams(window.location.search);
    const _urlDemo = _urlParams.get('demo') === 'true' || _urlParams.get('triggerDemo') === 'true';
    const _urlPkg = _urlParams.get('pkg');
    if (_urlDemo) {
        console.log("Demo session detected in URL. Package:", _urlPkg);
        const demoSession = {
            ssId: "1URVle0-ptX2kyxR99E6HJruIkwuwcE5zES4k8BYnoJU",
            username: "akundemo",
            client_name: "Akun Demo SapaTamu",
            category: "wedding",
            package: _urlPkg || "Bronze Guestbook",
            role: "client",
            is_demo: true,
            demo_started_at: new Date().toISOString()
        };
        localStorage.setItem('sapatamu_db', JSON.stringify(demoSession));
        sessionStorage.setItem('sapatamu_session', JSON.stringify(demoSession));

        window.CURRENT_SS_ID = demoSession.ssId;
        window.CURRENT_CATEGORY = demoSession.category;
        window.SAPATAMU_RESOLVED = true;

        if (_urlPkg) {
            // Update package in the backend (Spreadsheet and Supabase) asynchronously
            fetch(window.SCRIPT_URL, {
                method: "POST", mode: "cors",
                body: JSON.stringify({ action: "upgradePackage", username: "akundemo", newPackage: _urlPkg })
            }).catch(e => console.error("Gagal update package demo di backend", e));
        }

        // Bersihkan parameter demo & pkg dari URL tanpa reload
        const _newUrl = new URL(window.location.href);
        _newUrl.searchParams.delete('demo');
        _newUrl.searchParams.delete('pkg');
        window.history.replaceState({}, '', _newUrl);

        return demoSession.ssId;
    }

    // 1. TRANSFER DATA DARI URL
    const _urlSsid = _urlParams.get('ssId');
    const _urlUser = _urlParams.get('user');
    const _urlRole = _urlParams.get('role'); // RBAC: baca role dari URL

    if (_urlSsid) {
        console.log("ID Spreadsheet ditemukan di URL:", _urlSsid);
        window.CURRENT_SS_ID = _urlSsid;

        // Simpan ke storage jika ada data user/kategori
        if (_urlUser) {
            const _urlCat = _urlParams.get('category') || "wedding";
            // Preserve role jika ada di URL, jika tidak ambil dari storage lama
            const _existingRole = _urlRole || (function () {
                try { return JSON.parse(localStorage.getItem('sapatamu_db'))?.role; } catch (e) { return undefined; }
            })();
            const _sessionData = { ssId: _urlSsid, username: _urlUser, category: _urlCat };
            if (_existingRole) _sessionData.role = _existingRole;
            localStorage.setItem('sapatamu_db', JSON.stringify(_sessionData));
            sessionStorage.setItem('sapatamu_session', JSON.stringify(_sessionData));
            window.CURRENT_CATEGORY = _urlCat;
        }

        // Bersihkan URL tanpa reload
        const _newUrl = new URL(window.location.href);
        if (_urlUser) {
            _newUrl.searchParams.delete('ssId');
            _newUrl.searchParams.delete('user');
            _newUrl.searchParams.delete('category');
            _newUrl.searchParams.delete('role');
            window.history.replaceState({}, '', _newUrl);
        }
    }

    // 2. PROSES SUBDOMAIN
    if (!isMainDomain) {
        // Cek storage lokal subdomain ini
        const _localData = localStorage.getItem('sapatamu_db');
        if (_localData) {
            try {
                const _parsed = JSON.parse(_localData);
                // ✅ FIX: Validasi username - harus berupa slug valid (hanya huruf kecil & angka)
                // Jika tidak valid (misal "Meri & Rosid"), paksa re-fetch dari Supabase
                const isValidSlug = /^[a-z0-9]+$/.test(_parsed.username || '');
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
            try {
                const sbRes = await fetch(
                    `https://llrapesaaoliyjrrrsjh.supabase.co/rest/v1/client_public_profile?subdomain=eq.${sub}&select=ssid,client_name,category,package`,
                    {
                        headers: {
                            "apikey": "sb_publishable_414hQDyPBaFi0fnzmIKyZw_Iwa09Q0u",
                            "Authorization": "Bearer sb_publishable_414hQDyPBaFi0fnzmIKyZw_Iwa09Q0u"
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
                        if (_existRole) _resolvedData.role = _existRole;
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
        // KECUALI untuk halaman publik (undangan, welcome, worker)
        const publicPages = ["undangan.html", "welcome.html", "worker.html", "invitation.html", "rsvp.html"];
        const isPublicPage = publicPages.some(page => window.location.pathname.includes(page));

        if (!window.CURRENT_SS_ID && !isPublicPage) {
            console.warn("Akses ditolak: Tidak ada sesi valid di subdomain ini.");
            window.location.replace("https://sapatamu.id/login.html");
            return null;
        }
    }

    console.log("Resolution Complete. Domain:", hostname, "ID:", window.CURRENT_SS_ID);
    window.SAPATAMU_RESOLVED = true;
    return window.CURRENT_SS_ID;
}

// Jalankan otomatis
resolveSapatamuSubdomain();
