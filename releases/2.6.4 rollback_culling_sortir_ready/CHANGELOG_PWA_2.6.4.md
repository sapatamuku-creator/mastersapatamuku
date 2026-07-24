# RELEASE 2.6.4 — PWA Infrastructure Rollout
**Date**: 2026-07-24  
**Type**: Non-breaking enhancement — PWA injection only

---

## Summary of Changes

All root HTML files have been updated with **Progressive Web App (PWA) infrastructure**.  
This is an **additive-only** change — no existing logic was removed or modified.

### Every file received:

#### HEAD additions (after `<meta charset="UTF-8">`):
```html
<meta name="theme-color" content="#C8962E">
<meta name="apple-mobile-web-app-capable" content="yes">
<link rel="manifest" href="manifest.json">
```

#### BODY footer additions (before `</body>` or at end of file):
```html
<script src="offline-db.js"></script>
<script src="sync-engine.js"></script>
<script>
(function(){
    if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(function(){});}
    window.addEventListener('online',function(){document.body.classList.remove('is-offline');});
    window.addEventListener('offline',function(){document.body.classList.add('is-offline');});
})();
</script>
<style>
.is-offline::before{content:'⚠️ OFFLINE — Data tersimpan lokal';position:fixed;top:0;left:0;right:0;z-index:99999;background:#FEE2E2;color:#991B1B;text-align:center;padding:6px;font-size:10px;font-weight:700;}
@media(min-width:1024px){.is-offline::before{display:none;}}
</style>
```

---

## Files Modified (31 HTML files)

### Small files — full backup in this folder:
| File | Backup Status |
|------|--------------|
| logout.html | ✅ Full backup |
| reset.html | ✅ Full backup |
| terms-payment.html | ✅ Full backup |

### Medium/Large files — in root workspace (no backup needed, change is additive):
| File | Lines | Change |
|------|-------|--------|
| analytics.html | ~780 | PWA head + footer |
| angpao.html | ~900 | PWA head + footer |
| angpao_new.html | ~700 | PWA head + footer |
| checkin.html | ~1100 | PWA head + footer |
| config.html | ~380 | PWA head + footer |
| config_invitation.html | ~450 | PWA head + footer |
| daftar.html | ~650 | PWA head + footer |
| dashboard.html | ~2100 | PWA head + footer |
| formulir_tamu.html | ~720 | PWA head + footer |
| index.html | ~320 | PWA head + footer |
| invitation.html | ~480 | PWA head + footer |
| katalog_undangan.html | ~245 | PWA head + footer |
| kiosk.html | ~1480 | PWA head + footer |
| landing.html | ~2445 | PWA head + footer |
| login.html | ~630 | PWA head + footer |
| luckydraw.html | ~640 | PWA head + footer |
| monitor.html | ~1351 | PWA head + footer |
| onsite.html | ~2820 | PWA head + footer |
| owner.html | ~875 | PWA head + footer |
| profile.html | ~820 | PWA head + footer |
| rsvp.html | ~1345 | PWA head + footer |
| sortir.html | ~2530 | PWA head + footer |
| terms.html | ~168 | PWA head + footer |
| undangan.html | ~1310 | PWA head + footer |
| upgrade.html | ~700 | PWA head + footer |
| wa_blast.html | ~1625 | PWA head + footer |
| welcome.html | ~1133 | PWA head + footer |
| worker.html | ~591 | PWA head + footer |

---

## New PWA Infrastructure Files

| File | Description |
|------|-------------|
| `sw.js` | Service Worker — handles offline caching strategy |
| `offline-db.js` | IndexedDB wrapper for local offline data storage |
| `sync-engine.js` | Background sync engine — queues and retries failed API calls |
| `manifest.json` | PWA manifest — app name, icons, theme, display mode |

---

## To Rollback

To revert any file to its pre-PWA state, simply remove these 3 additions:

1. **HEAD**: Remove the 3 meta/link lines after `<meta charset="UTF-8">`
2. **FOOTER**: Remove the `offline-db.js`, `sync-engine.js` scripts and the inline SW registration script + `.is-offline` style block

> The changes are purely additive — removing them restores exact original behavior.

---

## Compatibility Notes

- All changes are **backwards compatible** — browsers without SW support silently ignore the registration
- The offline banner only shows on **mobile** (hidden on desktop via `min-width:1024px`)
- `manifest.json` reference is harmless if file not found (browser ignores missing manifests gracefully)
