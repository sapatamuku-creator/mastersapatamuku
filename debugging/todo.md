# Security Fix Checklist — SapaTamu.Ku

**Tanggal:** 28 Juli 2026
**Total:** 49 items

---

## CRITICAL (7)

- [ ] C1. Rotate & remove hardcoded Supabase API key dari 14+ file
- [ ] C2. Hash semua password di database (setup_login_rpc.sql)
- [ ] C3. Fix SECURITY DEFINER function — tambah input sanitization
- [ ] C4. Fix broken RLS logic di config_welcome.sql
- [ ] C5. Sanitize innerHTML XSS — 8+ file
- [ ] C6. Hapus role dari URL parameter (privilege escalation)
- [ ] C7. Remove hardcoded Midtrans payment key

---

## HIGH (16)

- [ ] H1. Hapus/gate demo mode — server-side auth
- [ ] H2. Validasi semua URL parameters sebelum simpan ke localStorage
- [ ] H3. Tambah SRI hashes ke CDN resources di sw.js
- [ ] H4. Tambah origin validation di service worker message handler
- [ ] H5. Enkripsi request queue di sync_queue.js localStorage
- [ ] H6. Review fetch monkey-patch di sync_queue.js
- [ ] H7. Pindah business logic bypass ke server-side (upgrade.html)
- [ ] H8. Tambah rate limiting ke login endpoint
- [ ] H9. Tambah CSRF token ke password change flow
- [ ] H10. Pindah session dari localStorage ke httpOnly cookies
- [ ] H11. Hapus password dari URL query parameter (update_script.js)
- [ ] H12. Generate OTP di server-side (patch_daftar.js)
- [ ] H13. Fix RLS — row-level conditions untuk tamu, print_queue, welcome_queue
- [ ] H14. Fix RLS — batasi anon akses di sortir_events & sortir_selections
- [ ] H15. Fix RLS — batasi anon INSERT di terminated_sessions
- [ ] H16. Commit package-lock.json ke repository

---

## MEDIUM (12)

- [ ] M1. Tambah security headers di vercel.json (CSP, HSTS, X-Frame-Options)
- [ ] M2. Tambah CORS config di vercel.json
- [ ] M3. Perbaiki .gitignore — tambah .env.local, .env.*.local
- [ ] M4. Tambah CSP meta tag di semua HTML files
- [ ] M5. Sanitize push notification data di sw.js
- [ ] M6. Ganti Math.random() dengan crypto ID di sync_queue.js
- [ ] M7. Encode guestId sebelum kirim ke QR API (undangan.html)
- [ ] M8. Batasi anon SELECT di system_logs
- [ ] M9. Batasi public read di client_metadata
- [ ] M10. Sembunyikan SSID dari public view
- [ ] M11. Batasi anon INSERT di system_logs
- [ ] M12. Batasi anon SELECT di terminated_sessions

---

## LOW (14)

- [ ] L1. Hapus Google site verification token dari index.html
- [ ] L2. Tambah SRI ke external scripts di index.html
- [ ] L3. Tambah SRI ke CDN di welcome.html
- [ ] L4. Tambah session expiration di undangan.html
- [ ] L5. Tambah CSRF & input validation untuk wishes submission
- [ ] L6. Validasi theme_id untuk path traversal (invitation.html)
- [ ] L7. Sembunyikan raw HTTP status di error messages (sync-engine.js)
- [ ] L8. Sembunyikan page structure di offline fallback (sw.js)
- [ ] L9. Log precache failures di sw.js
- [ ] L10. Hapus console.log leak session ID (subdomain_resolver.js)
- [ ] L11. Hapus hardcoded ssId & username (take_all_screenshots.js)
- [ ] L12. Tambah integrity verification mechanism (skills-lock.json)
- [ ] L13. Review command examples di AGENTS.md
- [ ] L14. Audit sensitive info di AGENT.md

---

## Progress

| Priority | Done | Total | % |
|----------|------|-------|---|
| Critical | 0 | 7 | 0% |
| High | 0 | 16 | 0% |
| Medium | 0 | 12 | 0% |
| Low | 0 | 14 | 0% |
| **TOTAL** | **0** | **49** | **0%** |
