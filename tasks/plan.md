# Plan: Performance Optimization for `formulir_tamu.html`

## Technical Strategy
1. **Preconnect Optimization**:
   - Add `<link rel="preconnect" href="https://fonts.googleapis.com">` and `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` immediately above the font stylesheet `<link>` tag in the `<head>` section of `formulir_tamu.html`.
2. **SheetJS Lazy Loading**:
   - Remove `<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>` from `<head>`.
   - Implement `loadExcelLibrary()` helper function that returns a Promise, appending a `<script>` tag dynamically to the DOM when called.
   - Refactor `window.handleExcelUpload` to be `async` and await `loadExcelLibrary()` before reading the file data.
   - Add robust error handling and user indicators (e.g. using `toggleProcessing` and modals) while the library loads.

## Verification Checkpoints
- **Phase 1: Preconnect Verification**: Inspect HTML headers in `formulir_tamu.html` to confirm preconnect tags are present and clean.
- **Phase 2: SheetJS Lazy Load Verification**: Confirm that `xlsx.full.min.js` is not fetched on initial page load (check network tab or console output). Confirm that selecting an Excel file triggers loading of the script and successful completion of the import dialog setup.
