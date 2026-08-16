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
