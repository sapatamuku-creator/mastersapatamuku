# Technical Implementation Plan: sortir.sapatamu.id

## Architecture Decisions
1. **Midtrans Production Checkout Integration**:
   - Client registers on `sortir_register.html` and selects billing cycle:
     - **Yearly**: Rp 150,000 (applies Rp 50,000 discount if active referral username is provided, net Rp 100,000). Adds 1 year to subscription expiration.
     - **Monthly**: Rp 25,000. Adds 1 month to subscription expiration.
   - Payment webhook updates `sortir_vendors` status and sets correct expiration.
2. **Silent Concurrent Session Protection**:
   - On successful login, generate a random UUID locally as `session_token` and save in browser `localStorage`.
   - Update `sortir_vendors.active_session_token` with this UUID.
   - In `sortir_dashboard.html`, run a background interval every 10 seconds checking if the database token matches the local token. If not, trigger logout and redirect to `sortir_login.html?kickout=true`.
3. **Dynamic Google Drive Scraping**:
   - Extract the Google Drive Folder ID using Regex.
   - Use Google Drive files.list API endpoint with SapaTamu API Key to list files.
   - Render thumbnails using the high-speed Google Drive CDN URL pattern: `https://lh3.googleusercontent.com/d/{id}=w400`.
4. **Cross-Platform PnP Script**:
   - Generate two clickable files for download on the dashboard:
     - **Windows (`cull_photos.bat`)**: Double-clickable batch file executing PowerShell copy actions.
     - **macOS (`cull_photos.command`)**: Double-clickable command script executing Bash copy actions.
   - Scripts will request approval at startup, then parse the selected file list and copy matched RAW and JPG files.
5. **Owner Monitoring Panel (`sortir_owner.html`)**:
   - Built to mimic `owner.html` using a unified GAS owner password verification.
   - Integrates directly with Supabase to read and mutate all `sortir_vendors`, calculate metrics.
6. **Onboarding Tour**:
   - Custom-built step overlay tour inside `sortir_dashboard.html` that pops up if `localStorage.sortir_tour_completed` is missing. Introduces Dashboard navigation, Event creation, Google Drive integration, and the local copy script download button.

---

## Implementation Phases

### Phase 0: Backup & Safety [COMPLETED]
- Backup all active workspace files into `releases/v2.6_Rollback_Stable_Sapatamu`.

### Phase 1: Database Setup
- Execute schema queries in Supabase SQL editor: `sortir_vendors` (including `billing_cycle`, `active_session_token`, `subscription_expires_at`), `sortir_events`, `sortir_selections`.
- Set up RLS policies & referral lookup functions.

### Phase 2: Dynamic Subdomain Routing
- Modify `subdomain_resolver.js` to route `sortir.sapatamu.id` directly to `sortir_login.html`, `sortir_dashboard.html`, `sortir_culling.html`, or `sortir_owner.html`.

### Phase 3: Registration, Login & Midtrans Integration
- Build `sortir_login.html` and `sortir_register.html` using SapaTamu's signature warm cream brand design palette.
- Implement Midtrans Snap JS checkout.
- Add payment webhook receiver in API folder (`api/sortir-payment-webhook.js`) to set vendor profile active and set expiration.
- Implement `active_session_token` update during login.

### Phase 4: Client Culling UI & Google Drive Integration
- Build `sortir_culling.html` client selection interface with matching brand layout.
- Implement Regex extraction of Folder ID and file list fetching via Google Drive API.
- Implement PostgREST real-time check auto-save.
- Integrate formatted WhatsApp results export button.

### Phase 5: Vendor Dashboard & Profile settings
- Build `sortir_dashboard.html` with:
  - Onboarding Tour modal component (Skip / Next triggers).
  - Event Creation Form (generating slugs and limits).
  - Profile Settings section (change WA number, update Auth password, change recovery email).
  - Background session check interval (silent concurrent device kicker).
  - Cross-platform PnP copy script generator (Windows `.bat` & macOS `.command` downloads).

### Phase 6: Owner Panel (`sortir_owner.html`)
- Build `sortir_owner.html` dashboard loading all vendors from `sortir_vendors` using brand styles.
- Implement status toggle, expiration update editor, and stats display.

---

## Verification Checkpoints

### Checkpoint 1 (Database & Routing)
- Verify `sortir.sapatamu.id` matches resolution rules.
- Confirm schema setup in Supabase database.

### Checkpoint 2 (Onboarding & Payments)
- Test referral validation: inputting active user matches 100k price for yearly cycle.
- Verify monthly billing cycle sets correct Rp 25,000 price.
- Confirm Midtrans production redirect.

### Checkpoint 3 (Session Protection / Kickout)
- Log in on one browser tab. Open another browser/device and log in with the same account.
- Confirm that the first tab gets kicked out within 10 seconds.

### Checkpoint 4 (Client Selection & Drive rendering)
- Confirm files in public Google Drive folder render as thumbnails.
- Confirm checked files sync instantly to database.

### Checkpoint 5 (Onboarding Tour popup)
- Clean browser localStorage and access dashboard. Verify that step-by-step tour launches automatically.
- Verify that clicking "Skip" or finishing the tour hides it and persists the state.
