# Panduan Implementasi Agentic AI Monitoring v2.5
Sistem Pemantauan Otomatis & Alert Real-time berbasis Gemini API dan Fonnte WhatsApp

Sistem pemantauan ini berjalan secara otomatis tanpa memerlukan server berbayar (*serverless*). Aliran datanya adalah:
`Error Terjadi` ➔ `Insert ke Supabase system_logs` ➔ `Database Webhook` ➔ `Vercel Serverless Function` ➔ `Gemini API (Analisis AI)` ➔ `Fonnte API` ➔ `WhatsApp Admin`.

---

## Langkah 1: Setup Tabel & RLS di Supabase
1. Masuk ke **Supabase Dashboard** proyek Anda.
2. Buka menu **SQL Editor** di sidebar kiri.
3. Klik **New Query**, lalu salin dan jalankan seluruh isi file [setup_system_logs.sql](file:///d:/Google%20Antigrafity/mastersapatamuku/setup_system_logs.sql).
4. Klik **Run**. Tabel `system_logs` beserta indeks dan kebijakan keamanan RLS kini telah aktif.

---

## Langkah 2: Setup Environment Variables di Vercel
Agar serverless function `api/monitor-alert.js` dapat beroperasi, Anda wajib menambahkan beberapa konfigurasi rahasia (*Environment Variables*) di dashboard Vercel Anda:

1. Buka dashboard Vercel proyek SapaTamu Anda.
2. Masuk ke tab **Settings** ➔ **Environment Variables**.
3. Tambahkan variabel berikut:
   * **`GEMINI_API_KEY`**: Dapatkan kunci API gratis Anda dari [Google AI Studio](https://aistudio.google.com/).
   * **`FONNTE_TOKEN`**: Token Fonnte Master Anda (dari tab perangkat Fonnte atau sel `Settings!E2` di Google Sheets).
   * **`ADMIN_PHONE`**: Nomor WhatsApp admin utama yang akan menerima alert (format internasional, misal: `628123456789`).
   * **`MONITOR_SECRET`**: Buat kata sandi acak bebas (misal: `SapaTamuMonitorSecret2026`) untuk mengamankan Webhook dari pemicu liar pihak luar.

---

## Langkah 3: Setup Webhook di Supabase
Guna mengirimkan event error secara instan ke Vercel:

1. Di dashboard Supabase Anda, masuk ke **Database** (ikon roda gigi) ➔ **Webhooks**.
2. Klik **Enable Webhooks** jika belum aktif.
3. Klik **Create Webhook** dan isi konfigurasi berikut:
   * **Name:** `send-sapatamu-error-alert`
   * **Table:** Pilih `system_logs`
   * **Events:** Centang **Insert** saja (tidak perlu Update/Delete).
   * **Type:** Pilih **HTTP Post**
   * **URL:** Masukkan URL fungsi Vercel Anda:
     `https://<YOUR_VERCEL_PROJECT_DOMAIN>/api/monitor-alert`
   * **HTTP Headers:**
     * Tambahkan header pertama: `Content-Type` dengan value `application/json`.
     * Tambahkan header kedua: `x-monitor-secret` dengan value yang Anda samakan dengan `MONITOR_SECRET` di Vercel.
4. Klik **Save**.

---

## Langkah 4: Cara Logging dari Google Apps Script (GAS)
Gunakan fungsi helper di bawah ini pada Google Apps Script (`CentralBackend.gs` atau `Main.gs`) Anda untuk melaporkan error/aktivitas secara otomatis dari backend spreadsheet ke Supabase:

```javascript
/**
 * Mengirimkan log sistem ke tabel system_logs di Supabase.
 * @param {string} actionType Tipe aktivitas, contoh: 'SYNC_SHEET', 'SEND_WA', 'AUTH'
 * @param {string} status Status log: 'SUCCESS', 'FAILED', 'WARNING'
 * @param {string} errorSource Asal log: 'GAS'
 * @param {string} description Detail deskripsi pesan log atau pesan error catch(e)
 * @param {object} metadata Payload tambahan berupa sisa kuota, stack trace, dll.
 */
function logToSupabase(actionType, status, errorSource, description, metadata) {
  const supabaseUrl = "https://llrapesaaoliyjrrrsjh.supabase.co";
  const supabaseKey = "sb_publishable_414hQDyPBaFi0fnzmIKyZw_Iwa09Q0u"; // Gunakan anon key Anda
  
  const payload = {
    action_type: actionType,
    status: status,
    error_source: errorSource || "GAS",
    description: description,
    metadata: metadata || {}
  };
  
  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "apikey": supabaseKey,
      "Authorization": "Bearer " + supabaseKey
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    UrlFetchApp.fetch(supabaseUrl + "/rest/v1/system_logs", options);
  } catch (e) {
    Logger.log("Gagal mengirim log ke Supabase: " + e.toString());
  }
}

// CONTOH PENGGUNAAN PADA FUNGSI CRITICAL:
function syncGuestsToSupabase() {
  try {
    // ... Logika sinkronisasi Anda ...
    
    // Log Sukses
    logToSupabase("SYNC_GUESTS", "SUCCESS", "GAS", "Sinkronisasi data tamu ke Supabase berhasil.");
  } catch(e) {
    // Log Gagal (Akan otomatis memicu alert WhatsApp via Webhook + Gemini!)
    logToSupabase("SYNC_GUESTS", "FAILED", "GAS", e.toString(), { stack: e.stack });
  }
}
```
---

## Langkah 5: Pengujian Real-time
Anda dapat menguji apakah webhook dan Gemini berfungsi dengan memasukkan log uji coba bertipe `'FAILED'` melalui terminal SQL Editor Supabase Anda:

```sql
INSERT INTO public.system_logs (action_type, status, error_source, description, metadata)
VALUES (
  'TEST_CONNECTION', 
  'FAILED', 
  'GAS', 
  'Exceeded maximum execution time of 360 seconds on GAS runtime.',
  '{"quota_remaining": 0}'::jsonb
);
```

Dalam hitungan detik setelah query dijalankan:
1. Dasbor `monitor.html` akan langsung memunculkan baris error baru secara visual dengan teks merah.
2. WhatsApp Admin Anda akan menerima pesan analisis cerdas dari Gemini mengenai error GAS runtime tersebut.
