export default async function handler(req, res) {
  // Hanya izinkan POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Validasi Keamanan Token Webhook (Opsional)
  const webhookSecret = req.headers['x-monitor-secret'];
  const expectedSecret = process.env.MONITOR_SECRET;
  if (expectedSecret && webhookSecret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized signature' });
  }

  try {
    const { type, record, table } = req.body || {};

    // Pastikan payload log berasal dari system_logs dan statusnya FAILED
    if (table !== 'system_logs' || record?.status !== 'FAILED') {
      return res.status(200).json({ status: 'ignored', reason: 'Not a failed system log' });
    }

    const { id, created_at, client_name, action_type, description, error_source, metadata } = record;

    // 2. Ambil Kredensial Environment Variables
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const fonnteToken = process.env.FONNTE_TOKEN;
    const adminPhone = process.env.ADMIN_PHONE;

    if (!fonnteToken || !adminPhone) {
      console.warn("Fonnte Token atau Admin Phone belum dikonfigurasi.");
      return res.status(500).json({ error: 'Missing notification configuration' });
    }

    let aiAnalysis = "Tidak dapat melakukan analisis AI (API Key tidak ditemukan).";

    // 3. Panggil Gemini API jika API Key Tersedia
    if (geminiApiKey) {
      try {
        const prompt = `Kamu adalah AI Site Reliability Engineer (SRE) untuk ekosistem SapaTamu (aplikasi Buku Tamu & RSVP Pernikahan digital).
Berikut adalah data error log dari sistem kami:
- ID Log: ${id}
- Waktu: ${created_at}
- Klien: ${client_name || 'Umum'}
- Sumber Error: ${error_source} (CLIENT/VERCEL_EDGE/SUPABASE/GAS)
- Nama Aksi: ${action_type}
- Deskripsi Error: ${description}
- Metadata Sistem: ${JSON.stringify(metadata || {})}

Tugas Anda:
1. Analisis apa yang salah dengan penjelasan bahasa Indonesia yang santai, ringkas, dan mudah dipahami oleh admin pernikahan non-teknis.
2. Klasifikasikan penyebab utama (apakah karena limit kuota GAS/Fonnte, gangguan koneksi klien, atau masalah Supabase idle).
3. Berikan rekomendasi langkah perbaikan konkret dan praktis untuk admin/developer.

Buat respons Anda sangat singkat, padat (maksimal 3-4 kalimat), dan ramah WhatsApp. Jangan gunakan format markdown yang tebal berlebihan kecuali tebal standar (*teks*).`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
        const geminiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          aiAnalysis = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || aiAnalysis;
        } else {
          console.error("Gemini API Error:", await geminiRes.text());
        }
      } catch (geminiErr) {
        console.error("Gagal menghubungi Gemini API:", geminiErr);
      }
    }

    // 4. Susun Pesan Alert WhatsApp
    const message = `🚨 *SAPATAMU AUTO-ALERT (v2.5)*

*Detail Error:*
• Sumber: ${error_source || '-'}
• Aksi: ${action_type || '-'}
• Klien: ${client_name || 'Umum'}
• Deskripsi: ${description || '-'}

*Analisis & Saran AI (Gemini):*
${aiAnalysis}

*Info Teknis:*
• ID: ${id}
• Waktu: ${new Date(created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`;

    // 5. Kirim Laporan ke Admin via Fonnte API
    const fonnteRes = await fetch("https://api.fonnte.com/send", {
      method: 'POST',
      headers: {
        'Authorization': fonnteToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        target: adminPhone,
        message: message
      })
    });

    const fonnteResult = await fonnteRes.json();
    return res.status(200).json({
      status: 'success',
      alertSent: fonnteResult.status || false,
      aiAnalyzed: !!geminiApiKey
    });

  } catch (err) {
    console.error("Error in webhook handler:", err);
    return res.status(500).json({ error: err.message });
  }
}
