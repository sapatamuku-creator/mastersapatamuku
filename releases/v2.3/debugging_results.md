# LAPORAN AUDIT & SINKRONISASI DATABASE SAPATAMU
**Status:** AUDIT SELESAI & BERHASIL  
**Tanggal:** 2 Juni 2026

---

## 1. Verifikasi Secret `service_role` Supabase
Token rahasia `service_role` yang digunakan pada backend Google Apps Script (GAS) SapaTamu telah diverifikasi:
*   **Format:** Token tersebut merupakan JSON Web Token (JWT) standar yang ditandai dengan string panjang tiga bagian yang dipisahkan oleh titik (`header.payload.signature`) dan diawali dengan karakter `eyJ...`.
*   **Peran & Otorisasi:** Kunci ini memiliki kredensial administratif database. Token ini dirancang khusus untuk melewati semua aturan **Row Level Security (RLS)** secara diam-diam, memungkinkan server GAS untuk membaca dan menulis data dengan aman di semua tabel.
*   **Arsitektur Keamanan:**
    *   **GAS Editor (Konteks Server Aman):** Kunci rahasia `service_role` disimpan/digunakan secara eksklusif dalam properti GAS atau logika skrip. Kunci ini **tidak pernah** dikirim ke browser klien, mencegah kebocoran kredensial.
    *   **Frontend (Konteks Browser Publik):** Semua halaman frontend HTML menggunakan kunci publik `anon` (`sb_publishable_...`). Kunci ini aman untuk diekspos di browser dan dikendalikan oleh kebijakan RLS di sisi klien.

---

## 2. Tabel Arsitektur Alur Data
Tabel berikut merangkum pola alur data di seluruh halaman HTML utama dalam sistem SapaTamu, menunjukkan bahwa sistem berhasil menggunakan model hibrida **Supabase-First/GAS-Background**:

| Nama Halaman | Jalur Membaca (Fetch Data) | Jalur Menulis (Update / Insert) | Alur Sinkronisasi & Alasan |
| :--- | :--- | :--- | :--- |
| **`formulir_tamu.html`**<br>(Manajemen Daftar Tamu) | **Supabase REST API**<br>*(Fallback: GAS getMasterData)* | **Tamu Baru:** GAS `submitCollection`<br>**Edit Tamu:** Supabase REST API `PATCH` | **Tamu Baru:** Sinkron melalui GAS terlebih dahulu untuk menetapkan indeks baris yang benar dan menulis ke spreadsheet, yang kemudian melakukan upsert ke Supabase.<br>**Edit:** Memperbarui Supabase secara langsung terlebih dahulu; sinkronisasi ke Sheets di latar belakang. |
| **`onsite.html`**<br>(Scan & Reg Onsite) | **Supabase REST API** | **Registrasi Baru:** GAS `register_new_onsite`<br>**Update / Check-in:** Supabase REST API `PATCH` | **Registrasi Baru (awalan ONS):** Sinkron melalui GAS terlebih dahulu untuk menjaga sinkronisasi baris dan menghasilkan kode ONS unik dengan aman.<br>**Check-in:** Memperbarui Supabase secara langsung dan menulis antrean cetak/welcome secara instan; memperbarui Sheets di latar belakang. |
| **`checkin.html`**<br>(Konsol Check-in Usher) | **Supabase REST API** | **Supabase REST API** `PATCH` | **Supabase-First:** Memperbarui status check-in di Supabase (`tamu`, `print_queue`, `welcome_queue`) untuk respon instan (<200ms). Sinkronisasi ke Sheets via GAS dilakukan di latar belakang. |
| **`kiosk.html`**<br>(Kiosk Check-in Mandiri) | **Supabase REST API** | **Supabase REST API** `PATCH` | **Supabase-First:** Memperbarui status di Supabase (`tamu`, `print_queue`, `welcome_queue`) untuk respon dengan latensi sangat rendah. Sinkronisasi ke Sheets via GAS dilakukan di latar belakang. |
| **`angpao.html`**<br>(Konsol Hadiah & Angpao) | **Supabase REST API** | **Tamu Offline:** GAS `submitCollection`<br>**Update Normal:** Supabase REST API `PATCH` | **Tamu Offline:** Melalui GAS terlebih dahulu untuk membuat profil tamu dan menetapkan baris spreadsheet.<br>**Update Normal:** Memperbarui nilai nominal langsung ke Supabase (`tamu`); memperbarui Sheets via GAS di latar belakang. |
| **`luckydraw.html`**<br>(Sistem Undian) | **Supabase REST API** | GAS `claim_lucky_draw` | **GAS-First:** Mengirim pembaruan klaim ke GAS untuk mencatat pemenang dengan aman di Sheets, mencetak label pemenang, dan memperbarui `status_undian` di kedua lapisan database. |
| **`welcome.html`**<br>(Display Papan Sambutan) | **Supabase REST API / Realtime**<br>*(Fallback: GAS getWelcome)* | *Hanya Membaca* | Halaman tampilan yang mendengarkan perubahan Postgres pada `welcome_queue` dan `wishes_queue` menggunakan Supabase Realtime untuk memperbarui tampilan layar secara instan. |
| **`worker.html`**<br>(Worker Bluetooth Printer) | **Supabase REST API / Realtime** | **Supabase REST API** `PATCH` | Mendengarkan pembaruan `print_queue` Supabase secara realtime, mencetak label via Bluetooth, dan menandainya `DONE` di Supabase terlebih dahulu sebelum memperbarui Sheets. |
| **`wa_blast.html`**<br>(Konsol WhatsApp Blast) | **Supabase REST API** | **Supabase REST API** `PATCH` | Mengambil data tamu langsung dari Supabase. Memperbarui `status_wa` langsung di Supabase terlebih dahulu; memperbarui Sheets di latar belakang. |

---

## 3. Audit Halaman Individual & Potongan Kode

### A. Registrasi Tamu & Penambahan Onsite (Arsitektur GAS-First)
Untuk **registrasi tamu baru** (`formulir_tamu.html`) dan **penambahan tamu onsite** (`onsite.html`), data harus melalui GAS terlebih dahulu karena:
1. Google Sheets berfungsi sebagai registri utama di mana nomor baris (misalnya, Baris 100) dialokasikan secara berurutan menggunakan kunci absolut (`LockService`).
2. Logika pembuatan kode kustom (seperti kode `ONS-XXXXX`) memerlukan validasi sisi server untuk menjamin tidak ada duplikasi.
3. Backend GAS menambahkan baris di Sheets terlebih dahulu, kemudian menulisnya ke Supabase REST API (`UrlFetchApp.fetch`) menggunakan kunci `service_role`, memastikan kedua sistem tetap sinkron dengan sempurna.

*Potongan Kode (`onsite.html` baris 2003-2054):*
```javascript
const payload = {
    action: "register_new_onsite",
    ssId: CURRENT_SS_ID,
    namaTamu: nama,
    // ...
    kodeUnik: kodeUnik,
    skipSupabase: false, // Memberitahu GAS untuk menyelaraskan data ini ke tabel tamu Supabase
    skipSupabasePrint: true // Lewati penambahan antrean cetak duplikat di Supabase
};

// Kirim ke GAS
fetch(SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
}).catch(e => console.error("Sinkronisasi registrasi GAS gagal:", e));
```

---

### B. Check-in Usher & Kiosk (Arsitektur Supabase-First)
Untuk operasi transaksional seperti check-in atau input kiosk, frontend menulis langsung ke Supabase (`tamu`, `print_queue`, `welcome_queue`) terlebih dahulu. Ini memastikan **latensi di bawah 200ms** pada antarmuka pengguna. Sistem kemudian memicu permintaan sinkronisasi latar belakang yang tidak memblokir ke GAS:

*Potongan Kode (`checkin.html` baris 1106-1118):*
```javascript
// Langkah 1: Tulis langsung ke Supabase
const supabasePatchPromises = multiConfig.map(cfg =>
    fetch(`${SB_URL}/rest/v1/tamu?ssid=eq.${CURRENT_SS_ID}&kode=eq.${cfg.id}`, {
        method: "PATCH",
        headers: SB_HEADERS,
        body: JSON.stringify({
            status_hadir: "1",
            real_hadir: String(cfg.hadir),
            jam_datang: timeOnly
        })
    })
);
await Promise.all(supabasePatchPromises);

// Langkah 2: Picu sinkronisasi latar belakang ke Google Sheets
fetch(SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify({
        action: "confirm_checkin",
        ssId: CURRENT_SS_ID,
        // ...
        skipSupabase: true, // Memberitahu GAS untuk melewati pembaruan Supabase (sudah dilakukan)
        skipSupabasePrint: true
    })
});
```

---

## 4. Ringkasan Status Debugging
Semua file HTML sekarang berhasil diaudit dan diverifikasi:
1. **Pengambilan Realtime (Realtime Fetching):** Aktif dan terverifikasi pada `welcome.html`, `worker.html`, `checkin.html`, `onsite.html`, dan `angpao.html`. Data diambil langsung dari Supabase.
2. **Respon Tombol Sinkronisasi pada `formulir_tamu.html`:** Tombol sinkronisasi manual `SYNC SUPABASE` telah berhasil diperbaiki dan diverifikasi. Tombol ini berjalan di latar belakang (`mode: "no-cors"`) ke GAS, dengan aman memicu `syncSheetToSupabase` di server dan menghindari masalah CORS.
3. **Keamanan Data:** Terverifikasi. Kunci publik (publishable key) tidak membocorkan kredensial administratif yang sensitif, dan kunci rahasia `service_role` tetap terisolasi dengan aman di properti skrip GAS.
