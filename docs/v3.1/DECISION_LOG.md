# Decision Log — SapaTamu v3.1 (Live Progress UX & Telemetry)

> Catat setiap GATE `skill-decision-gate` di sini. Satu baris per task. Jujur, ringkas.

| Tanggal | Task | Keputusan | Alasan / Risiko yang disetujui |
| :--- | :--- | :--- | :--- |
| 2026-08-21 | T1.1 `formulir_tamu.html` Live Progress | LANJUT | Menambahkan `#liveProgressOverlay` dan live telemetry counter pada import Excel, sinkronisasi DB ⇄ Sheet, dan bulk duplicate delete. Responsif di desktop, tablet, mobile. User: lanjut |
| 2026-08-21 | T1.2 `wa_blast.html` WA Blast Live Progress & Cooldown | LANJUT | Menggantikan spinner statis `toggleProcessing` pada `executeMassBlast` dengan live telemetry progress bar (X / Y Pesan) dan visual cooldown countdown bar (60 detik). User: lanjut |
| 2026-08-21 | T1.3 `sortir.html` Standardisasi Modal SapaTamu | LANJUT | Menyeragamkan modal progress `#progress-modal` pada direct browser export dan local photo copy dengan visual SapaTamu (Warm Sand, Gold gradient bar, percentage pill). User: lanjut |
| 2026-08-21 | T1.4 `sync_queue.js` Offline Telemetry Sync | LANJUT | Menambahkan pelacakan peak antrean offline, live percentage `Sync: X/Y (Z%)`, dan popup sukses transien saat semua data tersinkronisasi. User: lanjut |
| 2026-08-21 | T1.5 `analytics.html` & `dashboard.html` Loaders | LANJUT | Menambahkan skeleton placeholder shimmer saat inisialisasi analitik dan transisi lembut saat sync data client di dashboard. User: lanjut |
| 2026-08-21 | T1.6 `formulir_tamu.html` Dynamic Hero Ambient Photo Slideshow | LANJUT | Menambahkan random starting photo on refresh, smooth crossfade looping (8.5s), frosted glass overlay, dan 3 responsive breakpoints menggunakan aset `config_welcome`. User: lanjut |

---

## Cara pakai
- Saat GATE disetujui user (`LANJUT`), tambahkan baris di tabel atas.
- Jika `TOLAK`/`TUNDA`, tulis alasan.
- Jangan hapus baris lama — ini audit trail.

## Guardrail v3.1
- Tidak mengubah route URL atau format payload data ke backend GAS/Supabase/Fonnte.
- UI konsisten dengan palet tema SapaTamu (Warm Sand `#FFF9F5`, Warm Dark Brown `#4A3F35`, Gold `#C8962E`, Rose `#E07B7B`).
- Seluruh overlay progress wajib responsive di 3 viewport: Desktop (≥1024px), Tablet (768–1023px), Mobile (<768px).
