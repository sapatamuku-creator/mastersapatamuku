# 📑 DOKUMEN AUDIT ARSITEKTUR & ROUTING KERANGKA
## SapaTamu v3.4 — Local Culling & Remote Selector System

> **Tujuan Dokumen:** Memetakan seluruh kerangka file, alur routing, mekanisme transfer data, serta analisis teknis mendalam agar dapat diaudit secara langsung dan transparan.

---

## 1. PEMETAAN FILE & PERAN DALAM SISTEM

| File | Tipe | Lokasi Eksekusi | Peran & Fungsi Utama |
| :--- | :--- | :--- | :--- |
| [`sortir_bridge.py`](file:///d:/Google%20Antigrafity/mastersapatamuku/sortir_bridge.py) | Python (FastAPI) | PC Vendor (Localhost) | Server lokal murni (`0.0.0.0:8787`). Mengindeks folder, streaming foto asli ke LAN, dan menyalin file JPG + RAW ke `Selected_by_Client`. |
| [`Buka_Sortir_Local_Bridge.bat`](file:///d:/Google%20Antigrafity/mastersapatamuku/Buka_Sortir_Local_Bridge.bat) | Batch Script | PC Vendor | Launcher 1-klik untuk Windows. Otomatis cek Python, pasang modul, dan jalankan `sortir_bridge.py`. |
| [`sortir.html`](file:///d:/Google%20Antigrafity/mastersapatamuku/sortir.html) | HTML/JS (SPA) | Browser PC & HP | Antarmuka web utama SapaTamu (Dashboard Vendor, Local Culling Lightroom, Hybrid P2P Share, dan Pinterest Culling Grid). |
| [`sw.js`](file:///d:/Google%20Antigrafity/mastersapatamuku/sw.js) | Service Worker | Browser HP / Client | Pengelola cache offline PWA (`sapatamu-pwa-v19`). |
| [`sql/setup_sortir_share.sql`](file:///d:/Google%20Antigrafity/mastersapatamuku/sql/setup_sortir_share.sql) | SQL Supabase | Cloud Database | Tabel `sortir_share_sessions` untuk signaling & pertukaran metadata antar-browser. |

---

## 2. DIAGRAM KERANGKA & ALUR ROUTING

```
                                    ┌────────────────────────────────────────┐
                                    │               PC VENDOR                │
                                    │    (Penyimpan Folder Foto Asli)        │
                                    └───────────────────┬────────────────────┘
                                                        │
                      ┌─────────────────────────────────┴─────────────────────────────────┐
                      │                                                                   │
           [ JALUR A: PURE LOCAL LAN ]                                         [ JALUR B: WEB BROWSER HYBRID ]
           (sortir_bridge.py / .bat)                                           (sortir.html di sapatamu.id)
                      │                                                                   │
         Server Socket 0.0.0.0:8787                                           File System Access API
         (Direct Kernel Stream LAN)                                           (Chrome Browser Sandbox)
                      │                                                                   │
   ┌──────────────────┴──────────────────┐                             ┌──────────────────┴──────────────────┐
   │                                     │                             │                                     │
PC Controller                         HP Culling View              PC Host Loop                          HP Culling View
http://localhost:8787                 http://[LAN_IP]:8787/culling sapatamu.id/sortir                   sapatamu.id/sortir.html?share=p2p_...
   │                                     │                             │                                     │
   ├─ GET /api/browse-folder             ├─ GET /api/list              ├─ Scan handle.entries()              ├─ Fetch session data
   ├─ GET /api/status                    ├─ GET /api/thumb             ├─ Upsert sortir_share_sessions       ├─ Render Pinterest Grid
   └─ POST /api/copy                     └─ POST /api/copy             └─ Poll answer & copy file            └─ Update answer (selected)
                      │                                                                   │
                      ▼                                                                   ▼
       ⚡ HASIL: STREAMING INSTAN                                          ⚠️ KENDALA: LATENSI NETWORK CLOUD
       • Kecepatan: 100 - 1000 Mbps                                       • Kecepatan: Tergantung upload internet
       • 0 ms Internet (Bisa Offline)                                      • Upload base64 batch memicu delay
       • File RAW otomatis ikut tersalin                                  • Terbatas kuota & rate limit cloud
```

---

## 3. AUDIT JALUR A: PURE LOCAL LAN BRIDGE (`sortir_bridge.py`)

Jalur ini dirancang untuk bekerja persis seperti **Lightroom Classic / Capture One Local Culling**.

### Endpoint Routing & Cara Kerja:

1. **`GET /` (PC Controller Dashboard)**
   - **Tampilan:** Antarmuka bersih di browser PC vendor untuk memilih folder foto.
   - **Aksi:** Tombol *"Pilih Folder di PC"* memanggil native Windows Folder Picker (`tkinter.filedialog.askdirectory`).
   - **Output:** Menampilkan QR Code LAN lokal yang berisi URL HP: `http://[LAN_IP]:8787/culling`.

2. **`GET /culling` (Mobile Pinterest Grid UI)**
   - **Tampilan:** Halaman mobile-optimized Pinterest Grid dengan layout 2 kolom responsif.
   - **Interaksi:**
     - **Tap Foto:** Toggle checklist seleksi (**`✓`**).
     - **Hold / Double Tap:** Buka Fullscreen Lightbox HD.
     - **Tab Filter:** Tampilkan *Semua*, *Dipilih*, *Belum Dipilih*.
     - **Counter:** Menampilkan kuota terpilih real-time (`X / Total`).
     - **Tombol Simpan:** Mengirim daftar foto terpilih kembali ke PC.

3. **`GET /api/list`**
   - **Fungsi:** Mengambil metadata seluruh foto dari folder PC secara rekursif (`rglob`).
   - **Return:**
     ```json
     {
       "total": 255,
       "files": [
         { "id": "DSC_0001.JPG", "name": "DSC_0001.JPG", "rel_path": "DSC_0001.JPG", "size": 8421000, "ext": ".jpg" }
       ],
       "folder": "D:\\Foto\\Wedding",
       "folder_name": "Wedding"
     }
     ```

4. **`GET /api/thumb?name={filename}` & `GET /api/file?name={filename}`**
   - **Fungsi:** Mengalirkan file gambar asli langsung dari harddisk PC ke HP menggunakan `FileResponse` dengan HTTP chunked streaming & `Cache-Control`.
   - **Keunggulan:** **Zero Decode & Zero Pre-Compression**. Foto hanya dialirkan saat kartu foto di-scroll masuk ke layar HP (`loading="lazy"`).

5. **`POST /api/copy`**
   - **Fungsi:** Menyalin foto pilihan dari HP ke folder `Selected_by_Client` di PC.
   - **Logika RAW Auto-Pairing:**
     - Mencari file dengan ekstensi RAW (`.arw`, `.cr2`, `.cr3`, `.nef`, `.dng`, `.raf`, `.rw2`, `.orf`, `.raw`, `.tiff`) yang memiliki basename yang sama dengan JPG pilihan, lalu menyalin keduanya ke folder tujuan.

---

## 4. AUDIT JALUR B: WEB BROWSER HYBRID (`sortir.html`)

Jalur ini dirancang agar vendor tidak perlu menjalankan file `.bat` sama sekali (murni buka website `sapatamu.id`).

### Alur Eksekusi & Titik Bottleneck:

1. **Pemilihan Folder di PC (`window.showDirectoryPicker`):**
   - Browser PC meminta akses folder lokal menggunakan *File System Access API*.
   - File disimpan dalam memori browser (`_pcFileMap`).

2. **Pembuatan Sesi (`sortir_share_sessions`):**
   - PC membuat ID sesi unik (`p2p_xxxx_yyyy`).
   - PC mengirim metadata file ke Supabase.
   - QR Code muncul di layar PC: `https://sapatamu.id/sortir.html?share=p2p_xxxx_yyyy`.

3. **Titik Masalah/Bottleneck Teknis yang Terjadi:**
   - **Batasan Sandbox Browser:** Browser Google Chrome melarang website membuka socket TCP lokal port `8787` sendiri tanpa aplikasi native di OS.
   - **Ketergantungan Upload Cloud:** Agar HP bisa melihat foto tanpa membuka port lokal, browser PC harus membuat thumbnail base64 lalu mengunggahnya ke database cloud Supabase, yang kemudian diunduh oleh HP.
   - **Dampaknya:** Ketika folder berisi 200–500 foto, proses upload dan download data base64 melalui jaringan internet menyebabkan loading terasa lama dan CPU PC mengalami lonjakan beban.

---

## 5. KESIMPULAN AUDIT & SOLUSI TERBAIK

1. **Untuk Kebutuhan Culling Cepat (Seperti Lightroom):**
   - **Jalur A (`sortir_bridge.py` / `Buka_Sortir_Local_Bridge.bat`)** adalah solusi yang **100% tepat, stabil, dan cepat**, karena data mengalir murni di jaringan Wi-Fi lokal (100–1000 Mbps) langsung dari harddisk PC ke HP tanpa perantara internet.
   
2. **Untuk Kebutuhan Web Murni Tanpa Script Tambahan:**
   - Harus menggunakan thumbnail resolusi ultra-ringan (~15KB per foto) dan pemuatan asinkron bertahap (*progressive lazy loading*) agar tidak membebani koneksi internet vendor.
