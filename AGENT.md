# AGENT.md — SapaTamu Project Agent Operating System

**Versi:** 2.6.3-pre-release-culling-sortir
**Status:** Sumber pedoman utama untuk rancangan agent eksekusi
**Terakhir diperbarui:** 2026-07-19

---

## 1. Identitas Proyek

| Properti | Nilai |
|----------|-------|
| Nama | SapaTamu — Sistem Manajemen Tamu Event |
| Domain | **sapatamu.id** |
| Arsitektur | Vanilla HTML/JS/CSS + Google Apps Script + Supabase |
| Frontend | HTML5, CSS3, JavaScript vanilla (tanpa framework) |
| Backend | Google Apps Script (.gs) |
| Database | Supabase (PostgreSQL + Auth + Realtime) |
| Deployment | **Vercel** (via GitHub) |
| Repository | GitHub (private) |
| Versi Saat Ini | v2.6.3-pre-release-culling-sortir |

---

## 2. Hierarki Referensi Agent

Semua agent eksekusi di proyek ini HARUS merujuk pada hierarki berikut:

```
AGENT.md                              ← DOKUMEN UTAMA (Anda sedang membaca)
├── skills-lock.json                  ← Index skill yang terinstal (38 skill)
├── .agents/                          ← SEMUA komponen agent (sumber utama)
│   ├── AGENTS.md                     ← Agent rules dari addyosmani
│   ├── CLAUDE.md                     ← Claude Code instructions
│   ├── skills/                       ← 38 Skill definition files
│   │   ├── (5) animation-vocabulary, apple-design, emil-design-eng, improve-animations, review-animations
│   │   ├── (2) supabase, supabase-postgres-best-practices
│   │   ├── (7) deploy-to-vercel, frontend-design, ui-ux-pro-max, clone-website, skill-decision-gate, guestbook-v3-gate, live-progress-ux
│   │   └── (24) addyosmani skills (spec-driven, code-review, security, dll)
│   ├── agents/                       ← 4 Persona definitions
│   │   ├── code-reviewer.md
│   │   ├── security-auditor.md
│   │   ├── test-engineer.md
│   │   └── web-performance-auditor.md
│   ├── references/                   ← 7 Checklist & pattern catalog
│   │   ├── accessibility-checklist.md
│   │   ├── definition-of-done.md
│   │   ├── observability-checklist.md
│   │   ├── orchestration-patterns.md
│   │   ├── performance-checklist.md
│   │   ├── security-checklist.md
│   │   └── testing-patterns.md
│   ├── commands/                     ← 8 Slash commands (build, review, ship, dll)
│   ├── docs/                         ← 10 Documentation files
│   └── hooks/                        ← Git hooks & scripts
├── agent-skills/                     ← Source repository (reference only)
├── docs/                             ← Proyek dokumentasi
│   └── MIGRATION_OPSI_C_EDGE_FUNCTION.md
└── releases/                         ← Release archive
```

---

## 3. Model Eksekusi Agent

### 3.1 Aturan Inti

1. **Skill-First Execution** — Jika task cocok dengan skill, WAJIB gunakan skill tool
2. **No Bypass** — Tidak boleh skip langkah wajib (spec, plan, test)
3. **Context-Aware** — Selalu baca file proyek sebelum membuat keputusan
4. **Minimal Change** — Ubah sesedikit mungkin, jangan rewrite tanpa alasan

### 3.2 Intent → Skill Mapping

| User Intent | Skill yang Digunakan | Urutan |
|-------------|---------------------|--------|
| Fitur baru / functionality | `spec-driven-development` → `incremental-implementation` → `test-driven-development` | 1→2→3 |
| Perencanaan / breakdown | `planning-and-task-breakdown` | 1 |
| Bug / error / perilaku tak terduga | `debugging-and-error-recovery` | 1 |
| Code review | `code-review-and-quality` | 1 |
| Refactoring / simplifikasi | `code-simplification` | 1 |
| API / interface design | `api-and-interface-design` | 1 |
| UI / frontend work | `frontend-ui-engineering` | 1 |
| Database / query optimization | `supabase-postgres-best-practices` | 1 |
| Animasi / motion design | `emil-design-eng` → `review-animations` | 1→2 |
| Security audit | `security-and-hardening` | 1 |
| Performance audit | `performance-optimization` | 1 |
| Deployment / Vercel config | `shipping-and-launch` | 1 |

### 3.3 MCP Servers yang Relevan

| MCP Server | Fungsi | Status |
|------------|--------|--------|
| Supabase MCP | Live database access, query, migrate | ✅ Wajib |
| GitHub MCP | Repo access, issues, PRs, commits | ✅ Wajib |
| Vercel MCP | Deployment, preview URLs, logs | ✅ Wajib |
| Sentry MCP | Error tracking & performance | ⚠️ Opsional |

### 3.4 Lifecycle Tanpa Slash Command

OpenCode tidak mendukung slash command. Agent harus mengikuti lifecycle ini secara internal:

```
DEFINE    → spec-driven-development
PLAN      → planning-and-task-breakdown
BUILD     → incremental-implementation + test-driven-development
VERIFY    → debugging-and-error-recovery
REVIEW    → code-review-and-quality
DEPLOY    → shipping-and-launch (Vercel auto-deploy via GitHub)
```

---

## 4. Persona Agent yang Tersedia

Persona adalah role dengan perspektif dan format output tertentu. Persona **tidak boleh** memanggil persona lain.

### 4.1 code-reviewer

| Properti | Nilai |
|----------|-------|
| File | `agent-skills/agents/code-reviewer.md` |
| Fokus | Correctness, Readability, Architecture, Security, Performance |
| Output | Review Summary dengan kategori Critical/Important/Suggestion |
| Invokasi | `/review` atau `/ship` (parallel fan-out) |

### 4.2 security-auditor

| Properti | Nilai |
|----------|-------|
| File | `agent-skills/agents/security-auditor.md` |
| Fokus | Vulnerability detection, threat modeling, secure coding |
| Output | Security Audit Report dengan severity classification |
| Invokasi | `/ship` (parallel fan-out) atau `/audit` |

### 4.3 test-engineer

| Properti | Nilai |
|----------|-------|
| File | `agent-skills/agents/test-engineer.md` |
| Fokus | Test strategy, test writing, coverage analysis |
| Output | Test Coverage Analysis dengan priority matrix |
| Invokasi | `/test` (TDD) atau `/ship` (parallel fan-out) |

### 4.4 web-performance-auditor

| Properti | Nilai |
|----------|-------|
| File | `agent-skills/agents/web-performance-auditor.md` |
| Fokus | Core Web Vitals, loading, rendering, network |
| Output | Web Performance Audit dengan scorecard |
| Invokasi | `/webperf` (dedicated audit) |

---

## 5. Skill yang Terinstal

### 5.1 Animation & Design Skills (emilkowalski/skills)

| Skill | Fokus | Gunakan Saat |
|-------|-------|--------------|
| `animation-vocabulary` | Terminologi animasi | Mendeskripsikan efek motion tanpa mengetahui namanya |
| `apple-design` | Apple-style UI & motion | Membangun gesture-driven UI, spring animations, drag/swipe |
| `emil-design-eng` | UI polish & component design | Keputusan animasi, detail invisible yang membuat software terasa great |
| `improve-animations` | Audit motion code | Meminta "improve the animations", "make this app feel better" |
| `review-animations` | Review animasi against craft bar | Review animasi sebelum merge |

### 5.2 Supabase Skills (supabase/agent-skills)

| Skill | Fokus | Gunakan Saat |
|-------|-------|--------------|
| `supabase` | General Supabase best practices | Bekerja dengan Supabase API, auth, realtime |
| `supabase-postgres-best-practices` | PostgreSQL optimization | Menulis/mengoptimasi SQL query, schema, RLS, indexing |

### 5.3 Deployment, Design & Tooling Skills

| Skill | Sumber | Fungsi | Status |
|-------|--------|--------|--------|
| `deploy-to-vercel` | vercel-labs/agent-skills | Deployment config, routing, cache header & optimization | ✅ Terinstal |
| `frontend-design` | anthropics/skills | Bold, distinctive, production-grade UI design & typography | ✅ Terinstal |
| `ui-ux-pro-max` | local/mastersapatamuku | Standar desain responsif 3 mode (Desktop, Tablet, Mobile) & WCAG | ✅ Terinstal |
| `clone-website` | local/mastersapatamuku | Reverse-engineer & clone website structure/assets | ✅ Terinstal |
| `skill-decision-gate` | local/mastersapatamuku | 5-point decision gate validation sebelum implementasi kode | ✅ Terinstal |
| `guestbook-v3-gate` | local/mastersapatamuku | Gate validasi khusus task/todo docs/v3.0/ | ✅ Terinstal |
| `live-progress-ux` | local/mastersapatamuku | Determinate progress & live telemetry (X dari Y) bertema SapaTamu | ✅ Terinstal |

---

## 6. Arsitektur Proyek

### 6.1 Struktur File Utama

```
mastersapatamuku/
├── *.html              ← Halaman frontend (vanilla HTML/JS/CSS)
├── *.js                ← Client-side JavaScript
├── *.css               ← Stylesheets
├── api/                ← Vercel Serverless Functions
├── assets/             ← Images, templates, static files
├── backend/            ← Google Apps Script backend (.gs files)
├── docs/               ← Proyek dokumentasi
├── .agents/skills/     ← Installed agent skills
├── agent-skills/       ← Agent skill library (reference)
├── releases/           ← Versioned releases
└── vercel.json         ← Vercel configuration
```

### 6.2 Backend Architecture (Google Apps Script)

| File | Fungsi |
|------|--------|
| `Main.gs` | Entry point utama |
| `CentralBackend.gs` | Core business logic |
| `UnifiedRouter.gs` | Request routing |
| `Analytics.gs` | Analytics & tracking |
| `WhatsAppEngine.gs` | WhatsApp integration |
| `WhatsAppFormulir.gs` | Form submission via WhatsApp |
| `MonitoringLogger.gs` | System monitoring |
| `MusicCleanup.gs` | Music file cleanup |
| `SelfieCheckin.gs` | Selfie check-in feature |
| `WelcomeSign.gs` | Welcome sign display |

### 6.3 Database Schema (Supabase)

| File | Fungsi |
|------|--------|
| `setup_sortir_schema.sql` | Main schema setup |
| `setup_presence_monitor.sql` | Presence monitoring |
| `setup_system_logs.sql` | System logging |
| `setup_config_welcome.sql` | Welcome config |
| `setup_login_rpc.sql` | Login RPC functions |
| `supabase_rls.sql` | Row Level Security policies |
| `supabase_client_metadata.sql` | Client metadata |
| `supabase_safe_view.sql` | Safe view definitions |

### 6.4 Deployment Pipeline

```
GitHub Push → Vercel Auto-Deploy → sapatamu.id
```

| Stage | Tool | Fungsi |
|-------|------|--------|
| Version Control | GitHub | Code hosting, branch management |
| CI/CD | Vercel | Auto-deploy on push to main |
| Preview | Vercel | Preview URL untuk PR |
| Production | sapatamu.id | Live domain |
| Backend | Google Apps Script | Apps Script deployment |

**Branch Strategy:**
- `main` → Production (sapatamu.id)
- `dev` / feature branches → Development
- PR → Vercel Preview URL

---

## 7. Aturan Keamanan Spesifik Proyek

### 7.1 Yang TIDAK Boleh Dilakukan

- ❌ Expose API keys atau secrets di kode
- ❌ Hardcode credentials di file frontend
- ❌ Skip RLS policy saat membuat table baru
- ❌ Query database tanpa parameterisasi
- ❌ Log sensitive data (PII, tokens, passwords)

### 7.2 Yang WAJIB Dilakukan

- ✅ Gunakan environment variables untuk secrets
- ✅ Validasi semua input di server-side
- ✅ Encode output untuk prevent XSS
- ✅ Test RLS policies sebelum deploy
- ✅ Audit dependencies untuk known vulnerabilities

---

## 8. Template Rancangan Agent Eksekusi

Ketika merancang agent baru untuk proyek ini, gunakan template berikut:

```markdown
---
name: [agent-name]
description: [Deskripsi singkat agent]
---

# [Agent Name]

## Identitas
- Role: [Peran agent]
- Fokus: [Area fokus]
- Trigger: [Kapan agent ini dipanggil]

## Scope
### Yang Dikerjakan
- [List item yang masuk scope]

### Yang TIDAK Dikerjakan
- [List item yang di luar scope]

## Workflow
1. [Langkah 1]
2. [Langkah 2]
3. [Langkah 3]

## Output Format
```markdown
## [Report Title]
### Summary
- [Summary metrics]

### Findings
- [Detailed findings]

### Recommendations
- [Actionable items]
```

## Rules
1. [Rule 1]
2. [Rule 2]
3. [Rule 3]

## Composition
- **Invoke directly when:** [Kondisi invokasi langsung]
- **Invoke via:** [Command atau method invokasi]
- **Do not invoke from another persona:** [Constraint]
```

---

## 9. Checklist Sebelum Merge

Setiap perubahan harus melewati checklist ini:

- [ ] **Correctness** — Kode melakukan apa yang seharusnya
- [ ] **Readability** — Kode bisa dipahami tanpa penjelasan
- [ ] **Architecture** — Mengikuti pola yang sudah ada
- [ ] **Security** — Input divalidasi, output diencode
- [ ] **Performance** — Tidak ada N+1, tidak ada unbounded loops
- [ ] **Testing** — Ada test untuk happy path dan edge cases
- [ ] **Documentation** — Kompleksitas dijelaskan jika perlu

---

## 10. Context Memory Strategy

Gunakan file proyek sebagai long-term memory:

| File | Fungsi | Update Saat |
|------|--------|-------------|
| `AGENT.md` | Rules utama (dokumen ini) | Perubahan arsitektur major |
| `skills-lock.json` | Index skill terinstal | Install/uninstall skill |
| `docs/` | Dokumentasi detail | Perubahan fitur major |
| `releases/` | Archive versi | Setiap release |
| `setup_*.sql` | Database schema | Perubahan schema |

---

## 11. Final Rule

> **Selalu bertindak seperti senior software engineer yang menulis kode yang mudah dipahami, digunakan, dan di-scale oleh orang lain.**

Setiap agent eksekusi di proyek ini harus:
1. Membaca dokumen ini sebelum memulai
2. Merujuk ke skill yang relevan
3. Mengikuti lifecycle yang sudah didefinisikan
4. Menghasilkan output yang terukur dan terdokumentasi
