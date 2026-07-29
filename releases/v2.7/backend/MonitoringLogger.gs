/**
 * SAPATAMU.KU - MONITORING LOGGER (v2.5 Agentic AI)
 * ===================================================
 * Helper terpusat untuk mencatat log aktivitas sistem ke tabel
 * `system_logs` di Supabase. Setiap log status 'FAILED' akan
 * memicu webhook Supabase → Vercel → Gemini AI → WhatsApp Admin.
 *
 * CARA PENGGUNAAN (di fungsi kritis mana saja):
 *   Sukses : logToSupabase('NAMA_AKSI', 'SUCCESS', 'GAS', 'Berhasil melakukan X');
 *   Gagal  : logToSupabase('NAMA_AKSI', 'FAILED', 'GAS', e.toString(), { detail: e.stack });
 *   Warning: logToSupabase('NAMA_AKSI', 'WARNING', 'GAS', 'Peringatan: kuota mendekati limit');
 */

/**
 * Mengirimkan satu entri log ke tabel system_logs di Supabase.
 * @param {string} actionType  Nama tindakan/fungsi yang dicatat. Contoh: 'SYNC_TAMU', 'SEND_WA_BLAST', 'AUTH_LOGIN'.
 * @param {string} status      Status hasil: 'SUCCESS', 'FAILED', atau 'WARNING'.
 * @param {string} errorSource Lapisan asal log: 'GAS', 'SUPABASE', 'VERCEL_EDGE', atau 'CLIENT'.
 * @param {string} description Pesan deskripsi singkat atau output error e.toString().
 * @param {object} [metadata]  Objek JSON opsional berisi detail tambahan (stack trace, sisa kuota, dll.).
 * @param {string} [clientName] Nama klien / username yang terlibat (opsional, untuk filter per klien).
 */
function logToSupabase(actionType, status, errorSource, description, metadata, clientName) {
  // Guard: Jangan jalankan jika variabel Supabase belum terdefinisi (mencegah error di file lain)
  if (typeof SUPABASE_URL === 'undefined' || !SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_PROJECT_URL') return;
  if (typeof SUPABASE_KEY === 'undefined' || !SUPABASE_KEY) return;

  const payload = {
    action_type: actionType || 'UNKNOWN',
    status: status || 'INFO',
    error_source: errorSource || 'GAS',
    description: String(description || '').substring(0, 1000), // Batasi 1000 karakter
    metadata: metadata || {},
    client_name: clientName || null
  };

  try {
    UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/system_logs', {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    // Sengaja tidak memeriksa respons agar fungsi ini tidak memperlambat proses utama
  } catch (e) {
    // Gagal log ke Supabase tidak boleh menghentikan proses utama, cukup catat ke konsol GAS
    console.error('[MonitoringLogger] Gagal kirim log ke Supabase: ' + e.toString());
  }
}
