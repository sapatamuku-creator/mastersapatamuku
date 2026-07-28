// config.js — Centralized Configuration
// Single source of truth for all credentials.
// All files should reference this config instead of hardcoding keys.

const SUPABASE_CONFIG = {
  url: 'https://llrapesaaoliyjrrrsjh.supabase.co',
  key: 'sb_publishable_414hQDyPBaFi0fnzmIKyZw_Iwa09Q0u'
};

const MIDTRANS_CONFIG = {
  clientKey: 'Mid-client-6PvcKPvkHyWGLN8l',
  snapUrl: 'https://app.midtrans.com/snap/snap.js'
};

// Backward-compatible aliases
const SB_URL = SUPABASE_CONFIG.url;
const SB_KEY = SUPABASE_CONFIG.key;
const SUPABASE_URL = SUPABASE_CONFIG.url;
const SUPABASE_KEY = SUPABASE_CONFIG.key;

// Dynamically load Midtrans Snap.js with centralized key
function loadMidtransSnap() {
  if (document.querySelector('script[src*="midtrans"]')) return;
  const script = document.createElement('script');
  script.src = MIDTRANS_CONFIG.snapUrl;
  script.setAttribute('data-client-key', MIDTRANS_CONFIG.clientKey);
  document.head.appendChild(script);
}

// ── CSRF TOKEN GENERATION (HMAC-SHA256 via Web Crypto API) ──
const CSRF_CONFIG = {
  secret: 'sapatamu-csrf-xK9m2pL8vQ3nR7wY', // Shared with GAS PropertiesService
  maxAge: 300 // 5 minutes
};

async function generateCsrfToken() {
  try {
    const session = JSON.parse(sessionStorage.getItem('sapatamu_session') || localStorage.getItem('sapatamu_db') || '{}');
    const username = session.username || session.subdomain || 'anonymous';
    const ts = Math.floor(Date.now() / 1000);
    const data = username + ':' + ts;
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(CSRF_CONFIG.secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    const hmac = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
    return data + ':' + hmac;
  } catch (e) {
    return null;
  }
}

async function csrfHeaders() {
  const token = await generateCsrfToken();
  return token ? { 'X-CSRF-Token': token } : {};
}

// ── SESSION MANAGEMENT ──
// NOTE: sessionStorage TIDAK bisa cross-subdomain (sapatamu.id → fazafarid.sapatamu.id)
// Jadi localStorage tetap dibutuhkan sebagai session store utama.
const SESSION_CONFIG = {
  timeoutMs: 30 * 60 * 1000, // 30 minutes inactivity timeout
  storageKey: 'sapatamu_session',
  legacyKey: 'sapatamu_db',
  lastActivityKey: 'sapatamu_last_activity'
};

// Save session — write to both localStorage (cross-subdomain) and sessionStorage
function saveSession(data) {
  var json = JSON.stringify(data);
  localStorage.setItem(SESSION_CONFIG.legacyKey, json);
  sessionStorage.setItem(SESSION_CONFIG.storageKey, json);
  localStorage.setItem(SESSION_CONFIG.lastActivityKey, String(Date.now()));
}

// Get session — try sessionStorage first, fallback to localStorage
function getSession() {
  try {
    var raw = sessionStorage.getItem(SESSION_CONFIG.storageKey) || localStorage.getItem(SESSION_CONFIG.legacyKey);
    if (!raw) return null;
    // Check inactivity timeout
    var lastActivity = parseInt(localStorage.getItem(SESSION_CONFIG.lastActivityKey) || '0');
    if (lastActivity && Date.now() - lastActivity > SESSION_CONFIG.timeoutMs) {
      clearSession();
      return null;
    }
    // Refresh activity timestamp
    localStorage.setItem(SESSION_CONFIG.lastActivityKey, String(Date.now()));
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

// Clear session on logout or timeout
function clearSession() {
  sessionStorage.removeItem(SESSION_CONFIG.storageKey);
  localStorage.removeItem(SESSION_CONFIG.legacyKey);
  localStorage.removeItem(SESSION_CONFIG.lastActivityKey);
}

// Periodic inactivity check (call on page load)
function startSessionWatchdog() {
  setInterval(function() {
    var lastActivity = parseInt(localStorage.getItem(SESSION_CONFIG.lastActivityKey) || '0');
    if (lastActivity && Date.now() - lastActivity > SESSION_CONFIG.timeoutMs) {
      clearSession();
      if (window.location.pathname.indexOf('login.html') === -1) {
        window.location.href = 'login.html';
      }
    }
  }, 60000); // Check every minute
}
