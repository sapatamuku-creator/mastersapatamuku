/**
 * SAPATAMU.KU - GLOBAL SUBDOMAIN RESOLVER
 * Menangani deteksi subdomain dan mapping ke Spreadsheet ID secara otomatis.
 */

window.SAPATAMU_RESOLVED = false;
window.CURRENT_SS_ID = new URLSearchParams(window.location.search).get('ssId');

async function resolveSapatamuSubdomain() {
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzZM0KEscGYuUVXhrzDFBZMe0TvZJWlUJtytqQ6O-bmzm3nQifOLDPp21s9NHC01vkP/exec";
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    
    // Jika ada ssId di URL, gunakan itu langsung
    if (window.CURRENT_SS_ID) {
        window.SAPATAMU_RESOLVED = true;
        return window.CURRENT_SS_ID;
    }

    // Cek apakah ada ssId di storage
    const localData = localStorage.getItem('sapatamu_db');
    if (localData) {
        const parsed = JSON.parse(localData);
        if (parsed.ssId) {
            window.CURRENT_SS_ID = parsed.ssId;
            // Tetap lanjut untuk cek subdomain jika hostname cocok
        }
    }

    // Deteksi Subdomain (bukan www dan punya minimal 3 part: sub.domain.tld)
    if (parts.length >= 3 && parts[0] !== 'www') {
        const sub = parts[0].toLowerCase();
        
        // Hindari resolve berulang untuk subdomain yang sama dalam satu sesi
        const cachedId = sessionStorage.getItem('resolved_ssid_' + sub);
        if (cachedId) {
            window.CURRENT_SS_ID = cachedId;
        } else {
            try {
                const response = await fetch(SCRIPT_URL, {
                    method: "POST",
                    body: JSON.stringify({ action: "resolveSubdomain", subdomain: sub })
                });
                const res = await response.json();
                if (res.status === "success") {
                    window.CURRENT_SS_ID = res.ssId;
                    sessionStorage.setItem('resolved_ssid_' + sub, res.ssId);
                    console.log("Subdomain Resolved:", sub, "->", res.ssId);
                }
            } catch (e) {
                console.error("Gagal resolve subdomain:", e);
            }
        }
    }

    // Inject ssId ke URL agar script lain tidak error (tanpa reload)
    if (window.CURRENT_SS_ID && !new URLSearchParams(window.location.search).has('ssId')) {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('ssId', window.CURRENT_SS_ID);
        window.history.replaceState({}, '', newUrl);
    }

    window.SAPATAMU_RESOLVED = true;
    return window.CURRENT_SS_ID;
}

// Inisialisasi Otomatis
resolveSapatamuSubdomain();
