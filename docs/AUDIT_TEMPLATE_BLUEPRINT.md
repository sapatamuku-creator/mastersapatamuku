# Blueprint Arsitektur: Dynamic Multi-Template System SapaTamu.Ku

Dokumen ini adalah cetak biru (blueprint) untuk arsitektur pengembangan SapaTamu.Ku di masa depan, khususnya dalam mengelola ratusan template undangan digital secara efisien tanpa hardcode.

## 1. Migrasi Template WordPress ke SapaTamu
- **Status:** Sangat Bisa (Tidak Instan)
- **Metode:** Template WordPress (yang menggunakan PHP/MySQL) harus diekstraksi/di-*export* terlebih dahulu menjadi format statis (HTML, CSS, Vanilla JS murni). 
- **Integrasi:** Setelah menjadi HTML murni, teks statis di dalamnya akan diganti dengan "Class Target" standar SapaTamu agar bisa dirender secara dinamis oleh JSON Supabase.

---

## 2. Arsitektur Global Template & Dynamic Renderer
Menggunakan arsitektur "Single Page Application (SPA) Cangkang" yang memisahkan antara Editor dan Tampilan.

### A. Halaman Publikasi (`undangan.html`)
- Bertindak sebagai "Cangkang Utama" (Satu file untuk semua klien).
- Saat diakses, sistem memanggil JSON klien dari Supabase.
- Berdasarkan `theme_id` di JSON, halaman ini akan melakukan *fetch* struktur HTML dan CSS mentah dari folder `/assets/templates/nama-tema/`.
- Menyuntikkan data JSON secara otomatis ke elemen HTML yang di-*fetch* tersebut.

### B. Halaman Editor (`config_invitation.html`)
- Bertindak sebagai "Control Panel Builder".
- Sepenuhnya didorong oleh skema (JSON Schema-Driven UI).
- Panel kiri (Form) otomatis menyesuaikan jumlah dan jenis input berdasarkan file `schema.json` yang dimiliki oleh tema yang dipilih.
- Hasil input Klien di-push ke Supabase dan Google Sheets (`InvConfig`).

### C. Struktur Folder Standard
```text
/ (root)
├── undangan.html
├── config_invitation.html
├── katalog_undangan.html
├── /assets
│   └── /templates
│       ├── /classic-blue
│       │   ├── layout.html (Struktur HTML murni)
│       │   ├── style.css   (Desain khusus tema)
│       │   ├── schema.json (Otak Control Panel untuk tema ini)
│       │   └── cover.webp  (Thumbnail katalog)
```

---

## 3. Auto-Discovery Katalog Tema & Auto-Thumbnail
Sistem ini menggunakan level otomatisasi tinggi (Zero Hardcoding).

- **Skrip Deteksi:** Menggunakan Build Script Node.js (saat Push/Deploy ke Vercel) untuk memindai folder `/assets/templates/` dan menyatukannya ke `master_templates.json`.
- **Thumbnail Otomatis:** Menggunakan skrip `take_all_screenshots.js` (Puppeteer) yang sudah ada di repositori untuk otomatis mengambil tangkapan layar `layout.html` setiap kali ada folder tema baru, menjadikannya `cover.webp`.
- **Hasil:** File `katalog_undangan.html` cukup me-looping data `master_templates.json` untuk menampilkan galeri tema. Anda hanya perlu mem-paste folder baru, jalankan `run_update.bat`, dan tema langsung otomatis muncul di Katalog.

---

## 4. JSON Schema-Driven UI (Adaptasi Control Panel Dinamis)
Control Panel (`config_invitation.html`) dijamin "Tahan Banting" terhadap keliaran desain tema apa pun.

- Jika tema hanya butuh 1 foto pria, `schema.json` memintanya, panel menampilkan 1 form input.
- Jika tema butuh "Carousel" 5 foto pria, `schema.json` meminta tipe *Array*, panel otomatis mereproduksi tombol "Tambah Foto" dan JSON menyimpannya dalam bentuk:
  ```json
  "groom": {
     "photos": ["url1", "url2", "url3"]
  }
  ```
- *Engine Mapper* akan mengenali bahwa itu *Array* dan me-looping penyuntikannya ke elemen HTML `.groom-carousel-img` di dalam template.

---

## 5. Kerangka Utama Data Mapper (The Script Detector)
Kamus Baku (Standard Schema Registry) yang **wajib** digunakan oleh setiap template HTML baru. Sebagai AI pendamping, Anda dapat menyerahkan HTML mentah tema baru kepada saya untuk diselaraskan secara otomatis dengan *class* berikut:

### A. Konfigurasi Global & Teks Utama
| Key JSON | CSS Class Target (di Template) | Deskripsi |
| :--- | :--- | :--- |
| `data.headerLabel` | `.header-label-text` | Label kecil di atas nama pengantin |
| `data.hashtag` | `.hashtag-text` | Hashtag unik pernikahan |
| `data.coverBg` | `#cover img` | Latar belakang halaman *Cover* |
| `data.heroImg` | `.hero-image` | Gambar utama di halaman depan / *Hero Section* |
| `data.weddingDate` | `.wedding-date-text` | Tanggal pernikahan format teks |
| `data.greeting` | `.greeting-text` | Teks sapaan untuk tamu undangan |
| `data.musicUrl` | `audio#main-audio` | Tautan file `.mp3` lagu latar |

### B. Mempelai Pria (`data.groom`) & Wanita (`data.bride`)
Semua template harus menyertakan kelas berikut pada elemen informasi pengantin. Ganti awalan `groom-` menjadi `bride-` untuk mempelai wanita.
| Key JSON | CSS Class Target | Deskripsi |
| :--- | :--- | :--- |
| `data.groom.header` | `.groom-header-text` | Judul (e.g., "The Groom") |
| `data.groom.name` | `.groom-name-text` | Nama lengkap mempelai pria |
| `data.groom.desc` | `.groom-desc-text` | Silsilah / Nama orang tua mempelai pria |
| `data.groom.photo` | `.groom-photo-img` | URL Foto mempelai pria |
| `data.groom.ig` | `.groom-ig-link` | Tautan/teks akun Instagram |

### C. Acara / Event (`data.ev1` dan `data.ev2`)
Ganti awalan `ev1-` dengan `ev2-` untuk acara kedua (misal: Resepsi).
| Key JSON | CSS Class Target | Deskripsi |
| :--- | :--- | :--- |
| `data.ev1.name` | `.ev1-name-text` | Nama acara (e.g., "Akad Nikah") |
| `data.ev1.date` | `.ev1-date-text` | Tanggal acara |
| `data.ev1.time` | `.ev1-time-text` | Jam pelaksanaan |
| `data.ev1.locName`| `.ev1-loc-text` | Alamat lengkap lokasi |
| `data.ev1.photo` | `.ev1-photo-img` | Foto lokasi / ilustrasi acara |
| `data.ev1.maps` | `.ev1-maps-btn` | Tautan tombol Google Maps |

### D. Tanda Kasih / Gifts (`data.gifts` array)
Sistem SapaTamu.Ku mendukung hingga 3 jenis hadiah/rekening. Gunakan awalan `gift1-`, `gift2-`, dan `gift3-`.
| Key JSON | CSS Class Target | Deskripsi |
| :--- | :--- | :--- |
| `data.gifts[0].acc`| `.gift1-acc-text` | Nomor rekening / dompet digital |
| `data.gifts[0].owner`| `.gift1-owner-text` | Atas nama pemilik rekening |

### E. Visibilitas Bagian (Section Toggle)
Data Mapper juga membaca boolean *string* (`"true"` atau `"false"`) untuk menyembunyikan fitur yang dinonaktifkan oleh Klien.
- `data.show_groom` $\rightarrow$ Menyembunyikan `#groom-section`
- `data.show_bride` $\rightarrow$ Menyembunyikan `#bride-section`
- `data.show_events` $\rightarrow$ Menyembunyikan `#events-section`
- `data.show_gift` $\rightarrow$ Menyembunyikan `#gift-section`
- `data.show_gallery` $\rightarrow$ Menyembunyikan `#gallery-section`
- `data.show_wishes` $\rightarrow$ Menyembunyikan `#wishes-section`

---
**Catatan Akhir:** File ini bertindak sebagai pedoman navigasi absolut. Kapanpun ingin memulai perombakan, menambah fitur JSON, atau membeli template mentah, referensikan kerangka kerja di atas untuk menjaga kestabilan kode yang sudah berjalan.
