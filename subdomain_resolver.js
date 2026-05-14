/**
 * SAPATAMU.KU - GLOBAL SUBDOMAIN RESOLVER (VERSI SEDERHANA)
 */

window.SAPATAMU_RESOLVED = false;
window.CURRENT_SS_ID = null;
window.SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxJJxmhqjS_gZ7xdS98-13alRxnbTUHSKROyvfjmVoagl9zu1PTgQay2oW5k4oOzeI5/exec";

async function resolveSapatamuSubdomain() {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    
    // AGGRESSIVE CLEANUP & TRANSFER: Ambil data dari URL jika ada
    const _urlParams = new URLSearchParams(window.location.search);
    const _urlSsid = _urlParams.get('ssId');
    const _urlUser = _urlParams.get('user');

    if (_urlSsid && _urlUser) {
        // Simpan ke storage subdomain ini
        localStorage.setItem('sapatamu_db', JSON.stringify({ ssId: _urlSsid, username: _urlUser }));
        window.CURRENT_SS_ID = _urlSsid;
        // Bersihkan URL agar rapi
        const _newUrl = new URL(window.location.href);
        _newUrl.searchParams.delete('ssId');
        _newUrl.searchParams.delete('user');
        window.history.replaceState({}, '', _newUrl);
    }

    const _hostname = window.location.hostname;
    if ((_hostname === "sapatamu.id" || _hostname === "www.sapatamu.id")) {
        window.SAPATAMU_RESOLVED = true;
        return null;
    }

    // Jika sudah dapat dari URL, tidak perlu fetch
    if (window.CURRENT_SS_ID) {
        window.SAPATAMU_RESOLVED = true;
        return window.CURRENT_SS_ID;
    }

    // Jika tidak ada di URL, cek di storage lokal subdomain ini
    const _localData = localStorage.getItem('sapatamu_db');
    if (_localData) {
        try {
            const _parsed = JSON.parse(_localData);
            if (_parsed.ssId) {
                window.CURRENT_SS_ID = _parsed.ssId;
                window.SAPATAMU_RESOLVED = true;
                return window.CURRENT_SS_ID;
            }
        } catch(e) {}
    }

    // Deteksi Subdomain (misal: clara.sapatamu.id)
    if (parts.length >= 3 && parts[0] !== 'www') {
        const sub = parts[0].toLowerCase();
        
        try {
            const response = await fetch(window.SCRIPT_URL, {
                method: "POST",
                body: JSON.stringify({ action: "resolveSubdomain", subdomain: sub })
            });
            const res = await response.json();
            if (res.status === "success") {
                window.CURRENT_SS_ID = res.ssId;
                console.log("Subdomain Resolved:", sub);
            } else {
                console.warn("Subdomain tidak valid, arahkan ke login.");
                window.location.replace("https://sapatamu.id/login.html");
                return;
            }
        } catch (e) {
            console.error("Gagal resolve:", e);
        }
    }

    window.SAPATAMU_RESOLVED = true;
    return window.CURRENT_SS_ID;
}

resolveSapatamuSubdomain();
