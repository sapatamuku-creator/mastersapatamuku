# RELEASE NOTES - VERSION 2.8

**Release Date:** 3 Agustus 2026  
**System:** SapaTamu.Ku Welcome Sign & Config Display Engine

---

## 🌟 FITUR BARU & PENINGKATAN UTAMA

### 1. 🎬 Hybrid Media Background Carousel (`welcome.html`)
- **YouTube Prewedding Video (Autoplay Sinematik)**:
  - Pengguna dapat memasukkan link YouTube Prewedding (`youtube.com` / `youtu.be`).
  - Sistem secara otomatis mengonversi ke embed autoplay tanpa kontrol, tanpa suara (*mute*), dan looping sempurna (*zero-control background video*).
- **Google Drive Video & Foto Support**:
  - Mengintegrasikan player embed resmi Google Drive (`/file/d/ID/preview`) yang 100% stabil untuk video ukuran besar.
  - Mengonversi link foto Google Drive ke format resolusi tinggi `drive.google.com/thumbnail?id=ID&sz=w1920`.
- **Direct MP4 Support**:
  - Mendukung file `.mp4` langsung melalui tag native `<video autoplay muted loop playsinline>`.

### 2. ⚡ Instant Supabase Config Sync (`<300ms`)
- Halaman `config.html` kini memperbarui tabel Supabase `config_welcome` secara **langsung (<300ms)** saat pengguna mengklik *"Simpan ke Server"*.
- Halaman TV `welcome.html` menerima update galeri foto & video terbaru secara **real-time** tanpa penundaan cache backend.

### 3. 🛠️ Dedicated Media Action Buttons (`config.html`)
- Memisahkan tombol aksi galeri menjadi dua:
  - **`📷 + TAMBAH FOTO`**: Khusus format gambar HD.
  - **`🎥 + TAMBAH VIDEO MP4`**: Khusus format video Google Drive / YouTube / MP4.
- Menambahkan badge visual (`📷 Foto`, `🎥 Video Drive`, `🎥 Video YouTube`, `🎥 Video MP4`) pada pratinjau media.

---

## 📝 FILE YANG DIUPDATE (V2.8)
1. `welcome.html` — Upgrade initSlideshow engine & YouTube embed handler.
2. `config.html` — UI dual button, pratinjau media, & Supabase instant sync.
3. `vercel.json` — CSP update untuk `drive.usercontent.google.com` & `media-src`.
4. `sw.js` — Passthrough request cross-origin media.

---
*Dikembangkan dengan penuh dedikasi untuk keandalan dan keindahan SapaTamu.Ku.*
