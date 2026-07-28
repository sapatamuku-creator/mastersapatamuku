# Security Fix Plan — SapaTamu.Ku

**Tanggal:** 28 Juli 2026
**Status:** In Progress
**Referensi:** debugging/diag.md

---

## Overview

Plan ini menguraikan seluruh perbaikan keamanan berdasarkan hasil audit OWASP Top 10 + STRIDE. Setiap task di-organize berdasarkan dependency dan prioritas.

---

## Phase 1 — Immediate Critical (Minggu 1)

### 1.1 Rotate & Remove Hardcoded Secrets
- **Scope:** 14+ file
- **Action:** Revoke key Supabase lama, issue baru
- **Dependency:** Tidak ada
- **Estimasi:** 2-3 jam

### 1.2 Hash Passwords
- **Scope:** `sql/setup_login_rpc.sql`
- **Action:** Install `pgcrypto`, migrate ke bcrypt
- **Dependency:** Akses database production
- **Estimasi:** 1-2 jam

### 1.3 Fix Broken RLS
- **Scope:** `sql/setup_config_welcome.sql`
- **Action:** Perbaiki OR clause logic
- **Dependency:** 1.1 (key baru)
- **Estimasi:** 30 menit

### 1.4 Fix Privilege Escalation
- **Scope:** `subdomain_resolver.js`
- **Action:** Hapus role dari URL parameter
- **Dependency:** Tidak ada
- **Estimasi:** 30 menit

### 1.5 Remove Payment Key
- **Scope:** `upgrade.html`
- **Action:** Pindah ke server-side init
- **Dependency:** Backend Midtrans setup
- **Estimasi:** 1 jam

---

## Phase 2 — High Priority (Minggu 2-3)

### 2.1 Sanitize innerHTML (XSS Fix)
- **Scope:** 8+ file
- **Action:** Replace innerHTML → textContent / DOMPurify
- **Dependency:** Tidak ada
- **Estimasi:** 4-6 jam

### 2.2 Security Headers
- **Scope:** `vercel.json` + semua HTML
- **Action:** Tambah CSP, HSTS, X-Frame-Options
- **Dependency:** 1.1 (agar CSP tidak block key baru)
- **Estimasi:** 2 jam

### 2.3 CSRF Protection
- **Scope:** `login.html`, password change flow
- **Action:** Generate & validate CSRF tokens
- **Dependency:** Server-side support
- **Estimasi:** 2-3 jam

### 2.4 Rate Limiting
- **Scope:** Login endpoint
- **Action:** Implement rate limiter
- **Dependency:** Server-side access
- **Estimasi:** 1-2 jam

### 2.5 Session Hardening
- **Scope:** Semua auth flow
- **Action:** Pindah dari localStorage ke httpOnly cookies
- **Dependency:** 2.2 (secure flag perlu HTTPS)
- **Estimasi:** 3-4 jam

### 2.6 RLS Row-Level Fix
- **Scope:** `tamu`, `print_queue`, `welcome_queue`, `sortir_events`, `sortir_selections`
- **Action:** Tambah conditions per row
- **Dependency:** 1.1
- **Estimasi:** 3-4 jam

### 2.7 SRI for CDN
- **Scope:** `sw.js`, semua HTML
- **Action:** Add integrity hashes
- **Dependency:** Tidak ada
- **Estimasi:** 1-2 jam

---

## Phase 3 — Medium Priority (Minggu 4)

### 3.1 Validation Layer
- **Scope:** Semua URL parameters
- **Action:** Buat validation utility function
- **Dependency:** Tidak ada
- **Estimasi:** 2-3 jam

### 3.2 Server-Side OTP
- **Scope:** `scripts/patch_daftar.js`
- **Action:** Pindah OTP generation ke server
- **Dependency:** Backend RPC setup
- **Estimasi:** 1-2 jam

### 3.3 CORS Config
- **Scope:** `vercel.json`
- **Action:** Restrict allowed origins
- **Dependency:** 2.2
- **Estimasi:** 30 menit

### 3.4 .gitignore Fix
- **Scope:** `.gitignore`
- **Action:** Tambah `.env.local`, `.env.*.local`, commit package-lock.json
- **Dependency:** Tidak ada
- **Estimasi:** 10 menit

### 3.5 Cleanup Hardcoded Values
- **Scope:** `scripts/take_all_screenshots.js`, `subdomain_resolver.js`
- **Action:** Pindah ke config/ENV
- **Dependency:** Tidak ada
- **Estimasi:** 1 jam

---

## Phase 4 — Low Priority (Minggu 5)

### 4.1 Code Quality
- **Scope:** Sync queue, error messages, console logs
- **Action:** Cleanup, enkripsi, logging improvements
- **Dependency:** Phase 1-3 selesai
- **Estimasi:** 2-3 jam

### 4.2 Supply Chain
- **Scope:** `skills-lock.json`, dependency audit
- **Action:** Review & pin versions
- **Dependency:** Tidak ada
- **Estimasi:** 1-2 jam

### 4.3 Documentation
- **Scope:** `AGENTS.md`, `AGENT.md`
- **Action:** Hapus/review sensitive info
- **Dependency:** Tidak ada
- **Estimasi:** 30 menit

---

## Dependency Graph

```
1.1 (Rotate Key) ──→ 1.3 (Fix RLS) ──→ 2.6 (RLS Row-Level)
     │
     └──→ 2.2 (Security Headers) ──→ 3.3 (CORS)
                │
                └──→ 2.5 (Session Hardening)

1.2 (Hash Passwords) ──→ standalone

1.4 (Fix Privilege) ──→ standalone

2.1 (XSS Fix) ──→ standalone

2.3 (CSRF) ──→ 2.5 (Session Hardening)

2.4 (Rate Limit) ──→ standalone
```

---

## Estimasi Total

| Phase | Estimasi |
|-------|----------|
| Phase 1 (Critical) | ~6-8 jam |
| Phase 2 (High) | ~15-20 jam |
| Phase 3 (Medium) | ~6-8 jam |
| Phase 4 (Low) | ~4-6 jam |
| **TOTAL** | **~31-42 jam** |

---

## Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| Key rotation breaking existing sessions | Deploy key baru, maintenance window singkat |
| RLS fix breaking legitimate queries | Test semua query di staging dulu |
| CSP breaking existing inline scripts | Audit semua inline scripts, pindah ke external |
| Session migration losing user data | Parallel run old & new session selama transition |
