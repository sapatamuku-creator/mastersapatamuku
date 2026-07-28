// config.js — Centralized Supabase Configuration
// Single source of truth for all Supabase credentials.
// All files should reference this config instead of hardcoding keys.

const SUPABASE_CONFIG = {
  url: 'https://llrapesaaoliyjrrrsjh.supabase.co',
  key: 'sb_publishable_414hQDyPBaFi0fnzmIKyZw_Iwa09Q0u'
};

// Backward-compatible aliases
const SB_URL = SUPABASE_CONFIG.url;
const SB_KEY = SUPABASE_CONFIG.key;
const SUPABASE_URL = SUPABASE_CONFIG.url;
const SUPABASE_KEY = SUPABASE_CONFIG.key;
