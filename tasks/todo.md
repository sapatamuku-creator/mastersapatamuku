# Todo List: Performance Optimization for `formulir_tamu.html`

- [x] Task 1: Add Preconnect Links for Google Fonts
  - Acceptance: Preconnect links for fonts.googleapis.com and fonts.gstatic.com are in `<head>`.
  - Verify: View file and verify tags are present before the font link.
  - Files: `formulir_tamu.html`

- [x] Task 2: Implement Lazy Loading for SheetJS (xlsx)
  - Acceptance: The `xlsx.full.min.js` script tag is removed from the `<head>` of the page.
  - Verify: View file and confirm line is deleted.
  - Files: `formulir_tamu.html`

- [x] Task 3: Add `loadExcelLibrary()` helper and modify `handleExcelUpload`
  - Acceptance: `loadExcelLibrary` dynamically injects the XLSX script tag on demand. `handleExcelUpload` awaits it.
  - Verify: Check script loading flow when upload is initiated.
  - Files: `formulir_tamu.html`
