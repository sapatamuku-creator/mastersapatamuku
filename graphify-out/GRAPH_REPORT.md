# Graph Report - mastersapatamuku  (2026-08-16)

## Corpus Check
- 116 files · ~828,034 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 854 nodes · 939 edges · 109 communities (86 shown, 23 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ca1671ca`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Project Dependencies & Package Config
- Authentication Guard & Session Management
- Onsite Check-in & Scanner Interface
- Label Printing Widget & Realtime Queue
- Hex & Character Encoding Fixer (V1)
- Offline Sync Queue & Database Synchronization
- Google Apps Script Backend Configuration
- Hex & Character Encoding Fixer (V2)
- CP1252 to UTF-8 Decoding Script
- Manual Mojibake & Encoding Recovery Script
- Supabase Row Level Security (RLS) Policies
- Final Clean Mojibake Script
- PDF Extraction & Parser Script
- Script Reference Update Tool
- Auto Mojibake Fixer
- PDF Reader Utility
- Alternate PDF Parser
- Puppeteer Screenshot Capture Automation
- Vercel API: List Drive Files
- Vercel API: Undangan Loader
- Regex Content Extraction Script
- Icon Mapping Repair Tool
- Line Break & Text Fixer
- Temporary Scratch Patch Script
- Vercel API: OG Image Generator
- Vercel API: Payment Webhook Handler
- Daftar Form Injection Patch
- PostgreSQL Schema: Sortir Table Definitions
- Vercel Routing & Redirect Configurations
- Vercel API: Get Email Handler
- Formulir Cleanup Script
- Form Logic Patcher
- PostgreSQL Migration: Add Subdomain to Tamu
- PostgreSQL Schema: Welcome Config Definitions
- PostgreSQL Schema: Presence Monitor Schema
- PostgreSQL Schema: System Logs Schema
- PostgreSQL Schema: Client Metadata Table
- PostgreSQL Schema: Safe View Profiles
- Subdomain Resolution Utility
- AGENT.md — SapaTamu Project Agent Operating System
- HIGH — Temuan Detail
- Security Fix Plan — SapaTamu.Ku
- 🔐 Rencana Migrasi: Subdomain Resolver → Opsi C (Supabase Edge Function)
- mp.js
- manifest.json
- LOW TASKS (14)
- 5. Kerangka Utama Data Mapper (The Script Detector)
- PLAN — Sapatamu Marketplace Development Plan
- MEDIUM — Temuan Detail
- Implementation Phases
- 1. Hasil Scanning & Analisis Arsitektur Saat Ini
- Spec: sortir.html (Open-Source Photo Culling Plugin)
- mp-config.js
- config.js
- 🛠️ Standar Implementasi 4-Langkah
- LAPORAN AUDIT & SINKRONISASI DATABASE SAPATAMU
- 1. Executive Summary
- Security Fix Checklist — SapaTamu.Ku
- Arsip Kode: Penerjemah Indeks Manual
- AUDIT REPORT & TASK DIRECTIVE: Wishes & Prayers Module
- Panduan Implementasi Agentic AI Monitoring v2.5
- Setup Guide: Google Drive Image Storage
- 🔴 Phase 0 — Fondasi (Database + API)
- Arsip Kode: PnP Copy Script (Lokal)
- Deploy Database Schema ke Supabase
- Todo Checklist: sortir.html Open-Source
- 03_products.sql
- 04_inquiries.sql
- 07_rls_policies.sql
- SPEC — Sapatamu Marketplace Technical Specification
- opencode.json
- 02_vendors.sql
- 05_reviews.sql
- 06_transactions.sql
- sw.js
- AGENTS.md
- offline-db.js
- 01_categories.sql
- sync-engine.js
- HIGH TASKS (16)
- Spec: Phase 2 — Verifikasi Akun Vendor & Promo Diskon Marketplace
- Plan: Phase 2 — Verifikasi Vendor & Promo Diskon
- 08_vendor_verification_promo.sql
- MEDIUM TASKS (12)

## God Nodes (most connected - your core abstractions)
1. `handler()` - 29 edges
2. `HIGH — Temuan Detail` - 17 edges
3. `HIGH TASKS (16)` - 17 edges
4. `LOW TASKS (14)` - 15 edges
5. `AGENT.md — SapaTamu Project Agent Operating System` - 13 edges
6. `MEDIUM — Temuan Detail` - 13 edges
7. `MEDIUM TASKS (12)` - 13 edges
8. `PHASE3.5-DESIGN — OAuth2 Client & Dashboard Pengantin` - 13 edges
9. `handler()` - 12 edges
10. `Spec: Phase 2 — Verifikasi Akun Vendor & Promo Diskon Marketplace` - 12 edges

## Surprising Connections (you probably didn't know these)
- `handler()` --calls--> `buildOgMeta()`  [EXTRACTED]
  api/undangan.js → lib/og-shared.js
- `handler()` --calls--> `injectOgMeta()`  [EXTRACTED]
  api/undangan.js → lib/og-shared.js
- `handler()` --calls--> `resolveWeddingData()`  [EXTRACTED]
  api/undangan.js → lib/og-shared.js
- `middleware()` --calls--> `resolveWeddingData()`  [EXTRACTED]
  middleware.js → lib/og-shared.js
- `middleware()` --calls--> `buildOgMeta()`  [EXTRACTED]
  middleware.js → lib/og-shared.js

## Import Cycles
- None detected.

## Communities (109 total, 23 thin omitted)

### Community 0 - "Project Dependencies & Package Config"
Cohesion: 0.08
Nodes (23): @omniroute/opencode-plugin, antigravity.ide.project, engine, plugins, dependencies, pdf.js-extract, pdf-parse, playwright (+15 more)

### Community 1 - "Authentication Guard & Session Management"
Cohesion: 0.18
Nodes (10): applyFieldGuard(), applySensitiveGuard(), applyViewOnlyContent(), checkTerminated(), getRole(), getSession(), _handleForceDisconnect(), isAuthenticated() (+2 more)

### Community 2 - "Onsite Check-in & Scanner Interface"
Cohesion: 0.21
Nodes (16): closeModal(), executePhotoCaptureOnsite(), fetchData(), initApp(), initNavScroll(), initScanner(), initSupabaseRealtimeTamu(), masterData (+8 more)

### Community 3 - "Label Printing Widget & Realtime Queue"
Cohesion: 0.33
Nodes (11): connect(), fetchQueue(), init(), initRealtime(), log(), printLabel(), processItems(), sanitizeHTML() (+3 more)

### Community 4 - "Hex & Character Encoding Fixer (V1)"
Cohesion: 0.22
Nodes (9): badHexToGood, fixAll(), formC, fs, matchArrow, matchSearch, matchTrash, path (+1 more)

### Community 5 - "Offline Sync Queue & Database Synchronization"
Cohesion: 0.42
Nodes (12): decryptData(), deleteItem(), encryptData(), enqueue(), fallbackEnqueue(), getDB(), getEncryptionKey(), getNextQueueItem() (+4 more)

### Community 6 - "Google Apps Script Backend Configuration"
Cohesion: 0.25
Nodes (7): dependencies, exceptionLogging, runtimeVersion, timeZone, webapp, access, executeAs

### Community 7 - "Hex & Character Encoding Fixer (V2)"
Cohesion: 0.29
Nodes (7): badHexToGood, checkinC, fixAll(), fs, matchAlamat, path, walk()

### Community 8 - "CP1252 to UTF-8 Decoding Script"
Cohesion: 0.38
Nodes (6): cp1252, decodeCP1252ToUTF8(), fs, path, processFile(), walkSync()

### Community 9 - "Manual Mojibake & Encoding Recovery Script"
Cohesion: 0.38
Nodes (6): fixMojibakeInFile(), fs, path, recoverFile(), replacements, walkSync()

### Community 11 - "Final Clean Mojibake Script"
Cohesion: 0.40
Nodes (5): fixFile(), fs, map, path, walk()

### Community 12 - "PDF Extraction & Parser Script"
Cohesion: 0.47
Nodes (5): fs, options, pdfExtract, readPDF(), run()

### Community 13 - "Script Reference Update Tool"
Cohesion: 0.29
Nodes (6): cb, fs, html, newScript, scriptStart, ur

### Community 14 - "Auto Mojibake Fixer"
Cohesion: 0.50
Nodes (4): fixMojibakeInFile(), fs, path, walkSync()

### Community 15 - "PDF Reader Utility"
Cohesion: 0.60
Nodes (4): fs, pdf, readPDF(), run()

### Community 16 - "Alternate PDF Parser"
Cohesion: 0.40
Nodes (4): buf1, buf2, fs, pdfParse

### Community 17 - "Puppeteer Screenshot Capture Automation"
Cohesion: 0.40
Nodes (3): { chromium }, pagesToCapture, path

### Community 18 - "Vercel API: List Drive Files"
Cohesion: 0.83
Nodes (3): collectFiles(), driveList(), handler()

### Community 19 - "Vercel API: Undangan Loader"
Cohesion: 0.19
Nodes (22): fs, handler(), path, buildOgMeta(), buildProductOgMeta(), buildVendorOgMeta(), cleanMeta(), DAYS (+14 more)

### Community 20 - "Regex Content Extraction Script"
Cohesion: 0.50
Nodes (3): fs, matches, s

### Community 23 - "Temporary Scratch Patch Script"
Cohesion: 0.50
Nodes (3): fs, path, toFix

### Community 28 - "Vercel Routing & Redirect Configurations"
Cohesion: 0.40
Nodes (4): cleanUrls, headers, outputDirectory, rewrites

### Community 32 - "Vercel API: Get Email Handler"
Cohesion: 0.05
Nodes (41): C1. Rotate & Remove Hardcoded Supabase API Key, C2. Hash Passwords di Database, C3. Fix SECURITY DEFINER Function, C4. Fix Broken RLS Logic, C5. Sanitize innerHTML XSS, C6. Fix Privilege Escalation, C7. Remove Hardcoded Payment Key, CRITICAL TASKS (7) (+33 more)

### Community 43 - "Subdomain Resolution Utility"
Cohesion: 0.60
Nodes (5): resolveSapatamuSubdomain(), VALID_CATEGORIES, validateCategory(), validateSsId(), validateUsername()

### Community 58 - "AGENT.md — SapaTamu Project Agent Operating System"
Cohesion: 0.06
Nodes (33): 10. Context Memory Strategy, 11. Final Rule, 1. Identitas Proyek, 2. Hierarki Referensi Agent, 3.1 Aturan Inti, 3.2 Intent → Skill Mapping, 3.3 MCP Servers yang Relevan, 3.4 Lifecycle Tanpa Slash Command (+25 more)

### Community 59 - "HIGH — Temuan Detail"
Cohesion: 0.04
Nodes (46): C1. Hardcoded Supabase API Key (10+ file), C2. Password Plaintext di Database, C3. SECURITY DEFINER Function Tanpa Sanitization, C4. Broken RLS Logic di config_welcome, C5. Stored XSS via innerHTML (8+ file), C6. Privilege Escalation via URL Parameter, C7. Hardcoded Payment Gateway Key, CRITICAL — Temuan Detail (+38 more)

### Community 60 - "Security Fix Plan — SapaTamu.Ku"
Cohesion: 0.07
Nodes (29): 1.1 Rotate & Remove Hardcoded Secrets, 1.2 Hash Passwords, 1.3 Fix Broken RLS, 1.4 Fix Privilege Escalation, 1.5 Remove Payment Key, 2.1 Sanitize innerHTML (XSS Fix), 2.2 Security Headers, 2.3 CSRF Protection (+21 more)

### Community 61 - "🔐 Rencana Migrasi: Subdomain Resolver → Opsi C (Supabase Edge Function)"
Cohesion: 0.10
Nodes (20): 📋 Checklist Migrasi (Urutan Pelaksanaan), Deploy function:, Ganti bagian STEP 1 (query Supabase view) dengan call Edge Function:, Install Supabase CLI (jika belum):, Isi `index.ts`:, Login & link project:, Lokasi file (buat folder baru):, 🧠 Mengapa Opsi C Lebih Aman dari Opsi A? (+12 more)

### Community 62 - "mp.js"
Cohesion: 0.14
Nodes (33): CATEGORY_UUID_MAP, DEFAULT_CATEGORIES, ensureCategoryInDB(), findAuthUserIdByEmail(), findVendorByEmail(), findVendorByWhatsApp(), generateSlug(), genOtpCode() (+25 more)

### Community 63 - "manifest.json"
Cohesion: 0.12
Nodes (15): background_color, categories, description, dir, display, icons, lang, name (+7 more)

### Community 64 - "LOW TASKS (14)"
Cohesion: 0.07
Nodes (26): 10. Referensi & Pertautan, 1. Ringkasan Desain, 2.1 Prinsip, 2.2 Alur Detail, 2.3 Logika Hitung Slot, 2.4 Kenapa "Setujui/Tolak" di Dashboard, Bukan Cukup WA?, 2. Alur Booking (Slot & Konfirmasi Vendor), 3.1 Struktur Pembayaran (+18 more)

### Community 65 - "5. Kerangka Utama Data Mapper (The Script Detector)"
Cohesion: 0.13
Nodes (14): 1. Migrasi Template WordPress ke SapaTamu, 2. Arsitektur Global Template & Dynamic Renderer, 3. Auto-Discovery Katalog Tema & Auto-Thumbnail, 4. JSON Schema-Driven UI (Adaptasi Control Panel Dinamis), 5. Kerangka Utama Data Mapper (The Script Detector), A. Halaman Publikasi (`undangan.html`), A. Konfigurasi Global & Teks Utama, B. Halaman Editor (`config_invitation.html`) (+6 more)

### Community 66 - "PLAN — Sapatamu Marketplace Development Plan"
Cohesion: 0.10
Nodes (20): Milestone 0.1 — Database Schema, Milestone 0.2 — Shared Config, Milestone 0.3 — API Endpoints, Milestone 0.4 — Vercel Config Update, Milestone 3.1 — Schema Database Escrow (SQL), Milestone 3.2 — Integration Payment Gateway (Midtrans / Xendit), Milestone 3.3 — Frontend Client Order & Escrow Tracker, Milestone 3.4 — Vendor Dashboard Escrow & Payout Management (+12 more)

### Community 67 - "MEDIUM — Temuan Detail"
Cohesion: 0.16
Nodes (21): CACHE_LONG, CACHE_PUBLIC, config, CORS, DEFAULT_CATEGORIES, enrichPromo(), generateSlug(), genOtpCode() (+13 more)

### Community 68 - "Implementation Phases"
Cohesion: 0.17
Nodes (11): Architecture Decisions, Checkpoint 1: Event Creation & Persistence, Checkpoint 2: Image Rendering, Checkpoint 3: Real-Time Sync & Export, Implementation Phases, Phase 1: Database Setup, Phase 2: Base UI & Router, Phase 3: Photographer Dashboard (+3 more)

### Community 69 - "1. Hasil Scanning & Analisis Arsitektur Saat Ini"
Cohesion: 0.18
Nodes (10): 1. Hasil Scanning & Analisis Arsitektur Saat Ini, 2. Rencana Implementasi & Migrasi RLS (Minimalisir Error), 3. Kesimpulan & Langkah Selanjutnya, A. Penggunaan "Anon Key" Secara Luas, Audit Keamanan & Rencana Migrasi Supabase SapaTamu, B. Kelemahan Arsitektur Tanpa RLS, C. Menjawab Pertanyaan: "Apakah GAS Simpan ke Supabase secara Background Aman?", Fase 1: Upgrade Kunci Keamanan di Backend GAS (Tanpa Downtime) (+2 more)

### Community 70 - "Spec: sortir.html (Open-Source Photo Culling Plugin)"
Cohesion: 0.20
Nodes (9): 1. `sortir_events`, 2. `sortir_selections`, Boundaries, Database Schema (Supabase), Design System & Theme Harmony, Objective, Project Structure, Spec: sortir.html (Open-Source Photo Culling Plugin) (+1 more)

### Community 72 - "config.js"
Cohesion: 0.31
Nodes (6): clearSession(), csrfHeaders(), generateCsrfToken(), getSession(), NOTE: sessionStorage TIDAK bisa cross-subdomain (sapatamu.id → fazafarid.sapatam, startSessionWatchdog()

### Community 73 - "🛠️ Standar Implementasi 4-Langkah"
Cohesion: 0.22
Nodes (8): 📌 Checklist Pengujian Kualitas UI/UX, Langkah 1: Tambahkan CSS Animasi Shimmer & Async Image Class, Langkah 2: Set Skeleton Container pada HTML Awal (Detik ke-0) & Fungsi Skeleton JS, Langkah 3: Render Gambar secara Asynchronous dengan Lazy Loading (`loading="lazy"` & `decoding="async"`), Langkah 4: Optimasi API Backend Serverless dengan `Promise.all()` (<120ms), 🎯 Manfaat Arsitektur & Prinsip Utama, ⚡ Skill: Instant Skeleton Loading & Async Progressive Image Shimmer, 🛠️ Standar Implementasi 4-Langkah

### Community 74 - "LAPORAN AUDIT & SINKRONISASI DATABASE SAPATAMU"
Cohesion: 0.25
Nodes (7): 1. Verifikasi Secret `service_role` Supabase, 2. Tabel Arsitektur Alur Data, 3. Audit Halaman Individual & Potongan Kode, 4. Ringkasan Status Debugging, A. Registrasi Tamu & Penambahan Onsite (Arsitektur GAS-First), B. Check-in Usher & Kiosk (Arsitektur Supabase-First), LAPORAN AUDIT & SINKRONISASI DATABASE SAPATAMU

### Community 75 - "1. Executive Summary"
Cohesion: 0.14
Nodes (13): 1.1 Visi Produk, 1.2 Tagline, 1.3 Model Bisnis, 1. Executive Summary, 2. Kategori Vendor, 3.1 Visi & Tujuan Utama, 3.2 Alur Transaksi Tokopedia/Shopee Model (Escrow Lifecycle), 3.3 Status Lifecycle Pesanan & Escrow (+5 more)

### Community 76 - "Security Fix Checklist — SapaTamu.Ku"
Cohesion: 0.29
Nodes (6): CRITICAL (7), HIGH (16), LOW (14), MEDIUM (12), Progress, Security Fix Checklist — SapaTamu.Ku

### Community 77 - "Arsip Kode: Penerjemah Indeks Manual"
Cohesion: 0.29
Nodes (6): Arsip Kode: Penerjemah Indeks Manual, Catatan, Contoh Output `.bat` (Windows), Contoh Output `.command` (macOS), Kode Lengkap, Perbandingan dengan PnP Copy Script

### Community 78 - "AUDIT REPORT & TASK DIRECTIVE: Wishes & Prayers Module"
Cohesion: 0.29
Nodes (6): 🔍 AUDIT FINDINGS (Root Cause Analysis), AUDIT REPORT & TASK DIRECTIVE: Wishes & Prayers Module, 🎯 OBJECTIVE FOR AGENT MANAGER, Phase 1: Frontend Update (`undangan.html`), Phase 2: Backend Update (`backend/CentralBackend.gs` or `Main.gs`), 🛠️ REQUIRED ACTIONS (PATCH INSTRUCTIONS)

### Community 79 - "Panduan Implementasi Agentic AI Monitoring v2.5"
Cohesion: 0.29
Nodes (6): Langkah 1: Setup Tabel & RLS di Supabase, Langkah 2: Setup Environment Variables di Vercel, Langkah 3: Setup Webhook di Supabase, Langkah 4: Cara Logging dari Google Apps Script (GAS), Langkah 5: Pengujian Real-time, Panduan Implementasi Agentic AI Monitoring v2.5

### Community 80 - "Setup Guide: Google Drive Image Storage"
Cohesion: 0.29
Nodes (6): Sapatamu Marketplace — Manual Setup (4 Steps), Setup Guide: Google Drive Image Storage, Step 1 — Buat Folder di Google Drive, Step 2 — Buat Google Apps Script Project Baru, Step 3 — Deploy sebagai Web App, Step 4 — Simpan URL ke Vercel Environment Variable

### Community 81 - "🔴 Phase 0 — Fondasi (Database + API)"
Cohesion: 0.22
Nodes (8): Database Schema, Frontend Pages (in marketplace/frontend/), GAS — MarketplaceUpload.gs, Living Task List, 🔴 Phase 0 — Fondasi (Database + API), 🟡 Phase 2 — Verifikasi Vendor & Promo Diskon (Done), 🔵 Phase 3 — Sapatamu Gateway (Rekening Bersama / Escrow), TODO — Sapatamu Marketplace

### Community 82 - "Arsip Kode: PnP Copy Script (Lokal)"
Cohesion: 0.33
Nodes (5): Arsip Kode: PnP Copy Script (Lokal), Catatan Perubahan, Contoh Output `.bat` (Windows), Contoh Output `.command` (macOS), Kode Lengkap

### Community 83 - "Deploy Database Schema ke Supabase"
Cohesion: 0.33
Nodes (5): Cara Deploy via Supabase Dashboard (SQL Editor), Deploy Database Schema ke Supabase, Sapatamu Marketplace — Phase 0: Database Setup, Urutan Eksekusi, Verifikasi Setelah Deploy

### Community 84 - "Todo Checklist: sortir.html Open-Source"
Cohesion: 0.40
Nodes (4): Phase 1: Database & Routing Setup, Phase 2: Photographer Dashboard Mode, Phase 3: Client Culling Mode, Todo Checklist: sortir.html Open-Source

### Community 85 - "03_products.sql"
Cohesion: 0.60
Nodes (4): mp_products, mp_sync_vendor_price_from(), trg_mp_products_sync_price, trg_mp_products_updated_at

### Community 86 - "04_inquiries.sql"
Cohesion: 0.50
Nodes (4): mp_increment_vendor_inquiry(), mp_inquiries, trg_mp_inquiries_increment_count, trg_mp_inquiries_updated_at

### Community 88 - "SPEC — Sapatamu Marketplace Technical Specification"
Cohesion: 0.25
Nodes (7): 1. File Structure (Marketplace Files), 2.1 Skema Tabel Database Baru (SQL Phase 3), 2.2 Endpoint API Phase 3, 2.3 Mekanisme Proteksi & Otomasi (Auto-Complete & Payout), 2. Arsitektur Phase 3 — Sapatamu Gateway (Escrow System), SPEC — Sapatamu Marketplace Technical Specification, Technical Design Document

### Community 89 - "opencode.json"
Cohesion: 0.50
Nodes (3): plugin, $schema, @omniroute/opencode-plugin

### Community 90 - "02_vendors.sql"
Cohesion: 0.67
Nodes (3): mp_set_updated_at(), mp_vendors, trg_mp_vendors_updated_at

### Community 91 - "05_reviews.sql"
Cohesion: 0.83
Nodes (3): mp_reviews, mp_sync_vendor_rating(), trg_mp_reviews_sync_rating

### Community 102 - "HIGH TASKS (16)"
Cohesion: 0.09
Nodes (21): 10. Referensi & Pertautan, 11.1 Dashboard Task = Form Detail per Tugas, 11.2 Landing Page "Wedding Checklist" + Pintu Masuk, 11. Catatan Implementasi Sandbox (Prototype UI) — 2026-08-16, 1. Visi, 2. Value Proposition: "Kenapa Booking Lewat Sapatamu?", 3.1 Fondasi (sudah ada di codebase), 3.2 Desain (+13 more)

### Community 103 - "Spec: Phase 2 — Verifikasi Akun Vendor & Promo Diskon Marketplace"
Cohesion: 0.15
Nodes (12): Batasan, Command & Verifikasi (tidak ada test framework / build step di repo), Endpoints Baru (api/mp.js, Node, semuanya POST), Objective, Perubahan Frontend, Risiko & Mitigasi, Schema (SQL migration `sql/marketplace/08_vendor_verification_promo.sql`), Spec: Phase 2 — Verifikasi Akun Vendor & Promo Diskon Marketplace (+4 more)

### Community 104 - "Plan: Phase 2 — Verifikasi Vendor & Promo Diskon"
Cohesion: 0.22
Nodes (8): Plan: Phase 2 — Verifikasi Vendor & Promo Diskon, T10: Verifikasi + deploy per milestone, T1: Migration SQL, T2: Auth backend (api/mp.js), T3: Product/vendor write (api/mp.js), T4: Public poly (api/mp-public.js), T5: OG (lib/og-shared.js), T6-T9: Frontend (sesuai spec)

### Community 105 - "08_vendor_verification_promo.sql"
Cohesion: 0.67
Nodes (3): mp_products, mp_vendors, vendor_otp

### Community 107 - "MEDIUM TASKS (12)"
Cohesion: 0.15
Nodes (13): M10. Expose Safe Profile View (Keep SSID for Frontend Resolution), M11. Restrict system_logs INSERT, M12. Restrict terminated_sessions SELECT, M1. Security Headers, M2. CORS Config, M3. .gitignore Fix, M4. CSP Meta Tags, M5. Sanitize Push Notifications (+5 more)

## Knowledge Gaps
- **459 isolated node(s):** `config`, `DEFAULT_CATEGORIES`, `CORS`, `CACHE_PUBLIC`, `CACHE_LONG` (+454 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Security Fix Tasks — SapaTamu.Ku` connect `Vercel API: Get Email Handler` to `MEDIUM TASKS (12)`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **What connects `config`, `DEFAULT_CATEGORIES`, `CORS` to the rest of the system?**
  _459 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Project Dependencies & Package Config` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `Vercel API: Get Email Handler` be split into smaller, more focused modules?**
  _Cohesion score 0.047619047619047616 - nodes in this community are weakly interconnected._
- **Should `AGENT.md — SapaTamu Project Agent Operating System` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Should `HIGH — Temuan Detail` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._
- **Should `Security Fix Plan — SapaTamu.Ku` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._