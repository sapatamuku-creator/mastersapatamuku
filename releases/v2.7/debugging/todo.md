# Security Fix Checklist — SapaTamu.Ku

**Tanggal:** 28 Juli 2026
**Total:** 49 items

---

## CRITICAL (7)

- [x] C1. Rotate & remove hardcoded Supabase API key dari 14+ file ✅ 2026-07-28
- [x] C2. Hash semua password di database (setup_login_rpc.sql) ✅ 2026-07-28
- [x] C3. Fix SECURITY DEFINER function — tambah input sanitization ✅ 2026-07-28
- [x] C4. Fix broken RLS logic di config_welcome.sql ✅ 2026-07-28
- [x] C5. Sanitize innerHTML XSS — 8+ file ✅ 2026-07-28
- [x] C6. Hapus role dari URL parameter (privilege escalation) ✅ 2026-07-28
- [x] C7. Remove hardcoded Midtrans payment key ✅ 2026-07-28

---

## HIGH (16)

- [x] H1. Hapus/gate demo mode — server-side auth ✅ 2026-07-28
- [x] H2. Validasi semua URL parameters sebelum simpan ke localStorage ✅ 2026-07-28
- [x] H3. Tambah SRI hashes ke CDN resources di sw.js ✅ 2026-07-28
- [x] H4. Tambah origin validation di service worker message handler ✅ 2026-07-28
- [x] H5. Enkripsi request queue di sync_queue.js localStorage ✅ 2026-07-28
- [x] H6. Review fetch monkey-patch di sync_queue.js ✅ 2026-07-28
- [x] H7. Pindah business logic bypass ke server-side (upgrade.html) ✅ 2026-07-28
- [x] H8. Tambah rate limiting ke login endpoint ✅ 2026-07-28
- [x] H9. Tambah CSRF token ke password change flow ✅ 2026-07-28
- [x] H10. Pindah session dari localStorage ke httpOnly cookies ✅ 2026-07-28
- [x] H11. Hapus password dari URL query parameter (update_script.js) ✅ 2026-07-28
- [x] H12. Generate OTP di server-side (patch_daftar.js) ✅ 2026-07-28
- [x] H13. Fix RLS — row-level conditions untuk tamu, print_queue, welcome_queue ✅ 2026-07-28
- [x] H14. Fix RLS — batasi anon akses di sortir_events & sortir_selections ✅ 2026-07-28
- [x] H15. Fix RLS — batasi anon INSERT di terminated_sessions ✅ 2026-07-28
- [x] H16. Commit package-lock.json ke repository ✅ 2026-07-28

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
| Critical | 7 | 7 | 100% |
| High | 15 | 16 | 94% |
| Medium | 0 | 12 | 0% |
| Low | 0 | 14 | 0% |
| **TOTAL** | **22** | **49** | **45%** |
