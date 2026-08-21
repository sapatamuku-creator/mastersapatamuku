---
name: guestbook-v3-decision-gate
description: Wajib jelaskan fungsi, asal kode, dampak, dan cabang routing sebelum implementasi task/todo v3.0. Gunakan sebelum mengerjakan task/todo apapun di docs/v3.0/ - jujur, gamblang, tanpa apresiasi/angan-angan.
---

# Guestbook v3.0 — Decision Gate

## Aturan Wajib (Gate)

Setiap kali akan mengerjakan **satu task/todo** dari `docs/v3.0/plan.md`, `docs/v3.0/tasks.md` (`task.md`), atau `docs/v3.0/todo.md`, **JANGAN langsung implementasi**. Hentikan dulu dan jelaskan ke user dalam format di bawah. Tunggu persetujuan eksplisit user sebelum menulis kode.

> Prinsip v3.0: tidak mengubah jalur route/backend yang sudah ada. Jika perubahan mengharuskan ganti route/endpoint/storage (mis. selfie Drive -> Supabase), itu diluar scope — tolak dan catat sebagai RFC terpisah.

## Format Penjelasan (wajib 5 poin, jujur apa adanya)

Gunakan template ini per task — satu task = satu gate. Bahasa Indonesia, singkat, faktual, tanpa pujian:

```
### GATE: [ID Task] — [Judul]
1. Fungsi perubahan: apa yang diubah dan untuk apa (1-2 kalimat).
2. Dari kode sebelumnya: perilaku/lokasi kode lama (file:line) dan kenapa bermasalah.
3. Mengarah kemana: perilaku baru setelah diubah, termasuk file yang tersentuh.
4. Cabang routing terdampak: daftar cabang/halaman yang ikut kena jika code dishare (kiosk, checkin, onsite, analytics, welcome, formulir_tamu). Sebut yang TIDAK kena juga agar jelas batasnya.
5. Risiko & trade-off jujur: apa yang bisa pecah, regresi, biaya, keterbatasan. Tidak perlu apresiasi. Jika tidak ada risiko, tulis "Risiko: rendah — ..." dengan alasan.
Keputusan: [LANJUT / TUNDA / TOLAK — butuh RFC]
```

## Contoh (jangan dianggap janji)

```
### GATE: T1.2 — Debounce search
1. Fungsi: kurangi freeze saat ketik cari tamu.
2. Dari kode sebelumnya: kiosk.html:827 renderKioskSearch() rebuild innerHTML tiap keystroke, 1000 tamu = 200ms block.
3. Mengarah: debounce 250ms + rAF, hanya render setelah user berhenti ketik. Sentuh kiosk.html, checkin.html, onsite.html.
4. Cabang routing: kiosk, checkin, onsite YA. analytics, welcome, formulir_tamu TIDAK.
5. Risiko: rendah — delay 250ms terasa sedikit lambat untuk cari cepat; trade-off: ketik cepat jadi lebih halus. Jika user butuh instant, turunkan ke 150ms.
Keputusan: LANJUT
```

## Larangan

- Tidak ada "keren", "mantap", "akan sangat meningkatkan" — hanya fakta terukur (mis. "payload -60%", "frame 16ms").
- Tidak mengarang jalur baru. Jika butuh endpoint/storage baru, tulis TOLAK dan catat di `docs/v3.0/DECISION_LOG.md`.
- Tidak batch 3 task sekaligus dalam 1 gate — satu gate satu task.

## Log Keputusan

Setiap gate yang disetujui/ditolak catat ringkas di `docs/v3.0/DECISION_LOG.md` (tabel: tanggal | task | keputusan | alasan). Ini jadi audit trail.

## Kapan Skill Ini Aktif

- User menyebut `docs/v3.0`, `v3.0`, `plan/task/todo`, atau akan implementasi kiosk/checkin/onsite/analytics/welcome.
- Selalu sebelum `edit`, `write`, atau `bash` yang mengubah kode v3.0.

## Verifikasi

- [ ] Gate ditulis lengkap 5 poin sebelum kode
- [ ] Cabang routing disebut eksplisit (termasuk yang tidak terdampak)
- [ ] Risiko jujur tertulis, tanpa apresiasi
- [ ] User menyetujui (LANJUT) sebelum implementasi
- [ ] Hasil dicatat di DECISION_LOG.md
