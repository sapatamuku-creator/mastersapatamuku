/**
 * SAPATAMU.KU - GLOBAL SUBDOMAIN RESOLVER (VERSI SEDERHANA)
 */

window.SAPATAMU_RESOLVED = false;
window.CURRENT_SS_ID = null;
window.SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxJJxmhqjS_gZ7xdS98-13alRxnbTUHSKROyvfjmVoagl9zu1PTgQay2oW5k4oOzeI5/exec";

async function resolveSapatamuSubdomain() {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    
    // ABAIKAN DI DOMAIN UTAMA
    if (hostname === "sapatamu.id" || hostname === "www.sapatamu.id") {
        window.SAPATAMU_RESOLVED = true;
        return null;
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
