# 06 — Auth, Subdomain & Guard System

> Sumber: `config.js:1`, `subdomain_resolver.js`, `auth_guard.js` (823 lines), `middleware.js` (OG bot), `vercel.json` CSP/HSTS

## 6.1 Config central (jangan hardcode di HTML)

```js
// config.js — single source of truth (tapi JANGAN commit secret real di repo baru — pakai env)
var SUPABASE_CONFIG = window.SUPABASE_CONFIG || { url:'https://llrapesaaoliyjrrrsjh.supabase.co', key:'sb_publishable_...' };
var MIDTRANS_CONFIG = window.MIDTRANS_CONFIG || { clientKey:'Mid-client-...', snapUrl:'https://app.midtrans.com/snap/snap.js' };
var SB_URL = SUPABASE_CONFIG.url, SB_KEY = SUPABASE_CONFIG.key;
function loadMidtransSnap(){ if(document.querySelector('script[src*="midtrans"]'))return; const s=document.createElement('script'); s.src=MIDTRANS_CONFIG.snapUrl; s.setAttribute('data-client-key', MIDTRANS_CONFIG.clientKey); document.head.appendChild(s); }

// CSRF HMAC-SHA256 5m
var CSRF_CONFIG = { secret:'sapatamu-csrf-xK9...', maxAge:300 };
async function generateCsrfToken(){ /* username:ts:hmac via Web Crypto HMAC SHA-256 */ }
async function csrfHeaders(){ const t=await generateCsrfToken(); return t?{'X-CSRF-Token':t}:{}; }

// Session dual-store + watchdog
var SESSION_CONFIG = { timeoutMs:30*60*1000, storageKey:'sapatamu_session', legacyKey:'sapatamu_db', lastActivityKey:'sapatamu_last_activity' };
function saveSession(data){ const j=JSON.stringify(data); localStorage.setItem(SESSION_CONFIG.legacyKey,j); sessionStorage.setItem(SESSION_CONFIG.storageKey,j); localStorage.setItem(SESSION_CONFIG.lastActivityKey,String(Date.now())); }
function getSession(){ /* sessionStorage first fallback localStorage, check timeout, refresh activity */ }
function clearSession(){ sessionStorage.removeItem(...); localStorage.removeItem(...); }
function startSessionWatchdog(){ setInterval(()=>{ if(Date.now()-lastActivity>timeoutMs) {clearSession(); location.href='login.html';}},60000); }
```

**SLOP di repo lama:** SB_URL/KEY/SCRIPT_URL hardcode 15+ file inline. Project baru: inject via `window.SUPABASE_CONFIG` dari server/env, jangan commit.

## 6.2 Subdomain resolver (4-step)

`subdomain_resolver.js` — globals `SAPATAMU_RESOLVED, CURRENT_SS_ID, SCRIPT_URL/SB_URL/SB_KEY`, validators `validateSsId /^[a-zA-Z0-9_-]{20,60}$/`, `validateUsername /^[a-z0-9-]{3,50}$/`, `validateCategory enum`, `VALID_CATEGORIES wedding/birthday/anniversary/corporate/gathering`.

```
resolveSapatamuSubdomain():
 0) demo ?demo|triggerDemo=true → akundemo ssId 1URVle0... Bronze Guestbook (hardcode demo)
 1) ?ssId&user&category&role → validate → localStorage + history.replace
 1.5) host contains 'sortir' → redirect sortir_owner/login/register/dashboard/culling
 2) !isMainDomain → local _parsed.username /^[a-z0-9-]+$/ → if sub exists:
     Step1 Supabase GET /rest/v1/client_public_profile?subdomain=eq.sub&select=ssid,client_name,category,package (~200ms) → save username=sub client_name fix, preserve role, background verify GAS ?action=resolveSubdomain
     Step3 GAS fallback if fail
 3) Guard akhir: !CURRENT_SS_ID && !publicPages[undangan,welcome,worker,invitation,rsvp,login,guestbook,landing] → redirect sapatamu.id/login?unauthenticated
```

Wildcard DNS `*.sapatamu.id` → Vercel → resolver. Local `*.localhost`. Transfer via `?ssId&user` — project baru sebaiknya `httpOnly cookie` (SLOP lama: readable URL).

## 6.3 RBAC & Guard

`auth_guard.js:1` — roles `client|usher|undefined` (akundemo→undefined), `getRole()`, `upgradeRoleToUsher()`.

- `SapaGuard.apply('field')` untuk `kiosk/checkin/onsite/worker`: if client → overlay `rgba(74,63,53,0.5) blur6` box `380px radius35 pop 0.34,1.56` warn + Mengerti / 🔑 Masuk Admin → `verifyAdmin()` POST `action:verifyAdminPassword` → upgrade usher re-enable.
- `applyViewOnlyContent()` — MutationObserver disable `button/input/textarea` kecuali guard/nav/search, block `form submit`.
- `SapaGuard.apply('sensitive')` untuk `formulir_tamu/wa_blast/config/angpao`: if usher → banner fixed top gradient `#4A3F35→#6B5A4E` 44px + `body padding-top 44px` + viewOnly.
- `isInsideNav` skip `#nav-scroll`, `isAuthenticated()` client/usher or demo, mock `akundemo/claraclairyn` di localhost.

**Idle timeout:** `idleTimeout 2m` dashboard vs `60m` operasional (`kiosk|worker|onsite|checkin|welcome|formulir_tamu|config`) — check `hasActiveProcesses isQueueRunning/isBusy/isProcessing/syncQueue/loading-global/global-blocker` — jika idle → `removeAllChannels+signOut` → `clear storage` → `login?reason=idle_timeout`.

**Visibility:** `visibilitychange` — operasional keep realtime, else `30s suspend → SAPAGUARD_CHANNELS_CLEANED → reload or toast #sapa-realtime-warning`. `beforeunload` cleanup `_sapaPresenceChannel`.

**Presence:** `waitForSession 30×300ms` fallback `guest/public/display`, `waitForSupabase` inject `cdn.jsdelivr supabase@2`, channel `sapatamu-online` presence `key:username_timestamp {username,ssid,role,page,is_demo,joined_at,ua}`, kick channel `sapatamu-kick-signal broadcast force-disconnect` + polling `terminated_sessions 15s` → overlay 🔒 → `login?force_disconnect`.

## 6.4 Middleware OG (bot-only)

`middleware.js` — `BOT_RE = whatsapp|facebook|twitterbot|linkedin|slack|discord|telegrambot|googlebot|bingbot|...` 23 crawler. `SAFETY_HEADERS` CSP/STS/SAMEORIGIN.

- Match `isInvitation /vendor/:slug /product/:id /vendor-product` — skip `?og-static=1` loop guard, skip non-bot passthrough.
- Bot: `botHeaders Cache max-age 300`, resolve:
  - vendor → `resolveVendorBySlug` → `buildVendorOgMeta` → fetch `/vendor-profile.html?og-static=1` → `ensureOgMeta`
  - product → `resolveProductById || /api/mp/product-detail` → `buildProductOgMeta`
  - invitation → extract `sub host[0] /^[a-z0-9-]{3,50}$/` → `resolveWeddingData(sub)` → `?u` → `buildOgMeta` → fetch `/invitation.html?og-static=1` → `injectOgMeta`
- `config.matcher` 5 paths.

## 6.5 Security headers (vercel.json)

```json
{
  "headers":[
    {"source":"/api/(.*)","headers":[
      {"key":"Access-Control-Allow-Origin","value":"*"},
      {"key":"Access-Control-Allow-Methods","value":"GET, POST, OPTIONS"},
      {"key":"Access-Control-Allow-Headers","value":"X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization"}
    ]},
    {"source":"/(.*)","headers":[
      {"key":"Content-Security-Policy","value":"default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://cdn.jsdelivr.net https://cdn.tailwindcss.com https://fonts.googleapis.com https://*.supabase.co https://script.google.com https://app.midtrans.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://script.google.com https://api.midtrans.com https://*.fonnte.com; frame-src 'self' https://*.sapatamu.id; frame-ancestors 'self' https://*.sapatamu.id;"},
      {"key":"Strict-Transport-Security","value":"max-age=31536000; includeSubDomains; preload"},
      {"key":"X-Frame-Options","value":"SAMEORIGIN"},
      {"key":"X-Content-Type-Options","value":"nosniff"}
    ]}
  ]
}
```

CSP di repo lama duplikat 3 sumber (`vercel.json` vs `<meta http-equiv>` per HTML vs `middleware SAFETY_HEADERS`) drifting — **single source `vercel.json`** di project baru.
