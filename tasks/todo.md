# Todo Checklist: sortir.html Open-Source

## Phase 1: Database & Routing Setup
- [x] **Task 1.1: Deploy Database Schema**
  - Description: Create tables `sortir_events` and `sortir_selections` without auth dependencies. Enable RLS and add public read/write permissions.
  - Acceptance: Tables successfully created in Supabase with RLS allowed for public operations.
  - Verify: Check schema in Supabase console.
  - Files: `setup_sortir_schema.sql` (update/run)
  - Estimated Scope: Small
- [x] **Task 1.2: Base SPA File & Router**
  - Description: Initialize `sortir.html` with SapaTamu warm cream styling and a basic `URLSearchParams` SPA router.
  - Acceptance: Base styles load, and changing URL query parameters swaps view containers.
  - Verify: Load file in browser with and without query parameters.
  - Files: `sortir.html`
  - Estimated Scope: Small

## Phase 2: Photographer Dashboard Mode
- [x] **Task 2.1: Event Creation Form**
  - Description: Form to enter Event Name, Google Drive Folder Link, Quota Limit, and WhatsApp Admin number. Creates event in Supabase and returns shareable URL.
  - Acceptance: Submitting creates the record in Supabase and displays the generated link.
  - Verify: Run mock creation and verify database row.
  - Files: `sortir.html`
  - Estimated Scope: Medium
- [x] **Task 2.2: Event Management & Local Storage Tracker**
  - Description: Store created event IDs in `localStorage.sortir_created_events`. Show a list of these events on the dashboard for the photographer to manage.
  - Acceptance: Photographer can see previously created events and click them to view selections.
  - Verify: Verify listing persists after page refresh.
  - Files: `sortir.html`
  - Estimated Scope: Small
- [x] **Task 2.3: Live Selections Monitoring & Index Copier**
  - Description: Panel showing the client's live selections count and a textarea containing selected filenames. Provides a quick-copy button.
  - Acceptance: Text area updates in real-time as client selections change. Copied text matches selection list.
  - Verify: Inspect text area contents against checked images.
  - Files: `sortir.html`
  - Estimated Scope: Medium
- [x] **Task 2.4: Cross-Platform Copier Script Download**
  - Description: Download buttons for Windows `cull_photos.bat` and macOS `cull_photos.command` scripts.
  - Acceptance: Clicking downloads correct scripts generating file copies from local workspace.
  - Verify: Download and examine generated scripts.
  - Files: `sortir.html`
  - Estimated Scope: Medium

## Phase 3: Client Culling Mode
- [x] **Task 3.1: Client Culling Layout**
  - Description: Client gallery layout showing event details, selected count, quota limits, and justified photo grid.
  - Acceptance: Renders event info retrieved from Supabase and fits photo grid beautifully.
  - Verify: Access `sortir.html?event=slug`.
  - Files: `sortir.html`
  - Estimated Scope: Medium
- [x] **Task 3.2: Google Drive API & Thumbnail Stream**
  - Description: Extract Google Drive folder ID using Regex, fetch file list using Drive API key, and render thumbnails.
  - Acceptance: Thumbnails render inside justified grid.
  - Verify: Test with public Drive folder.
  - Files: `sortir.html`
  - Estimated Scope: Medium
- [x] **Task 3.3: Real-Time Sync & WhatsApp Exporter**
  - Description: Debounced check/uncheck saving to Supabase `sortir_selections`. Exporter button redirects client to WhatsApp with selection details.
  - Acceptance: Selection status matches database records; WhatsApp link opens correct target and text.
  - Verify: Check Supabase rows and test redirection.
  - Files: `sortir.html`
  - Estimated Scope: Small

