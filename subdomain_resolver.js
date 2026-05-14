/**
 * SAPATAMU.KU - GLOBAL SUBDOMAIN RESOLVER (VERSI SEDERHANA v1.5)
 */

window.SAPATAMU_RESOLVED = false;
window.CURRENT_SS_ID = null;
window.SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwNb_E4Vq202Gj1XdKUwiIkTbMKVm1TRn0JcmsxilBkDeAjDUcr44VvayDI-lNmV9Xn/exec";

async function resolveSapatamuSubdomain() {
    console.log("Resolving subdomain...");
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    const isMainDomain = (hostname === "sapatamu.id" || hostname === "www.sapatamu.id");
    
    // 1. TRANSFER DATA DARI URL (Bekal Login)
    const _urlParams = new URLSearchParams(window.location.search);
    const _urlSsid = _urlParams.get('ssId');
    const _urlUser = _urlParams.get('user');

    if (_urlSsid && _urlUser) {
        const _urlCat = _urlParams.get('category') || "wedding";
        console.log("Bekal login ditemukan di URL, membongkar...");
        localStorage.setItem('sapatamu_db', JSON.stringify({ ssId: _urlSsid, username: _urlUser, category: _urlCat }));
        window.CURRENT_SS_ID = _urlSsid;
        window.CURRENT_CATEGORY = _urlCat;
        const _newUrl = new URL(window.location.href);
        _newUrl.searchParams.delete('ssId');
        _newUrl.searchParams.delete('user');
        _newUrl.searchParams.delete('category');
        window.history.replaceState({}, '', _newUrl);
    }

    // 2. PROSES SUBDOMAIN
    if (!isMainDomain) {
        // Cek storage lokal subdomain ini
        const _localData = localStorage.getItem('sapatamu_db');
        if (_localData) {
            try {
                const _parsed = JSON.parse(_localData);
                if (_parsed.ssId) {
                    window.CURRENT_SS_ID = _parsed.ssId;
                    window.CURRENT_CATEGORY = _parsed.category || "wedding";
                    console.log("Sesi lokal ditemukan:", _parsed.username, "Kategori:", window.CURRENT_CATEGORY);
                }
            } catch(e) {}
        }
        
        // Fetch ke server jika masih kosong
        if (!window.CURRENT_SS_ID && parts.length >= 3 && parts[0] !== 'www') {
            const sub = parts[0].toLowerCase();
            try {
                const response = await fetch(`${window.SCRIPT_URL}?action=resolveSubdomain&subdomain=${sub}`);
                const res = await response.json();
                if (res.status === "success") {
                    window.CURRENT_SS_ID = res.ssId;
                    window.CURRENT_CATEGORY = res.category || "wedding";
                    localStorage.setItem('sapatamu_db', JSON.stringify({ ssId: res.ssId, username: res.clientName, category: window.CURRENT_CATEGORY }));
                    console.log("Subdomain Resolved dari Server:", sub);
                }
            } catch (e) {
                console.error("Gagal resolve dari server:", e);
            }
        }

        // 3. SATPAM AKHIR (Hanya di Subdomain): Jika masih kosong, tendang ke login
        if (!window.CURRENT_SS_ID) {
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
