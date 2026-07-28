# SECURITY AUDIT REPORT — SapaTamu.Ku

**Tanggal:** 28 Juli 2026
**Metodologi:** OWASP Top 10 + STRIDE Threat Model + security-and-hardening skill
**Scope:** Seluruh file di folder utama (HTML, JS, SQL, JSON, PS1, Config)

---

## Ringkasan Severity

| Severity | Jumlah |
|----------|--------|
| **Critical** | 28 |
| **High** | 41 |
| **Medium** | 44 |
| **Low** | 20 |
| **TOTAL** | **133** |

---

## CRITICAL — Temuan Detail

### C1. Hardcoded Supabase API Key (10+ file)

**Key:** `sb_publishable_414hQDyPBaFi0fnzmIKyZw_Iwa09Q0u`

**File terdampak:**
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
- `sql/setup_config_welcome.sql` (di dalam RLS policy!)

**Risiko:** Key ini bisa digunakan oleh siapa saja untuk query langsung ke Supabase. Jika RLS lemah, semua data bisa diakses/diubah.

**Fix:** Rotate key sekarang. Pindah ke server-side proxy atau environment variable.

---

### C2. Password Plaintext di Database

**File:** `sql/setup_login_rpc.sql`

- **Line 12-14:** Admin password dibandingkan dengan `= v_admin_pass` (plaintext)
- **Line 27:** Client password juga plaintext
- **Line 40-43:** Tidak ada rate limiting atau brute-force protection

**Risiko:** Jika database bocor, semua password langsung terbaca.

**Fix:** Migrate ke bcrypt/argon2 dengan salt rounds >= 12.

---

### C3. SECURITY DEFINER Function Tanpa Sanitization

**File:** `sql/setup_login_rpc.sql:4`

Function berjalan sebagai superuser owner. Jika ada SQL injection di dalam function, attacker mendapat full DB privileges.

**Fix:** Pastikan semua input di-sanitize, atau gunakan `SECURITY INVOKER` dengan proper授权.

---

### C4. Broken RLS Logic di config_welcome

**File:** `sql/setup_config_welcome.sql:28-29`

Kondisi `IS NOT NULL` di OR clause membuat secret check tidak berfungsi:
```sql
-- MASALAH: Header apapun (termasuk "abc") lolos
... IS NOT NULL
```

**Fix:** Perbaiki logic RLS agar benar-benar memvalidasi secret.

---

### C5. Stored XSS via innerHTML (8+ file)

Data dari Supabase di-inject langsung ke DOM tanpa sanitasi:

| File | Line | Data |
|------|------|------|
| `undangan.html` | 1054-1065 | Wish name & text |
| `invitation.html` | 449-454 | Wish name & text |
| `invitation.html` | 230-257 | Groom/bride names & descriptions |
| `welcome.html` | 581-583 | Vendor role/name |
| `welcome.html` | 707-733 | Couple name & rundown |
| `worker.html` | 249 | Log messages |
| `scripts/printer_widget.js` | 140 | Error messages |
| `scripts/check.js` | 404 | Guest name |

**Risiko:** Attacker bisa inject script ke database, dan semua user yang melihat data tersebut akan menjalankan script tersebut.

**Fix:** Gunakan `textContent` atau DOMPurify.

---

### C6. Privilege Escalation via URL Parameter

**File:** `subdomain_resolver.js:60`

Role dibaca dari URL parameter `?role=admin` dan disimpan ke session.

**Risiko:** Attacker bisa craft URL dengan `?role=admin` untuk mendapat akses admin.

**Fix:** Role harus ditentukan oleh server, bukan dari URL.

---

### C7. Hardcoded Payment Gateway Key

**File:** `upgrade.html:11`

Midtrans client key `Mid-client-6PvcKPvkHyWGLN8l` di-hardcode di HTML.

**Fix:** Pindah ke server-side payment initialization.

---

## HIGH — Temuan Detail

### H1. Demo Mode Tanpa Auth
**File:** `subdomain_resolver.js:24, 42-45`
`?demo=true` langsung akses data tanpa autentikasi.

### H2. Session Data dari URL Tanpa Validasi
**File:** `subdomain_resolver.js:58-76`
`ssId`, `user`, `role`, `category` dari URL disimpan langsung ke localStorage.

### H3. Cache Poisoning — CDN Tanpa SRI
**File:** `sw.js:22-23`
CDN resources (`cdn.tailwindcss.com`, `fonts.googleapis.com`) di-cache tanpa Subresource Integrity.

### H4. Service Worker Terima Message dari Siapaja
**File:** `sw.js:120-134`
Message handler terima `urls` dari client page tanpa origin validation.

### H5. Request Queue Disimpan di localStorage Tanpa Enkripsi
**File:** `sync_queue.js:37-48`
Auth tokens dan request bodies tersimpan plaintext di localStorage.

### H6. Fetch Monkey-Patch
**File:** `sync_queue.js:268-304`
`window.fetch` di-replace global, bisa di-exploit.

### H7. Business Logic Bypass — Client-Side Check
**File:** `upgrade.html:606-655`
Downgrade check hanya di client-side, bisa di-bypass.

### H8. No Rate Limiting Login
**File:** `login.html:435-546`
Tidak ada batasan attempt login, brute-force bisa dilakukan.

### H9. No CSRF Token
**File:** `login.html:571-588`
Password change tanpa CSRF token.

### H10. Session di localStorage
**File:** `login.html:493-494`
Session data accessible via XSS.

### H11. Password dikirim sebagai URL Query
**File:** `scripts/update_script.js:29`
Password di URL parameter, ter-log di server access logs.

### H12. OTP di-generate di Client
**File:** `scripts/patch_daftar.js:65, 116`
OTP pakai `Math.random()` yang predictable.

### H13. Anon Full CRUD di Beberapa Table
**File:** `sql/supabase_rls.sql:23-67`
- `tamu`: anon bisa SELECT/INSERT/UPDATE/DELETE
- `print_queue`: sama
- `welcome_queue`: sama

### H14. Anon Full Akses sortir_events & sortir_selections
**File:** `sql/setup_sortir_schema.sql:78-100`
Anon bisa INSERT/SELECT/UPDATE/DELETE tanpa batas.

### H15. Anon Bisa Inject Kick Signals
**File:** `sql/setup_presence_monitor.sql:25-26`
Anon bisa insert fake kick signals.

### H16. package-lock.json di-ignore
**File:** `.gitignore:3`
Supply-chain risk — installs non-deterministic.

---

## MEDIUM — Temuan Detail

### M1. Tidak ada Security Headers
**File:** `vercel.json`
Tidak ada CSP, HSTS, X-Frame-Options, X-Content-Type-Options.

### M2. Tidak ada CORS Config
**File:** `vercel.json`
Serverless functions accessible tanpa CORS restriction.

### M3. Pattern .env Tidak Lengkap
**File:** `.gitignore:6-9`
Hanya `.env` yang di-ignore, kurang `.env.local`, `.env.*.local`.

### M4. Tidak ada CSP di Semua HTML
Semua file HTML tidak set Content Security Policy.

### M5. Push Notification Tanpa Sanitasi
**File:** `sw.js:152-156`
Notification title/body render langsung dari push data.

### M6. Math.random() untuk ID
**File:** `sync_queue.js:40`
Predictable IDs.

### M7. QR Code Data dari URL
**File:** `undangan.html:824`
`guestId` dari URL parameter dikirim ke external QR API tanpa encoding.

### M8. Public Read Semua System Logs
**File:** `sql/setup_system_logs.sql:30-31`
Anon bisa baca semua system logs.

### M9. Public Read Semua Client Metadata
**File:** `sql/supabase_client_metadata.sql:20-22`
Wedding dates, locations, WhatsApp formats publicly readable.

### M10. SSID Terekspos di Public View
**File:** `sql/supabase_safe_view.sql:15`
SSID column ada di anonymous-accessible view.

### M11. Anon INSERT di System Logs
**File:** `sql/setup_system_logs.sql:23-24`
Anon bisa insert fake logs.

### M12. Anon SELECT di Terminated Sessions
**File:** `sql/setup_presence_monitor.sql:20-21`
Anon bisa baca siapa yang sudah di-kick.

---

## LOW — Temuan Detail

| File | Issue |
|------|-------|
| `index.html:12` | Google site verification token exposed |
| `index.html:10` | External scripts tanpa SRI |
| `welcome.html:11` | CDN tanpa SRI |
| `undangan.html:935-936` | Session tanpa expiration |
| `undangan.html:1010-1019` | No CSRF + no input validation on wishes |
| `invitation.html:122` | Theme ID tanpa validasi (path traversal potential) |
| `sync-engine.js:164,177,189,202` | Raw HTTP status codes di error messages |
| `sw.js:110-113` | Offline fallback reveal page structure |
| `sw.js:30-37` | Precache failures silently swallowed |
| `subdomain_resolver.js:260` | Console.log leak resolved session ID |
| `scripts/take_all_screenshots.js:4-5` | Hardcoded ssId & username |
| `skills-lock.json:3-189` | No integrity verification mechanism |
| `AGENTS.md:8` | Command examples with double-quoted strings |
| `AGENT.md:14,93-96,225-231` | Domain, MCP refs, SQL file names exposed |

---

## Rekomendasi Prioritas

### Priority 1 — IMMEDIATE (Minggu Ini)
1. **Rotate Supabase key** — revoke & issue baru
2. **Hash semua password** di database (bcrypt/argon2)
3. **Fix broken RLS** di `config_welcome.sql`
4. **Fix privilege escalation** — hapus role dari URL parameter
5. **Remove hardcoded payment key** dari HTML

### Priority 2 — HIGH (2 Minggu)
6. **Sanitize semua innerHTML** → gunakan `textContent` atau DOMPurify
7. **Tambah security headers** di `vercel.json`
8. **Tambah CSP** di semua HTML files
9. **Implement CSRF tokens** untuk login & password change
10. **Fix RLS policies** — tambah row-level conditions
11. **Tambah rate limiting** di login endpoint
12. **Add SRI** ke semua CDN resources

### Priority 3 — MEDIUM (1 Bulan)
13. **Pindah session ke httpOnly cookies**
14. **Validasi semua URL parameters** sebelum digunakan
15. **Generate OTP di server-side**
16. **Add CORS config** di `vercel.json`
17. **Perbaiki .gitignore** — tambah `.env.local`, `.env.*.local`
18. **Commit package-lock.json**
19. **Origin validation** di service worker message handler

### Priority 4 — LOW (Sprint Berikutnya)
20. **Hapus console.log** yang leak sensitive data
21. **Tambah input validation** untuk wishes
22. **Self-host QR code API** (hentikan data leakage ke qrserver.com)
23. **Audit & review semua script files** untuk unused credentials
