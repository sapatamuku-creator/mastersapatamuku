/**
 * SAPATAMU.KU - GLOBAL SUBDOMAIN RESOLVER
 * Menangani deteksi subdomain dan mapping ke Spreadsheet ID secara otomatis.
 * Mendukung Multi-User (Akses Paralel) via Sesi Per-Perangkat.
 */

window.SAPATAMU_RESOLVED = false;
window.CURRENT_SS_ID = new URLSearchParams(window.location.search).get('ssId');

// AGGRESSIVE CLEANUP: Jika di domain utama, hapus ssId dari URL segera
const _hostname = window.location.hostname;
if ((_hostname === "sapatamu.id" || _hostname === "www.sapatamu.id") && window.CURRENT_SS_ID) {
    const _newUrl = new URL(window.location.href);
    _newUrl.searchParams.delete('ssId');
    window.history.replaceState({}, '', _newUrl);
}

window.SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzKOapV7HR2QV3cRZotSNQzvKEO7vPSMTYo43VI2cj7iYdholUFt1CIkweQhVFW_Dzs/exec";

async function resolveSapatamuSubdomain() {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    
    // ABAIKAN JIKA DI DOMAIN UTAMA (sapatamu.id atau www.sapatamu.id)
    if (hostname === "sapatamu.id" || hostname === "www.sapatamu.id") {
        window.SAPATAMU_RESOLVED = true;
        return null;
    }

    // Jika ada ssId di URL (jarang terjadi sekarang), gunakan itu langsung
    if (window.CURRENT_SS_ID) {
        window.SAPATAMU_RESOLVED = true;
        return window.CURRENT_SS_ID;
    }

    // Deteksi Subdomain (misal: clara.sapatamu.id)
    if (parts.length >= 3 && parts[0] !== 'www') {
        const sub = parts[0].toLowerCase();
        
        // AMBIL KREDENSIAL LOKAL (KUNCI INDIVIDU)
        const localData = localStorage.getItem('sapatamu_db');
        let auth = { username: "", password: "" };
        if (localData) {
            try {
                const parsed = JSON.parse(localData);
                auth.username = parsed.username || "";
                auth.password = parsed.password || "";
            } catch(e) {}
        }

        // Cek cache sesi agar tidak hit server terus menerus
        const cachedId = sessionStorage.getItem('resolved_ssid_' + sub);
        if (cachedId) {
            window.CURRENT_SS_ID = cachedId;
        } else {
            try {
                const response = await fetch(SCRIPT_URL, {
                    method: "POST",
                    body: JSON.stringify({ 
                        action: "resolveSubdomain", 
                        subdomain: sub,
                        username: auth.username,
                        password: auth.password
                    })
                });
                const res = await response.json();
                if (res.status === "success") {
                    window.CURRENT_SS_ID = res.ssId;
                    sessionStorage.setItem('resolved_ssid_' + sub, res.ssId);
                    console.log("Subdomain Verified Individually:", sub);
                } else {
                    // Jika gagal atau butuh login
                    console.warn("Akses Ditolak:", res.message);
                    window.location.replace("https://sapatamu.id/login.html");
                    return;
                }
            } catch (e) {
                console.error("Gagal verifikasi sesi:", e);
            }
        }
    }

    window.SAPATAMU_RESOLVED = true;
    return window.CURRENT_SS_ID;
}

// Inisialisasi Otomatis
resolveSapatamuSubdomain();
