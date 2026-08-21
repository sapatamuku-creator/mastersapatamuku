---
name: skill-decision-gate
description: Wajib jelaskan fungsi, asal kode, dampak, dan cabang routing sebelum implementasi task/perubahan apapun di project ini - jujur, gamblang, tanpa apresiasi/angan-angan.
---

# Project Decision Gate

> Berlaku untuk seluruh project `mastersapatamuku`. Wajib digunakan sebelum mengerjakan perubahan apapun.

## Aturan Wajib (Gate)

Setiap kali akan mengerjakan **satu task, feature, refactor, atau bugfix**, **JANGAN langsung implementasi**. Hentikan dulu dan jelaskan ke user dalam format 5 poin di bawah. Tunggu persetujuan eksplisit user sebelum menulis kode.

> Prinsip dasar: tidak mengubah jalur route/backend yang sudah ada tanpa kesepakatan eksplisit. Jika perubahan mengharuskan ganti route/endpoint/storage, itu diluar scope — tolak dan catat sebagai RFC terpisah.

## Format Penjelasan (wajib 5 poin, jujur apa adanya)

```
### GATE: [ID Task/Nama Perubahan] — [Judul]
1. Fungsi perubahan: apa yang diubah dan untuk apa (1-2 kalimat).
2. Dari kode sebelumnya: perilaku/lokasi kode lama (file:line) dan kenapa bermasalah.
3. Mengarah kemana: perilaku baru setelah diubah, termasuk file yang tersentuh.
4. Cabang routing terdampak: daftar cabang/halaman yang ikut kena jika code dishare (kiosk, checkin, onsite, analytics, welcome, formulir_tamu, dll). Sebut yang TIDAK kena juga agar jelas batasnya.
5. Risiko & trade-off jujur: apa yang bisa pecah, regresi, biaya, keterbatasan. Tidak perlu apresiasi. Jika tidak ada risiko, tulis "Risiko: rendah — ..." dengan alasan.
Keputusan: [LANJUT / TUNDA / TOLAK — butuh RFC]
```

## Larangan

- Tidak ada pujian/angan-angan — hanya fakta terukur.
- Tidak mengarang jalur baru. Jika butuh endpoint/storage baru, diskusikan/tolak.
- Satu gate = satu task. Tidak batch.

## Log

Catat ringkas di `docs/v3.0/DECISION_LOG.md` atau file log terkait (tanggal | task | keputusan | alasan).

## Verifikasi

- [ ] Gate 5 poin sebelum kode
- [ ] Cabang routing disebut eksplisit
- [ ] Risiko jujur tertulis
- [ ] User menyetujui sebelum implementasi
- [ ] Dicatat di DECISION_LOG.md
