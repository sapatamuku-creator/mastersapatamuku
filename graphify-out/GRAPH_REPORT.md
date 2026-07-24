# Graph Report - D:\Google Antigrafity\mastersapatamuku  (2026-07-21)

## Corpus Check
- Large corpus: 159 files À ~708,378 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 244 nodes · 255 edges · 58 communities (42 shown, 16 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

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
- Formulir Cleanup Script
- Form Logic Patcher
- PostgreSQL Migration: Add Subdomain to Tamu
- PostgreSQL Schema: Welcome Config Definitions
- PostgreSQL Schema: Presence Monitor Schema
- PostgreSQL Schema: System Logs Schema
- PostgreSQL Schema: Client Metadata Table
- PostgreSQL Schema: Safe View Profiles

## God Nodes (most connected - your core abstractions)
1. `updateQueueCount()` - 8 edges
2. `log()` - 7 edges
3. `processQueue()` - 7 edges
4. `initApp()` - 6 edges
5. `fetchQueue()` - 6 edges
6. `connect()` - 6 edges
7. `getDB()` - 6 edges
8. `initScanner()` - 5 edges
9. `startPolling()` - 5 edges
10. `initRealtime()` - 5 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (58 total, 16 thin omitted)

### Community 0 - "Project Dependencies & Package Config"
Cohesion: 0.10
Nodes (20): antigravity.ide.project, engine, plugins, dependencies, pdf.js-extract, pdf-parse, playwright, react (+12 more)

### Community 1 - "Authentication Guard & Session Management"
Cohesion: 0.20
Nodes (10): applyFieldGuard(), applySensitiveGuard(), applyViewOnlyContent(), checkTerminated(), getRole(), getSession(), _handleForceDisconnect(), isAuthenticated() (+2 more)

### Community 2 - "Onsite Check-in & Scanner Interface"
Cohesion: 0.23
Nodes (15): closeModal(), executePhotoCaptureOnsite(), fetchData(), initApp(), initNavScroll(), initScanner(), initSupabaseRealtimeTamu(), masterData (+7 more)

### Community 3 - "Label Printing Widget & Realtime Queue"
Cohesion: 0.36
Nodes (10): connect(), fetchQueue(), init(), initRealtime(), log(), printLabel(), processItems(), setConnected() (+2 more)

### Community 4 - "Hex & Character Encoding Fixer (V1)"
Cohesion: 0.22
Nodes (9): badHexToGood, fixAll(), formC, fs, matchArrow, matchSearch, matchTrash, path (+1 more)

### Community 5 - "Offline Sync Queue & Database Synchronization"
Cohesion: 0.58
Nodes (9): deleteItem(), enqueue(), fallbackEnqueue(), getDB(), getNextQueueItem(), processQueue(), updateQueueCount(), updateQueueIndicator() (+1 more)

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

### Community 10 - "Supabase Row Level Security (RLS) Policies"
Cohesion: 0.29
Nodes (6): clients, config_invitation, print_queue, tamu, welcome_queue, wishes_queue

### Community 11 - "Final Clean Mojibake Script"
Cohesion: 0.40
Nodes (5): fixFile(), fs, map, path, walk()

### Community 12 - "PDF Extraction & Parser Script"
Cohesion: 0.47
Nodes (5): fs, options, pdfExtract, readPDF(), run()

### Community 13 - "Script Reference Update Tool"
Cohesion: 0.33
Nodes (5): cb, fs, html, scriptStart, ur

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

### Community 20 - "Regex Content Extraction Script"
Cohesion: 0.50
Nodes (3): fs, matches, s

### Community 23 - "Temporary Scratch Patch Script"
Cohesion: 0.50
Nodes (3): fs, path, toFix

## Knowledge Gaps
- **89 isolated node(s):** `config`, `crypto`, `fs`, `path`, `timeZone` (+84 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `config`, `crypto`, `fs` to the rest of the system?**
  _89 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Project Dependencies & Package Config` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._