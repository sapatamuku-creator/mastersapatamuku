---
name: guestbook-v3-gate
description: Wajib jelaskan fungsi, asal kode, dampak, dan cabang routing sebelum implementasi task/todo v3.0. Gunakan sebelum mengerjakan task/todo apapun di docs/v3.0/ - jujur, gamblang, tanpa apresiasi/angan-angan.
---

# Guestbook v3.0 — Decision Gate

> Duplikat dari `docs/v3.0/skill-decision-gate/SKILL.md` agar skill dapat di-invoke via `skill` tool. Sumber kebenaran tetap di `docs/v3.0/`.

## Aturan Wajib (Gate)

Setiap kali akan mengerjakan **satu task/todo** dari `docs/v3.0/plan.md`, `docs/v3.0/tasks.md` (`task.md`), atau `docs/v3.0/todo.md`, **JANGAN langsung implementasi**. Hentikan dulu dan jelaskan ke user dalam format di bawah. Tunggu persetujuan eksplisit user sebelum menulis kode.

> Prinsip v3.0: tidak mengubah jalur route/backend yang sudah ada. Jika perubahan mengharuskan ganti route/endpoint/storage (mis. selfie Drive -> Supabase), itu diluar scope — tolak dan catat sebagai RFC terpisah.

## Format Penjelasan (wajib 5 poin, jujur apa adanya)

```
### GATE: [ID Task] — [Judul]
1. Fungsi perubahan: apa yang diubah dan untuk apa (1-2 kalimat).
2. Dari kode sebelumnya: perilaku/lokasi kode lama (file:line) dan kenapa bermasalah.
3. Mengarah kemana: perilaku baru setelah diubah, termasuk file yang tersentuh.
4. Cabang routing terdampak: daftar cabang/halaman yang ikut kena jika code dishare (kiosk, checkin, onsite, analytics, welcome, formulir_tamu). Sebut yang TIDAK kena juga agar jelas batasnya.
5. Risiko & trade-off jujur: apa yang bisa pecah, regresi, biaya, keterbatasan. Tidak perlu apresiasi. Jika tidak ada risiko, tulis "Risiko: rendah — ..." dengan alasan.
Keputusan: [LANJUT / TUNDA / TOLAK — butuh RFC]
```

## Larangan

- Tidak ada pujian/angan-angan — hanya fakta terukur.
- Tidak mengarang jalur baru. Jika butuh endpoint/storage baru, tulis TOLAK.
- Satu gate = satu task. Tidak batch.

## Log

Catat ringkas di `docs/v3.0/DECISION_LOG.md` (tanggal | task | keputusan | alasan).

## Verifikasi

- [ ] Gate 5 poin sebelum kode
- [ ] Cabang routing disebut eksplisit
- [ ] Risiko jujur tertulis
- [ ] User menyetujui sebelum implementasi
- [ ] Dicatat di DECISION_LOG.md
