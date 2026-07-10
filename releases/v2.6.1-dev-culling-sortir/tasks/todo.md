# Todo Checklist: sortir.sapatamu.id

## Phase 0: Backup & Recovery [DONE]
- [x] **Task 0: Create Rollback Backup**
  - Description: Copy all root project files to releases/v2.6_Rollback_Stable_Sapatamu.
  - Acceptance: Folder exists and matches root workspace files.
  - Verify: Checked via file system.
  - Files: `releases/v2.6_Rollback_Stable_Sapatamu/`

---

## Phase 1: Database & Routing Setup
- [x] **Task 1: Setup Supabase Database Schema**
  - Description: Create tables `sortir_vendors`, `sortir_events`, and `sortir_selections` with FKs and indexes.
  - Acceptance: Tables successfully deployed to Supabase.
  - Verify: Verify via Supabase tables dashboard (using script setup_sortir_schema.sql).
  - Files: `setup_sortir_schema.sql` (new file)
  - Estimated Scope: Small

- [x] **Task 2: Configure RLS and Referral validation**
  - Description: Implement RLS rules and Postgres functions to validate referral usernames.
  - Acceptance: SQL functions successfully execute and RLS blocks unauthorized writes.
  - Verify: Test query endpoints in Supabase SQL editor.
  - Files: `setup_sortir_schema.sql`
  - Estimated Scope: Small

- [x] **Task 3: Integrate Subdomain Routing in `subdomain_resolver.js`**
  - Description: Intercept `sortir` subdomain and direct to login, dashboard, culling node, or owner dashboard.
  - Acceptance: Visiting sortir subdomain redirects correctly.
  - Verify: Inspect console outputs during mock resolution.
  - Files: `subdomain_resolver.js`
  - Estimated Scope: Small

---

## Phase 2: Onboarding & Midtrans Payments
- [x] **Task 4: Implement Register page with Referral & Cycle selection (`sortir_register.html`)**
  - Description: Registration page. Users choose monthly (Rp 25,000) or yearly (Rp 150,000). Referral code input gives Rp 50,000 discount on yearly cycle. Styled with SapaTamu warm cream theme.
  - Acceptance: Inputting active referral username updates price box for yearly cycle.
  - Verify: Manual browser check.
  - Files: `sortir_register.html` (new file)
  - Estimated Scope: Medium

- [x] **Task 5: Setup Midtrans Production Snap Integration & Webhook**
  - Description: Integrate Midtrans Snap JS checkout. Create server webhook handler in `api/sortir-payment-webhook.js` to set status and duration (1 month for monthly, 1 year for yearly).
  - Acceptance: Midtrans modal launches on click. Successful payments activate account.
  - Verify: Perform mock transaction / checkout check.
  - Files: `sortir_register.html`, `api/sortir-payment-webhook.js` (new file)
  - Estimated Scope: Medium

- [x] **Task 6: Implement Login page (`sortir_login.html`)**
  - Description: Sign-in interface using Supabase Auth. Redirects active subscribers to `/dashboard`. Generates and stores `session_token` locally and in DB. Styled with SapaTamu warm cream theme.
  - Acceptance: Vendor registers, pays, and logs in successfully. Generates unique active session UUID.
  - Verify: Test sign-in session caching.
  - Files: `sortir_login.html` (new file)
  - Estimated Scope: Small

---

## Phase 3: Client Culling & Google Drive Integration
- [x] **Task 7: Build Client Selection Page (`sortir_culling.html`)**
  - Description: Photo grid page. Parses Drive folder URL to ID, queries file list using Google Drive API. Styled with SapaTamu warm cream theme.
  - Acceptance: Grid renders images using CDN paths.
  - Verify: Visual verify with public folder.
  - Files: `sortir_culling.html` (new file)
  - Estimated Scope: Medium

- [x] **Task 8: Implement Realtime Selection Sync & WhatsApp Export**
  - Description: Debounced PostgREST check upsert. WhatsApp export formatted text compile button.
  - Acceptance: Checks sync to database; WhatsApp button redirects with selections list.
  - Verify: Monitor Supabase console.
  - Files: `sortir_culling.html`
  - Estimated Scope: Medium

---

## Phase 4: Vendor Dashboard & Profile settings
- [x] **Task 9: Implement Dashboard Panel (`sortir_dashboard.html`)**
  - Description: Vendor Control Panel to create/manage events and limits. Styled with SapaTamu warm cream theme.
  - Acceptance: Vendor can define events and copy links.
  - Verify: Test dashboard interface operations.
  - Files: `sortir_dashboard.html` (new file)
  - Estimated Scope: Medium

- [x] **Task 10: Implement Onboarding Tour Step Guide**
  - Description: Build an interactive onboarding popup tutorial (Next/Skip buttons) on `sortir_dashboard.html` shown on first login, stored in localStorage.
  - Acceptance: New logins automatically see the step guide.
  - Verify: Clear localStorage and refresh to trigger onboarding tour.
  - Files: `sortir_dashboard.html`
  - Estimated Scope: Medium

- [x] **Task 11: Implement Profile Settings Panel**
  - Description: Profile configuration form inside dashboard to change WA admin number, recovery email, and password.
  - Acceptance: Vendor can update profile fields, saving directly to Supabase.
  - Verify: Check DB columns after update.
  - Files: `sortir_dashboard.html`
  - Estimated Scope: Small

- [x] **Task 12: Implement Silent Session Protection (Concurrent Device Kicker)**
  - Description: Implement background polling interval (every 10 seconds) on dashboard that kicks out session if `active_session_token` mismatch detected.
  - Acceptance: Simultaneous login on another device automatically kicks out the first device.
  - Verify: Test parallel logins in two browser windows.
  - Files: `sortir_dashboard.html`
  - Estimated Scope: Small

- [x] **Task 13: Implement Cross-Platform PnP Script Generator**
  - Description: Dynamic PowerShell (.bat) and Bash (.command) scripts generation allowing vendors to download a copy script that matches RAW/JPG images locally.
  - Acceptance: Script downloads, prompts for auto-installation/run approval, and copies matched files correctly.
  - Verify: Run script on Windows/macOS client and check file copies.
  - Files: `sortir_dashboard.html`
  - Estimated Scope: Medium

---

## Phase 5: Owner / Super Admin Dashboard
- [x] **Task 14: Implement Super Admin Dashboard (`sortir_owner.html`)**
  - Description: Dashboard for platform owner. Authenticated via unified SapaTamu owner password. Shows list of all vendors, manages subscriptions, displays MRR and counts. Styled with SapaTamu warm cream theme.
  - Acceptance: Owner logs in, monitors active/inactive vendors, toggles statuses, and updates subscriptions.
  - Verify: Verify operations edit correct DB columns.
  - Files: `sortir_owner.html` (new file)
