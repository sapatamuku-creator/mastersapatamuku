# Decision Log — SapaTamu Guestbook v3.0

> Catat setiap GATE `guestbook-v3-gate` di sini. Satu baris per task. Jujur, ringkas.

| Tanggal | Task | Keputusan | Alasan / Risiko yang disetujui |
|---------|------|-----------|--------------------------------|
| 2026-05-13 | T0.1 Instrumentasi performa | LANJUT | Overhead <1ms, 20 entri terakhir di localStorage, jujur tanpa ubah route. User: lanjut |
| 2026-05-13 | T2.5 Dual View vs Paginasi | LANJUT (ubah) | Ganti paginasi halaman → Card (default) + Details windowed infinite + chunked fetch 100/offset di checkin/onsite; kiosk tetap 1 mode. Alasan: UX lapangan butuh scan padat tanpa ingat halaman. Tidak ubah backend route. |
| 2026-05-13 | T0.2 Audit RLS & payload | LANJUT | Hanya baca & catat baseline, tidak ubah RLS/endpoint. Jika longgar, RFC terpisah. User: lanjut Phase 0 |
| 2026-05-13 | T1.1 Tailwind build statis | LANJUT | Ganti cdn.tailwindcss.com → assets/tailwind.css 19KB (fallback onerror ke CDN). Risiko purge miss: mitigasi staging visual check. Tidak ubah route. User: lanjut |
| 2026-05-13 | T1.2 Debounce search 250ms | LANJUT | Debounce input only (rAF+250ms), global renderUI tetap immediate untuk programmatic. Risiko delay 250ms terasa nggantung tapi anti-freeze. Tidak ubah route. User: lanjut |
| 2026-05-13 | T1.3 Cursor & reduced-motion | LANJUT | Cursor none hanya saat fullscreen (is-fullscreen), reduce-motion matikan hearts/char. Risiko sangat rendah, debug jadi mudah. Tidak ubah route. User: setuju |
| 2026-05-13 | T1.4 Fix radio/checkbox 14px | LANJUT | Scoped 14px untuk guest-item/#guest-list/#kiosk-search-list, cegah melar 100%. Risiko sangat rendah, tidak ubah cam-toggle. Tidak ubah route. User: lanjut |

## Cara pakai
- Saat GATE disetujui user (`LANJUT`), tambahkan baris di tabel atas.
- Jika `TOLAK`/`TUNDA`, tulis alasan (mis. "butuh RFC backend baru").
- Jangan hapus baris lama — ini audit trail.

## Guardrail v3.0 (diulang agar jelas)
- Tidak ubah jalur route/backend yang sudah ada.
- Selfie tetap ke Drive via GAS `action=confirm_checkin` — hanya kompresi client.
- Optimasi hanya anti-bug & selaras antar halaman (kiosk, checkin, onsite, analytics, welcome).
