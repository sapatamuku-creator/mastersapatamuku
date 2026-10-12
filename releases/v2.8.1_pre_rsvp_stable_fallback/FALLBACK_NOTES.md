# Fallback Snapshot: v2.8.1 Pre-RSVP Dashboard Stable Release

**Tanggal**: 2026-10-12  
**Tujuan**: Mengamankan kode stabil sebelum implementasi fitur **Realtime RSVP Dashboard & Link Open Tracking (FEAT-RSVP-DASHBOARD)**.

### Berkas yang Diamankan:
1. `formulir_tamu.html` (423,308 bytes) — Versi stabil Buku Tamu Digital sebelum penambahan Mini Overview Strip RSVP & badge status.
2. `rsvp.html` (61,332 bytes) — Versi stabil formulir RSVP sebelum penambahan silent link-opened ping.
3. `dashboard.html` (75,900 bytes) — Versi stabil dashboard menu sebelum penambahan kartu RSVP Dashboard.
4. `wa_blast.html` (84,160 bytes) — Versi stabil konsol WA Blast sebelum sinkronisasi status RSVP.

### Cara Rollback Cepat (Jika Dibutuhkan):
Cukup salin kembali berkas-berkas di dalam direktori ini ke root project:
```powershell
Copy-Item "releases\v2.8.1_pre_rsvp_stable_fallback\*.html" -Destination ".\" -Force
```
