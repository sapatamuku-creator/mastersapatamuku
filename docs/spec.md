# Spec: sortir.html (Open-Source Photo Culling Plugin)

## Objective
Implement an open-source, lightweight, and serverless-friendly Photo Culling system inside a single self-contained file `sapatamu.id/sortir.html`. 

To maintain simplicity, accessibility, and zero-maintenance overhead, the app operates **without vendor login or payment gateways**. It relies on Supabase for event storage and selection sync, and local browser state (`localStorage`) for the photographer's session management.

The single file `sortir.html` dynamically handles two main modes based on URL query parameters:
1. **Photographer Dashboard Mode** (Default, no parameter):
   - A tool for photographers to create culling links.
   - Input: Event Name, Google Drive Folder URL, Selection Limit (Quota), and Photographer's WhatsApp Number.
   - Saves event details to Supabase `sortir_events` and generates a shareable client link: `sapatamu.id/sortir.html?event={slug}`.
   - Tracks created events on the current device using `localStorage` so the photographer can review active events, see real-time selections, copy indices, and download PnP copier scripts.
2. **Client Culling Mode** (`sortir.html?event={slug}`):
   - Fetches the event details from Supabase using the slug.
   - Extracts Google Drive Folder ID via Regex and fetches image previews from the public Google Drive API.
   - Displays a justified, fluid gallery using `@flickr/justified-layout`.
   - Syncs selections to Supabase `sortir_selections` in real-time.
   - Provides a "Kirim Hasil Sortir" button which formats the list of selected files and redirects to WhatsApp.

---

## Tech Stack
*   **Core**: HTML5, Vanilla JavaScript (ES6 Modules).
*   **Styling**: Pure CSS (Vanilla CSS) with variables for theme harmony.
*   **Database**: Supabase (PostgREST API).
*   **Integrations**: Google Drive API (image listing), WhatsApp API (submission redirect).
*   **Layout**: `@flickr/justified-layout` (loaded via CDN).

---

## Design System & Theme Harmony
Signature warm, premium neutral soft palette:
*   **Primary Rose**: `#E07B7B` (soft red/pink highlight)
*   **Background Cream**: `#FFF9F5` (warm neutral soft base)
*   **Text Main**: `#4A3F35` (deep coffee charcoal)
*   **Text Muted**: `#8C7560` (earthy muted brown)
*   **Border/Divider**: `#F0E6DE` (soft mute border)
*   **Input Fill**: `#FDF8F4` (slightly warmer white)
*   **Gold Accent**: `#C8962E` (premium accents)
*   **Typography**: 'Plus Jakarta Sans' for interfaces, 'Lora' for headings.

---

## Project Structure
*   `sortir.html` -> Single entry point file for the culling app.
*   `tasks/`
    *   `spec.md` -> This document.
    *   `plan.md` -> Technical implementation plan.
    *   `todo.md` -> Task checklist.

---

## Database Schema (Supabase)
Only two tables are needed. No authentication/auth integration is required:

### 1. `sortir_events`
```sql
CREATE TABLE public.sortir_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name VARCHAR(150) NOT NULL,
    event_slug VARCHAR(100) UNIQUE NOT NULL,
    quota_limit INTEGER DEFAULT 50 NOT NULL,
    drive_folder_url TEXT NOT NULL,
    drive_folder_id VARCHAR(100) NOT NULL,
    whatsapp_admin VARCHAR(20) NOT NULL, -- Photographer's whatsapp number
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX idx_sortir_events_slug ON public.sortir_events(event_slug);
```

### 2. `sortir_selections`
```sql
CREATE TABLE public.sortir_selections (
    event_id UUID REFERENCES public.sortir_events(id) ON DELETE CASCADE NOT NULL,
    photo_id VARCHAR(255) NOT NULL,
    photo_name VARCHAR(255) NOT NULL,
    is_selected BOOLEAN DEFAULT TRUE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (event_id, photo_id)
);
```

---

## Boundaries
*   **Always do**: Keep the frontend completely self-contained in `sortir.html`.
*   **Always do**: Allow any user to create an event and save the created event slugs in the photographer's local storage for tracking.
*   **Never do**: Add authentication, billing SNAP scripts, or user profiles.
*   **Never do**: Touch existing landing page routing or other core HTML files.
