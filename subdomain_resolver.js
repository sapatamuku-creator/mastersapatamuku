/**
 * SAPATAMU.KU - GLOBAL SUBDOMAIN RESOLVER (VERSI SEDERHANA v1.4)
 */

window.SAPATAMU_RESOLVED = false;
window.CURRENT_SS_ID = null;
window.SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzJJxmhqjS_gZ7xdS98-13alRxnbTUHSKROyvfjmVoagl9zu1PTgQay2oW5k4oOzeI5/exec";

async function resolveSapatamuSubdomain() {
    console.log("Resolving subdomain...");
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    
    // 1. TRANSFER DATA DARI URL (Bekal Login)
    const _urlParams = new URLSearchParams(window.location.search);
    const _urlSsid = _urlParams.get('ssId');
    const _urlUser = _urlParams.get('user');

    if (_urlSsid && _urlUser) {
        console.log("Bekal login ditemukan di URL, membongkar...");
        localStorage.setItem('sapatamu_db', JSON.stringify({ ssId: _urlSsid, username: _urlUser }));
        window.CURRENT_SS_ID = _urlSsid;
        // Bersihkan URL tanpa reload
        const _newUrl = new URL(window.location.href);
        _newUrl.searchParams.delete('ssId');
        _newUrl.searchParams.delete('user');
        window.history.replaceState({}, '', _newUrl);
    }

    // 2. CEK STORAGE LOKAL JIKA DI SUBDOMAIN
    if (hostname !== "sapatamu.id" && hostname !== "www.sapatamu.id") {
        const _localData = localStorage.getItem('sapatamu_db');
        if (_localData) {
            try {
                const _parsed = JSON.parse(_localData);
                if (_parsed.ssId) {
                    window.CURRENT_SS_ID = _parsed.ssId;
                    console.log("Sesi lokal ditemukan:", _parsed.username);
                }
            } catch(e) {}
        }
        
        // 3. FETCH KE SERVER JIKA MASIH KOSONG
        if (!window.CURRENT_SS_ID && parts.length >= 3 && parts[0] !== 'www') {
            const sub = parts[0].toLowerCase();
            try {
                const response = await fetch(window.SCRIPT_URL, {
                    method: "POST",
                    body: JSON.stringify({ action: "resolveSubdomain", subdomain: sub })
                });
                const res = await response.json();
                if (res.status === "success") {
                    window.CURRENT_SS_ID = res.ssId;
                    console.log("Subdomain Resolved dari Server:", sub);
                }
            } catch (e) {
                console.error("Gagal resolve dari server:", e);
            }
        }
    }

    // 4. SATPAM AKHIR: Jika masih kosong di subdomain, tendang ke login
    if (!window.CURRENT_SS_ID) {
        console.warn("Akses ditolak: Tidak ada sesi valid.");
        window.location.replace("https://sapatamu.id/login.html");
        return null;
    }

    console.log("Resolution Complete. ID:", window.CURRENT_SS_ID);
    window.SAPATAMU_RESOLVED = true;
    return window.CURRENT_SS_ID;
}

// Jalankan otomatis
resolveSapatamuSubdomain();
