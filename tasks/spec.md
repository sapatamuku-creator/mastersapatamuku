# Specification: sortir.sapatamu.id (Photo Culling Micro-SaaS)

## Objective
Establish `sortir.sapatamu.id` as an isolated B2B Photo Culling Micro-SaaS for photography vendors and studios. 
Key flows:
1. **Onboarding**: Vendors register and pay a subscription fee. Two payment options are available:
   - **Annual**: Rp 150,000 / year (discounted to Rp 100,000 with a valid active referral code).
   - **Monthly**: Rp 25,000 / month.
2. **Session / Device Protection (Anti-Cheating)**:
   - A vendor account can only be active on **1 device/tab at a time** (maximum 1 session).
   - Achieved silently via `active_session_token` stored in the vendor record. When a new login occurs, it updates this token. Old tabs check this token periodically and immediately kick out the user if a mismatch is detected, forcing a logout.
3. **Vendor Dashboard**:
   - Vendors create events, enter public Google Drive folder URLs, set selection limits, monitor selections, edit profile settings (WhatsApp admin number, password, recovery email), and download a cross-platform Plug-and-Play copy script.
   - **Beginner Step Guide (Onboarding Tour)**: Shows on first load using a step-by-step UI helper modal (Next / Skip) stored in `localStorage.sortir_tour_completed`. Guides vendor on event creation, quota config, Drive URL input, and PnP script execution.
4. **Culling Node**: Clients access `/:event_slug` to view photos read directly from Google Drive, make selections with real-time Supabase autosave, and export choices via a WhatsApp template.
5. **PnP Local Copying (Cross-Platform)**:
   - **Windows**: Double-clickable `.bat` launcher running a PowerShell copier under the hood.
   - **macOS / Linux**: Double-clickable `.command` script running bash command copier.
   - Auto-run behavior: Prompts for confirmation upon launching. After agreement, it reads the selections text and duplicates matched RAW (CR2, NEF, ARW, DNG) and JPG files locally.
6. **Owner / Super Admin Panel**:
   - Accessed via `sortir_owner.html` (mapped to `sortir.sapatamu.id/owner`).
   - Authenticated using the central SapaTamu owner password (via unified GAS verification).
   - Allows monitoring all vendors, manually toggling active status, updating subscription expirations, viewing MRR & total earnings, and monitoring platform stats (total events, total selections).

## Design System & Theme Harmony
To keep the branding unified with SapaTamu.id, we use the signature warm, premium neutral soft palette:
- **Primary Rose**: `#E07B7B` (soft red/pink highlight)
- **Background Cream**: `#FFF9F5` (warm neutral soft base)
- **Text Main**: `#4A3F35` (deep coffee charcoal)
- **Text Muted**: `#8C7560` (earthy muted brown)
- **Border/Divider**: `#F0E6DE` (soft mute border)
- **Input Fill**: `#FDF8F4` (slightly warmer white)
- **Gold Accent**: `#C8962E` (premium accents)
- **Typography**: 'Plus Jakarta Sans' for interfaces, 'Lora' for headings.

## Database Schema (Supabase)
All tables are isolated with the `sortir_` prefix:

### 1. `sortir_vendors`
```sql
CREATE TABLE public.sortir_vendors (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    vendor_name VARCHAR(150) NOT NULL,
    whatsapp_admin VARCHAR(20) NOT NULL,
    email_recovery VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT FALSE NOT NULL,
    billing_cycle VARCHAR(20) DEFAULT 'monthly' NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
    referred_by VARCHAR(50) REFERENCES public.sortir_vendors(username),
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    active_session_token UUID, -- Silently check for concurrent login sessions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### 2. `sortir_events`
```sql
CREATE TABLE public.sortir_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES public.sortir_vendors(id) ON DELETE CASCADE NOT NULL,
    event_name VARCHAR(150) NOT NULL,
    event_slug VARCHAR(100) UNIQUE NOT NULL,
    quota_limit INTEGER DEFAULT 50 NOT NULL,
    drive_folder_url TEXT NOT NULL,
    drive_folder_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX idx_sortir_events_slug ON public.sortir_events(event_slug);
```

### 3. `sortir_selections`
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

## Project Structure
New frontend files:
```text
/ (root)
├── sortir_login.html       --> Vendor registration & login
├── sortir_register.html    --> Midtrans registration checkout (with Referral & Cycle selector)
├── sortir_dashboard.html   --> Vendor Control Panel + Profile settings + Session checker + Onboarding Tour
├── sortir_culling.html     --> Real-time client-side image selection interface
├── sortir_owner.html       --> Super Admin monitoring dashboard (/owner)
├── tasks/
│   ├── spec.md             --> This file
│   ├── plan.md             --> Implementation plan
│   └── todo.md             --> Task checklist
```

## Anti-Concurrent Session Logic
1. **On Login**: Create a new UUID `session_token`. Store in `localStorage`. Update `active_session_token` in `sortir_vendors` database row.
2. **On Page Load & Periodic Check** (Dashboard):
   - Every 10 seconds, query the vendor's `active_session_token`.
   - If the returned token does not match the token in `localStorage`, trigger logout immediately:
     - Clear localStorage/sessionStorage.
     - Redirect to `sortir_login.html?kickout=true`.
3. **User Feedback**: The kickout redirect is decorated with a standard "Sesi Anda telah berakhir. Silakan login kembali" notification to remain generic and secret.

## PnP Script Blueprint (`cull_photos.bat` & `cull_photos.command`)
Scripts will prompt:
`Menjalankan skrip ini berarti menyetujui instalasi pembantu penyalinan file foto di komputer Anda. Lanjutkan? (Y/N)`

- **Windows (`cull_photos.bat`)**:
  - Automatically runs a hidden PowerShell line to read a selected files list, search for matching files in a source directory, and copy them to a destination directory.
- **macOS (`cull_photos.command`)**:
  - A double-clickable script using `rsync` or `cp` matching names ignoring extensions, compatible with RAW file extensions (CR2, NEF, ARW, DNG, JPG).

## Boundaries
- **Always do**: Namespace tables with `sortir_`.
- **Always do**: Bypass standard resolver in `subdomain_resolver.js` if host starts with `sortir.sapatamu.id`.
- **Never do**: Modify central GAS tables or spreadsheet sync scripts for culling transactions.
- **Never do**: Share Midtrans production keys in frontend.
