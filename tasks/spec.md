# Spec: Performance Optimization for `formulir_tamu.html`

## Objective
Optimize the initial load time and critical render path of `formulir_tamu.html` by delaying the loading of non-critical external libraries (SheetJS / `xlsx.full.min.js`) and adding preconnect hints to speed up font delivery.

## Success Criteria
- The gzipped size of initial render-blocking JS assets is reduced by avoiding the loading of `xlsx.full.min.js` on startup.
- SheetJS is only fetched when the user chooses to import an Excel file.
- DNS preconnect and preconnect connection establishment are added for Google Fonts.
- The web app continues to load and perform imports properly.

## Tech Stack
- HTML5 / CSS3 / Vanilla JS
- Tailwind CSS (Client-side play CDN)
- SheetJS (Dynamically imported from jsDelivr CDN)

## Boundaries
- **Always do**: Preserve all existing business and import logic when xlsx library loads.
- **Ask first**: Making changes to the Supabase client-side settings.
- **Never do**: Break the existing Excel file parsing format and mappings.
