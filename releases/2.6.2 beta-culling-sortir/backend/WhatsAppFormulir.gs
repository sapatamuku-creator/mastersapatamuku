/**
 * SAPA TAMU.KU - BACKEND CORE (FINAL DYNAMIC REVISED 2026)
 * Fix: Jalur Terpisah - Dashboard Cepat, Watcher Independen
 */

// --- FUNGSI DOGET (Dashboard Data) ---
function handleWAFormGet(e) {
  const ssId = e.parameter.ssId;
  if (!ssId) return createResponse({ status: "error", message: "Missing ssId" });

  const ss = SpreadsheetApp.openById(ssId);
  const sheet1 = ss.getSheetByName("Sheet1");
  const settings = ss.getSheetByName("Settings");

  const masterToken = settings.getRange("E2").getValue();
  const deviceStatusValues = settings.getRange("D3:D8").getValues();
  const liveDeviceCount = deviceStatusValues.filter(row => row[0] === "connect").length;

  const weddingTitle = sheet1.getRange("B1").getValue();
  const hariTanggal = sheet1.getRange("B2").getValue();
  const lokasiAcara = sheet1.getRange("B3").getValue();
  const waktuAcara = sheet1.getRange("B4").getValue() || "-";
  
  // Kirim linkInvitation MENTAH dari B5 — semua manipulasi URL dilakukan di sisi frontend
  // setelah deteksi apakah vendor SapaTamu.id atau vendor lain (custom)
  const linkInvitation = sheet1.getRange("B5").getValue().toString().trim();

  let rsvpLink = "";
  try {
    rsvpLink = getOrGenerateRsvpLink(ssId, sheet1);
  } catch(errR) {
    console.error("Gagal getOrGenerateRsvpLink: " + errR.toString());
    rsvpLink = sheet1.getRange("C5").getValue().toString().trim();
  }

  const deviceData = settings.getRange("A3:D8").getValues();
  const categoryMap = deviceData
    .filter(row => row[0] !== "")
    .map(row => ({
      kategori: row[0],
      nomor: row[1],
      token: row[2], 
      statusConnect: row[3] 
    }));

  const lastRow = sheet1.getLastRow();
  let listTamu = [];
  
  if (lastRow >= 8) {
    const tamuRaw = sheet1.getRange(8, 1, lastRow - 7, 19).getValues();
    listTamu = tamuRaw.map((row, index) => ({
      row: index + 8,
      nama: row[2] || "-",
      nomor: row[3] || "",
      kategori: row[11] || "-",
      kode: row[5] || "",
      sesi: row[18] || "-",
      status: row[15] || "BELUM TERKIRIM"
    }));
  }

  const defaultTemplate = sheet1.getRange("B6").getValue().toString().trim();
  const customTemplate = sheet1.getRange("C6").getValue().toString().trim();

  const result = { 
    masterToken, weddingTitle, hariTanggal, lokasiAcara, waktuAcara, linkInvitation, 
    rsvpLink,
    defaultTemplate,
    customTemplate, // Teks kata pengantar dinamis di kolom C6
    liveUsage: liveDeviceCount, categories: categoryMap, tamu: listTamu 
  };
  
  // Auto-sync metadata to Supabase to keep them in sync
  try {
    syncMetadataClientToSupabase(ssId, sheet1);
  } catch(e) {
    console.error("Auto-sync inside handleWAFormGet failed: " + e.toString());
  }
  
  return createResponse(result);
}

// --- FUNGSI DOPOST (Handle Action) ---
function handleWAFormPost(data) {
  try {
    const ss = SpreadsheetApp.openById(data.ssId);
    const settings = ss.getSheetByName("Settings");
    const sheet1 = ss.getSheetByName("Sheet1");
    const action = data.action;

    // 1. SAVE MASTER TOKEN
    if (action === "saveMasterToken" || action === "updateMasterToken") {
      settings.getRange("E2").setValue(data.token);
      SpreadsheetApp.flush();
      return createResponse({ status: "success" });
    }

    // 2. REMOTE FONNTE (DELETE EXISTING -> ADD NEW)
    if (action === "remoteFonnte") {
      const masterToken = settings.getRange("E2").getValue();
      const deviceValues = settings.getRange("A3:A8").getValues();
      let rowIndex = deviceValues.findIndex(row => row[0] === data.kategori);

      if (rowIndex === -1) return createResponse({ status: "failed", msg: "Kategori tidak ditemukan" });

      // A. CEK & HAPUS DEVICE LAMA DI FONNTE (Jika ada)
      const resList = directFonnteSend("https://api.fonnte.com/get-devices", {}, masterToken);
      if (resList.status && resList.data.data) {
        const existingDevice = resList.data.data.find(d => d.name === data.kategori);
        if (existingDevice) {
           // Jika ketemu device dengan nama kategori yang sama, hapus dulu
           directFonnteSend("https://api.fonnte.com/delete-device", { device: existingDevice.device }, masterToken);
        }
      }

      // B. ADD DEVICE BARU
      const resAdd = directFonnteSend("https://api.fonnte.com/add-device", { name: data.kategori, device: data.targetNumber }, masterToken);
      
      if (resAdd.status) {
        const newToken = resAdd.data.token || resAdd.data.device_token;
        const resStatus = directFonnteSend("https://api.fonnte.com/device", {}, newToken);
        const statusFinal = (resStatus.data && resStatus.data.status === "connect") ? "connect" : "disconnect";

        // C. UPDATE SPREADSHEET (Kolom B: Nomor, Kolom C: Token, Kolom D: Status)
        settings.getRange(rowIndex + 3, 2).setValue(data.targetNumber);
        settings.getRange(rowIndex + 3, 3).setValue(newToken);
        settings.getRange(rowIndex + 3, 4).setValue(statusFinal);

        SpreadsheetApp.flush();
        return createResponse({ status: "success", token: newToken, deviceStatus: statusFinal });
      }
      return createResponse({ status: "failed", msg: resAdd.msg });
    }

    // 3. TOGGLE STATUS
    if (action === "toggleStatus") {
      const deviceValues = settings.getRange("A3:A8").getValues();
      for (let i = 0; i < deviceValues.length; i++) {
        if (deviceValues[i][0] === "") continue;
        if (deviceValues[i][0] === data.kategori) {
          settings.getRange(i + 3, 4).setValue(data.status);
        } else if (data.status === "connect") {
          settings.getRange(i + 3, 4).setValue("disconnect");
        }
      }
      SpreadsheetApp.flush();
      return createResponse({ status: "success" });
    }

    // 4. EXECUTE BLAST (Dukungan Gambar Dinamis)
    if (action === "executeFonnteBlast") {
      let successCount = 0;
      const failedRows = []; // Session-only — tidak ditulis ke spreadsheet
      const now = Utilities.formatDate(new Date(), "GMT+7", "dd/MM HH:mm");
      
      data.payload.forEach(item => {
        const body = { 
          target: item.target, 
          message: item.message,
          url: item.url || "",
          delay: "5-12",
          duration: "3"
        };
        const res = directFonnteSend("https://api.fonnte.com/send", body, item.token);
        if (res.status) {
          const statusStr = `✅ [${now}]`;
          sheet1.getRange(item.row, 16).setValue(statusStr); 
          successCount++;

          // SINKRONISASI KE SUPABASE SECARA OTOMATIS
          try {
            if (typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL && SUPABASE_URL !== "YOUR_SUPABASE_PROJECT_URL") {
              const kodeUnik = sheet1.getRange(item.row, 6).getValue(); // Kolom F (Kode Unik)
              if (kodeUnik) {
                supabaseFetch(SUPABASE_URL + "/rest/v1/tamu?ssid=eq." + data.ssId + "&kode=eq." + kodeUnik, {
                  method: "patch",
                  headers: {
                    "apikey": SUPABASE_KEY,
                    "Authorization": "Bearer " + SUPABASE_KEY,
                    "Content-Type": "application/json"
                  },
                  payload: JSON.stringify({ status_wa: statusStr }),
                  muteHttpExceptions: true
                });
              }
            }
          } catch(e) {
            console.error("Failed to sync blast status to Supabase: " + e.toString());
          }
        } else {
          // ❌ ERROR: session-only, tidak ditulis ke spreadsheet
          // agar saat refresh kembali jadi "BELUM TERKIRIM" dan bisa di-retry
          failedRows.push({ row: item.row, reason: res.msg || "Gagal" });
          // 🔴 LOG ke system_logs — akan memicu Webhook → Gemini Alert → WA Admin
          logToSupabase(
            'SEND_WA_BLAST',
            'FAILED',
            'GAS',
            'Fonnte gagal kirim ke target baris ' + item.row + ': ' + (res.msg || 'Tidak ada respons'),
            { target: item.target, row: item.row, reason: res.msg, ssId: data.ssId }
          );
        }
      });
      SpreadsheetApp.flush();

      // 📊 LOG RINGKASAN BLAST ke system_logs
      const totalTarget = data.payload ? data.payload.length : 0;
      if (failedRows.length > 0) {
        logToSupabase(
          'SEND_WA_BLAST',
          'WARNING',
          'GAS',
          'Blast WA selesai dengan ' + failedRows.length + ' kegagalan dari ' + totalTarget + ' target. Sukses: ' + successCount,
          { successCount, failedCount: failedRows.length, totalTarget, ssId: data.ssId }
        );
      } else if (successCount > 0) {
        logToSupabase(
          'SEND_WA_BLAST',
          'SUCCESS',
          'GAS',
          'Blast WA berhasil terkirim ke ' + successCount + ' dari ' + totalTarget + ' target tamu.',
          { successCount, totalTarget, ssId: data.ssId }
        );
      }

      return createResponse({ 
        status: "success", 
        sent: successCount, 
        failedRows: failedRows  // dikembalikan ke frontend untuk display session-only
      });
    }

    // 5. MARK DUPLICATE — tulis status kuning ke spreadsheet
    if (action === "markDuplicateBlast") {
      const now = Utilities.formatDate(new Date(), "GMT+7", "dd/MM HH:mm");
      if (Array.isArray(data.duplicates)) {
        data.duplicates.forEach(item => {
          if (item.row) {
            const statusStr = `⚠️ Duplikasi Nomor [${now}]`;
            sheet1.getRange(item.row, 16).setValue(statusStr);

            // SINKRONISASI KE SUPABASE SECARA OTOMATIS
            try {
              if (typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL && SUPABASE_URL !== "YOUR_SUPABASE_PROJECT_URL") {
                const kodeUnik = sheet1.getRange(item.row, 6).getValue(); // Kolom F (Kode Unik)
                if (kodeUnik) {
                  supabaseFetch(SUPABASE_URL + "/rest/v1/tamu?ssid=eq." + data.ssId + "&kode=eq." + kodeUnik, {
                    method: "patch",
                    headers: {
                      "apikey": SUPABASE_KEY,
                      "Authorization": "Bearer " + SUPABASE_KEY,
                      "Content-Type": "application/json"
                    },
                    payload: JSON.stringify({ status_wa: statusStr }),
                    muteHttpExceptions: true
                  });
                }
              }
            } catch(e) {
              console.error("Failed to sync duplicate status to Supabase: " + e.toString());
            }
          }
        });
        SpreadsheetApp.flush();
      }
      return createResponse({ status: "success", marked: (data.duplicates || []).length });
    }

  } catch (err) {
    // 🔴 LOG ERROR FATAL ke system_logs — akan memicu Webhook + Gemini Alert
    logToSupabase(
      'WA_FORMULIR_HANDLER',
      'FAILED',
      'GAS',
      'Error fatal di handleWAFormPost: ' + err.toString(),
      { action: data ? data.action : 'unknown', stack: err.stack || '' }
    );
    return createResponse({ status: "error", msg: err.toString() });
  }
}

// --- FUNGSI HELPER ---
function directFonnteSend(url, payload, token) {
  try {
    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      headers: { "Authorization": token },
      muteHttpExceptions: true
    };
    const response = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(response.getContentText());
    
    // Sangat permisif untuk status sukses Fonnte
    const isSuccess = (
      json.status === true || 
      json.status === "true" || 
      json.token || 
      json.status === "connect" || 
      json.status === "disconnect" || 
      json.process === "pending" ||
      json.process === "processing" ||
      (json.target && json.id)
    );
    
    return isSuccess 
      ? { status: true, data: json } 
      : { status: false, msg: json.reason || "Rejected" };
  } catch (e) { return { status: false, msg: "Error" }; }
}

// responseJSON removed
