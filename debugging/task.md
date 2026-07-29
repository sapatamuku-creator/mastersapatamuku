# Security Fix Tasks — SapaTamu.Ku

**Tanggal:** 28 Juli 2026
**Status:** In Progress
**Total Tasks:** 49

---

## CRITICAL TASKS (7)

### C1. Rotate & Remove Hardcoded Supabase API Key
- **Status:** Pending
- **Priority:** Critical
- **Assignee:** —
- **Estimasi:** 2-3 jam
- **File terdampak:**
  - `welcome.html`
  - `login.html`
  - `dashboard.html`
  - `upgrade.html`
  - `worker.html`
  - `undangan.html`
  - `invitation.html`
  - `sync-engine.js`
  - `subdomain_resolver.js`
  - `scripts/update_script.js`
  - `scripts/printer_widget.js`
  - `scripts/check.js`
  - `scripts/migrate_to_supabase.ps1`
  - `scripts/patch_upgrade.ps1`
  - `sql/setup_config_welcome.sql`

**Subtask:**
- [ ] Revoke key Supabase lama di dashboard
- [ ] Issue key baru
- [ ] Update semua file dengan key baru (atau pindah ke ENV/proxy)
- [ ] Update SQL RLS policies dengan key baru
- [ ] Test semua fitur dengan key baru
- [ ] Deploy ke production

**Acceptance Criteria:**
- Tidak ada hardcoded key di source code
- Semua request Supabase menggunakan key baru
- RLS policies berfungsi dengan key baru

---

### C2. Hash Passwords di Database
- **Status:** Pending
- **Priority:** Critical
- **File:** `sql/setup_login_rpc.sql`
- **Estimasi:** 1-2 jam

**Subtask:**
- [ ] Install `pgcrypto` extension di Supabase
- [ ] Buat migration script untuk hash password yang ada
- [ ] Update fungsi `auth_client` untuk menggunakan `crypt()` & `gen_salt()`
- [ ] Test login dengan password baru
- [ ] Verify admin & client password hashed

**Acceptance Criteria:**
- Password tidak pernah dibandingkan plaintext
- Semua password existing sudah ter-hash
- Login berfungsi dengan hashing

---

### C3. Fix SECURITY DEFINER Function
- **Status:** Pending
- **Priority:** Critical
- **File:** `sql/setup_login_rpc.sql`
- **Estimasi:** 30 menit

**Subtask:**
- [ ] Audit input validation di dalam function
- [ ] Tambah explicit parameter checks
- [ ] Review apakah SECURITY DEFINER masih diperlukan
- [ ] Test dengan malicious input

---

### C4. Fix Broken RLS Logic
- **Status:** Pending
- **Priority:** Critical
- **File:** `sql/setup_config_welcome.sql`
- **Estimasi:** 30 menit

**Subtask:**
- [ ] Identifikasi logic yang benar untuk secret check
- [ ] Fix OR clause (IS NOT NULL → proper validation)
- [ ] Test RLS policy dengan berbagai input
- [ ] Deploy ke staging → production

**Acceptance Criteria:**
- Hanya request dengan secret yang valid yang lolos
- Request tanpa/salah secret ditolak

---

### C5. Sanitize innerHTML XSS
- **Status:** Pending
- **Priority:** Critical
- **File:** 8+ file
- **Estimasi:** 4-6 jam

**Subtask:**
- [ ] `undangan.html:1054-1065` — Wish rendering
- [ ] `invitation.html:449-454` — Wish rendering
- [ ] `invitation.html:230-257` — Groom/bride names
- [ ] `welcome.html:581-583` — Vendor data
- [ ] `welcome.html:707-733` — Couple name & rundown
- [ ] `worker.html:249` — Log messages
- [ ] `scripts/printer_widget.js:140` — Error messages
- [ ] `scripts/check.js:404` — Guest name
- [ ] Install DOMPurify (opsional)
- [ ] Test semua injection vectors

**Acceptance Criteria:**
- Tidak ada `innerHTML =` dengan user/DB data
- Gunakan `textContent` atau DOMPurify
- Semua XSS vectors tertest

---

### C6. Fix Privilege Escalation
- **Status:** Pending
- **Priority:** Critical
- **File:** `subdomain_resolver.js`
- **Estimasi:** 30 menit

**Subtask:**
- [ ] Hapus pembacaan `role` dari URL parameter
- [ ] Role harus dari server-side response
- [ ] Test privilege escalation vector

---

### C7. Remove Hardcoded Payment Key
- **Status:** Pending
- **Priority:** Critical
- **File:** `upgrade.html`
- **Estimasi:** 1 jam

**Subtask:**
- [ ] Pindah Midtrans client key ke server
- [ ] Implement server-side payment initialization
- [ ] Update client untuk fetch key dari server
- [ ] Test payment flow

---

## HIGH TASKS (16)

### H1. Gate Demo Mode
- **Status:** Pending
- **Priority:** High
- **File:** `subdomain_resolver.js`
- **Estimasi:** 1 jam

**Subtask:**
- [ ] Tambah server-side auth check untuk demo mode
- [ ] Hapus hardcoded demo credentials
- [ ] Limit demo data access

---

### H2. Validate URL Parameters
- **Status:** Pending
- **Priority:** High
- **File:** `subdomain_resolver.js`
- **Estimasi:** 1 jam

**Subtask:**
- [ ] Buat validation utility function
- [ ] Validate `ssId`, `user`, `role`, `category` sebelum simpan
- [ ] Reject invalid values

---

### H3. Add SRI to CDN
- **Status:** Pending
- **Priority:** High
- **File:** `sw.js`
- **Estimasi:** 1 jam

**Subtask:**
- [ ] Generate integrity hashes untuk `cdn.tailwindcss.com`
- [ ] Generate integrity hashes untuk `fonts.googleapis.com`
- [ ] Update service worker cache config
- [ ] Test caching behavior

---

### H4. Origin Validation in SW
- **Status:** Pending
- **Priority:** High
- **File:** `sw.js`
- **Estimasi:** 30 menit

**Subtask:**
- [ ] Tambah origin check di message handler
- [ ] Reject messages dari origin yang tidak dikenal
- [ ] Test dengan postMessage

---

### H5. Encrypt Request Queue
- **Status:** Pending
- **Priority:** High
- **File:** `sync_queue.js`
- **Estimasi:** 2 jam

**Subtask:**
- [ ] Enkripsi request bodies sebelum simpan ke localStorage
- [ ] Enkripsi auth tokens di headers
- [ ] Implement key management (opsional)

---

### H6. Review Fetch Monkey-Patch
- **Status:** Pending
- **Priority:** High
- **File:** `sync_queue.js`
- **Estimasi:** 1 jam

**Subtask:**
- [ ] Audit patch logic
- [ ] Tambah safeguards
- [ ] Document behavior

---

### H7. Server-Side Business Logic
- **Status:** Pending
- **Priority:** High
- **File:** `upgrade.html`
- **Estimasi:** 2 jam

**Subtask:**
- [ ] Pindah downgrade check ke server
- [ ] Validasi package tier di backend
- [ ] Test bypass attempts

---

### H8. Rate Limiting Login
- **Status:** Pending
- **Priority:** High
- **File:** Server-side
- **Estimasi:** 1-2 jam

**Subtask:**
- [ ] Implement rate limiter untuk login endpoint
- [ ] Set appropriate limits (e.g., 5 attempts / 15 min)
- [ ] Tambah lockout mechanism
- [ ] Test brute-force attempts

---

### H9. CSRF Token
- **Status:** Pending
- **Priority:** High
- **File:** `login.html`, password change flow
- **Estimasi:** 2-3 jam

**Subtask:**
- [ ] Generate CSRF tokens
- [ ] Add token ke semua mutation requests
- [ ] Validate token di server
- [ ] Handle token expiry

---

### H10. httpOnly Cookies
- **Status:** Pending
- **Priority:** High
- **File:** Semua auth flow
- **Estimasi:** 3-4 jam

**Subtask:**
- [ ] Implement httpOnly secure cookies
- [ ] Migrate dari localStorage session
- [ ] Update semua auth checks
- [ ] Handle cookie refresh
- [ ] Test cross-origin access

---

### H11. Remove Password from URL
- **Status:** Pending
- **Priority:** High
- **File:** `scripts/update_script.js`
- **Estimasi:** 30 menit

**Subtask:**
- [ ] Pindah password ke request body
- [ ] Update semua query parameter usage
- [ ] Test

---

### H12. Server-Side OTP
- **Status:** Pending
- **Priority:** High
- **File:** `scripts/patch_daftar.js`
- **Estimasi:** 1-2 jam

**Subtask:**
- [ ] Pindah OTP generation ke server RPC
- [ ] Gunakan crypto.randomBytes()
- [ ] Update client untuk fetch OTP dari server
- [ ] Test OTP flow

---

### H13. Fix RLS — tamu, print_queue, welcome_queue
- **Status:** Pending
- **Priority:** High
- **File:** `sql/supabase_rls.sql`
- **Estimasi:** 2 jam

**Subtask:**
- [ ] Tambah row-level conditions untuk `tamu`
- [ ] Tambah row-level conditions untuk `print_queue`
- [ ] Tambah row-level conditions untuk `welcome_queue`
- [ ] Test semua query patterns

---

### H14. Fix RLS — sortir_events, sortir_selections
- **Status:** Pending
- **Priority:** High
- **File:** `sql/setup_sortir_schema.sql`
- **Estimasi:** 1 jam

**Subtask:**
- [ ] Batasi anon akses di `sortir_events`
- [ ] Batasi anon akses di `sortir_selections`
- [ ] Test

---

### H15. Fix RLS — terminated_sessions
- **Status:** Completed
- **Priority:** High
- **File:** `sql/setup_presence_monitor.sql`
- **Estimasi:** 30 menit

**Subtask:**
- [x] Batasi anon INSERT di `terminated_sessions`
- [x] Test

---

### H16. Commit package-lock.json
- **Status:** Completed
- **Priority:** High
- **File:** `.gitignore`
- **Estimasi:** 10 menit

**Subtask:**
- [x] Hapus `package-lock.json` dari `.gitignore`
- [x] Run `npm install` untuk generate lockfile
- [x] Commit lockfile
- [x] Update CI untuk frozen install

---

## MEDIUM TASKS (12)

### M1. Security Headers
- **File:** `vercel.json`
- **Estimasi:** 1 jam
- [x] Tambah CSP header
- [x] Tambah HSTS header
- [x] Tambah X-Frame-Options: DENY
- [x] Tambah X-Content-Type-Options: nosniff
- [x] Tambah Referrer-Policy
- [x] Test dengan securityheaders.com

### M2. CORS Config
- **File:** `vercel.json`
- **Estimasi:** 30 menit
- [x] Restrict allowed origins
- [x] Test cross-origin requests

### M3. .gitignore Fix
- **File:** `.gitignore`
- **Estimasi:** 10 menit
- [x] Tambah `.env.local`
- [x] Tambah `.env.*.local`
- [x] Verify

### M4. CSP Meta Tags
- **File:** Semua HTML
- **Estimasi:** 1-2 jam
- [x] Tambah `<meta http-equiv="Content-Security-Policy">` ke setiap HTML
- [x] Test semua fitur

### M5. Sanitize Push Notifications
- **File:** `sw.js`
- **Estimasi:** 30 menit
- [ ] Sanitize `title` & `body` dari push data
- [ ] Test notification

### M6. Crypto ID Generation
- **File:** `sync_queue.js`
- **Estimasi:** 30 menit
- [ ] Ganti `Math.random()` dengan `crypto.randomUUID()`
- [ ] Test

### M7. Encode QR Data
- **File:** `undangan.html`
- **Estimasi:** 30 menit
- [ ] `encodeURIComponent()` guestId sebelum kirim ke QR API
- [ ] Test

### M8. Restrict system_logs SELECT
- **File:** `sql/setup_system_logs.sql`
- **Estimasi:** 30 menit
- [ ] Tambah conditions untuk anon SELECT
- [ ] Test

### M9. Restrict client_metadata read
- **File:** `sql/supabase_client_metadata.sql`
- **Estimasi:** 30 menit
- [ ] Tambah conditions untuk public read
- [ ] Test

### M10. Hide SSID from public view
- **File:** `sql/supabase_safe_view.sql`
- **Estimasi:** 30 menit
- [ ] Remove atau sembunyikan SSID column
- [ ] Update queries yang menggunakan view ini

### M11. Restrict system_logs INSERT
- **File:** `sql/setup_system_logs.sql`
- **Estimasi:** 30 menit
- [ ] Batasi anon INSERT
- [ ] Test

### M12. Restrict terminated_sessions SELECT
- **File:** `sql/setup_presence_monitor.sql`
- **Estimasi:** 30 menit
- [ ] Batasi anon SELECT
- [ ] Test

---

## LOW TASKS (14)

### L1. Remove site verification token
- **File:** `index.html:12`
- **Estimasi:** 5 menit

### L2. SRI for external scripts
- **File:** `index.html`
- **Estimasi:** 30 menit

### L3. SRI for CDN
- **File:** `welcome.html`
- **Estimasi:** 30 menit

### L4. Session expiration
- **File:** `undangan.html`
- **Estimasi:** 30 menit

### L5. CSRF + validation for wishes
- **File:** `undangan.html`
- **Estimasi:** 1 jam

### L6. Validate theme_id
- **File:** `invitation.html`
- **Estimasi:** 30 menit

### L7. Hide HTTP status in errors
- **File:** `sync-engine.js`
- **Estimasi:** 30 menit

### L8. Hide page structure in fallback
- **File:** `sw.js`
- **Estimasi:** 15 menit

### L9. Log precache failures
- **File:** `sw.js`
- **Estimasi:** 15 menit

### L10. Remove console.log leak
- **File:** `subdomain_resolver.js`
- **Estimasi:** 5 menit

### L11. Remove hardcoded ssId/username
- **File:** `scripts/take_all_screenshots.js`
- **Estimasi:** 10 menit

### L12. Integrity verification for skills
- **File:** `skills-lock.json`
- **Estimasi:** 30 menit

### L13. Review AGENTS.md commands
- **File:** `AGENTS.md`
- **Estimasi:** 15 menit

### L14. Audit AGENT.md sensitive info
- **File:** `AGENT.md`
- **Estimasi:** 15 menit
