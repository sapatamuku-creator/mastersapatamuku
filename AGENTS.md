## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## UI/UX & Responsive Rules

- Use the `ui-ux-pro-max` skill (`.claude/skills/ui-ux-pro-max/`) when designing, building, reviewing, or fixing any interface (pages, components, layout, typography, color, interaction, accessibility).
- Setiap instruksi update code yang menyentuh UI/frontend wajib ditulis untuk **tiga versi responsif**: desktop, tablet, dan mobile. Selalu pertimbangkan breakpoint kontainer/grid (bucket desktop ≥1024px, tablet 768–1023px, mobile <768px) agar tidak ada bug saat berpindah mode. Jangan hanya menyelesaikan satu layout lalu mengabaikan yang lain.
- Gunakan teknik container/grid responsive atau media query yang konsisten dengan file yang diedit; uji logika layout di ketiga mode sebelum dianggap selesai.

## Decision Gate

- Use the `skill-decision-gate` skill (`.agents/skills/skill-decision-gate/` & `.claude/skills/skill-decision-gate/`) before implementing any task, feature, refactor, or bugfix in this project.
- Wajib jelaskan 5 poin format (fungsi perubahan, dari kode sebelumnya, mengarah kemana, cabang routing terdampak, risiko & trade-off jujur).
- Tunggu persetujuan eksplisit user sebelum mulai menulis kode.

## Skill Installation Dual-Sync Policy

- Setiap kali menginstal/menambah/memperbarui skill atau plugin baru:
  1. Wajib pasang di **Workspace** (`.agents/skills/` & `.claude/skills/`).
  2. Wajib auto-sync/pasang di **Global IDE** (`C:\Users\KNOWHERE STUDIO\.gemini\config\skills\`) agar langsung tersedia di semua workspace.
  3. Catat di `skills-lock.json` dan `AGENT.md`.

## Vercel & Supabase Free Tier Architecture Policy

- Proyek ini berjalan di **Vercel Free Tier (Hobby)** dan **Supabase Free Tier**.
- **Limit Vercel Serverless Function**: Maksimal 12 file endpoint API di direktori `/api`.
- **Aturan Konsolidasi Monolith**: Seluruh modul domain backend (seperti Marketplace di `api/mp.js` dan Sortir di `api/sortir.js`) wajib dikonsolidasikan ke dalam 1 file dispatcher per domain menggunakan query param `action` / `endpoint` (`/api/sortir?action=...` atau rewrite `/api/sortir/:path*`), DILARANG memecah menjadi banyak file `.js` terpisah di `/api` agar tidak melampaui limit Vercel Free Tier.



