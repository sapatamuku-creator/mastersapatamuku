/**
 * SAPATAMU.KU - GLOBAL SUBDOMAIN RESOLVER
 * Menangani deteksi subdomain dan mapping ke Spreadsheet ID secara otomatis.
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

async function resolveSapatamuSubdomain() {
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwPvWH3yZRNO4qijJ6BnNwjtU8GFd2Cu2FkxJvTLmemTUsaRlK8n6DP8jjHSGQ6UrDG/exec";
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    
    // ABAIKAN JIKA DI DOMAIN UTAMA (sapatamu.id atau www.sapatamu.id)
    if (hostname === "sapatamu.id" || hostname === "www.sapatamu.id") {
        window.SAPATAMU_RESOLVED = true;
        return null;
    }

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
                } else {
                    // Jika error (misal: Expired atau Tidak Terdaftar)
                    alert(res.message || "Akses ditolak. Silakan login kembali.");
                    window.location.replace("https://sapatamu.id/login.html");
                    return;
                }
            } catch (e) {
                console.error("Gagal resolve subdomain:", e);
            }
        }
    }

    // ssId tidak lagi di-inject ke URL untuk keamanan (leakage prevention)
    // Cukup simpan di memori window.CURRENT_SS_ID

    window.SAPATAMU_RESOLVED = true;
    return window.CURRENT_SS_ID;
}

// Inisialisasi Otomatis
resolveSapatamuSubdomain();
