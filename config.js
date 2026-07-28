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
