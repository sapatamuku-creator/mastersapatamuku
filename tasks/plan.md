# Technical Implementation Plan: sortir.html Open-Source

## Architecture Decisions
1. **Single-Page Routing**:
   - Dynamic view switching using URL query parameters:
     - `?event={slug}` -> Client Culling view.
     - (No parameters) -> Photographer Dashboard (Create & Manage events).
2. **Local Session Persistence**:
   - Since there is no user login/signup, photographers track their created events via browser `localStorage.sortir_created_events` (array of event IDs/slugs).
   - This allows them to reload `sortir.html` and still manage their events, see client selections in real-time, copy indices, and download copier scripts.
3. **Database Schema (Supabase)**:
   - Simplified tables (`sortir_events` and `sortir_selections`) without `sortir_vendors` or FKs to `auth.users`.
   - Setup Row Level Security (RLS) policies allowing public read/write access to both tables to maintain a serverless, open-source model.
4. **Google Drive CDN Integration**:
   - Extract Google Drive folder ID via Regex.
   - List files using public Google Drive API.
   - Load image thumbnails via Google Drive's CDN: `https://lh3.googleusercontent.com/d/{id}=w400`.
5. **Cross-Platform Copier Scripts**:
   - Provide direct downloads for:
     - Windows: `cull_photos.bat` (batch launcher running custom inline PowerShell script).
     - macOS/Linux: `cull_photos.command` (Bash copier script using rsync/cp).
   - These scripts parse a copied list of selected filenames and copy matched files locally from the photographer's RAW/JPG directory.

---

## Implementation Phases

### Phase 1: Database Setup
- Execute modified database schema in Supabase SQL editor to create `sortir_events` and `sortir_selections`.
- Set up open RLS policies (allow insert and select on `sortir_events` and `sortir_selections` to anyone).

### Phase 2: Base UI & Router
- Create `sortir.html` and define CSS styles using SapaTamu's warm cream brand colors.
- Build the `URLSearchParams` SPA router.
- Create container sections for "Dashboard Mode" and "Client Culling Mode".

### Phase 3: Photographer Dashboard
- Build event creation form (Event Name, Drive URL, WhatsApp Admin, Quota Limit).
- Save event to Supabase and generate sharing link.
- Save event references to `localStorage` and display the "My Events" management panel.
- Implement live selections tracking for created events.
- Implement click-to-download Windows `.bat` and macOS `.command` copier script generator.

### Phase 4: Client Culling Gallery
- Resolve event details using `event_slug` param.
- Parse Google Drive URL and query public API.
- Render thumbnail grid using justified-layout.
- Implement debounced checkbox sync with Supabase `sortir_selections`.
- Build the WhatsApp exporter matching the photographer's admin number.

---

## Verification Checkpoints

### Checkpoint 1: Event Creation & Persistence
- Create an event. Confirm it is added to Supabase.
- Refresh the page and verify the event appears in the "My Events" panel on the dashboard.

### Checkpoint 2: Image Rendering
- Access `sortir.html?event=test-slug` with a public Google Drive folder.
- Verify that thumbnails render in a justified, fluid grid layout.

### Checkpoint 3: Real-Time Sync & Export
- Check several photos. Check the database to confirm matching rows in `sortir_selections`.
- Click the export button and verify WhatsApp API URL contains the selected filenames.
