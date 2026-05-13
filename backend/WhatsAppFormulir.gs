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
  
  let rawLink = sheet1.getRange("B5").getValue();
  const linkInvitation = rawLink.includes("?") ? `${rawLink}&v=3` : `${rawLink}?v=3`;

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

  const result = { 
    masterToken, weddingTitle, hariTanggal, lokasiAcara, linkInvitation, 
    liveUsage: liveDeviceCount, categories: categoryMap, tamu: listTamu 
  };
  
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

    // 2. REMOTE FONNTE (ADD DEVICE)
    if (action === "remoteFonnte") {
      const masterToken = settings.getRange("E2").getValue();
      const deviceValues = settings.getRange("A3:A8").getValues();
      let rowIndex = deviceValues.findIndex(row => row[0] === data.kategori);

      if (rowIndex === -1) return createResponse({ status: "failed", msg: "Kategori tidak ditemukan" });

      const resAdd = directFonnteSend("https://api.fonnte.com/add-device", { name: data.kategori, device: data.targetNumber }, masterToken);
      
      if (resAdd.status) {
        const newToken = resAdd.data.token || resAdd.data.device_token;
        const resStatus = directFonnteSend("https://api.fonnte.com/device", {}, newToken);
        const statusFinal = (resStatus.data && resStatus.data.status === "connect") ? "connect" : "disconnect";

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

    // 4. EXECUTE BLAST
    if (action === "executeFonnteBlast") {
      let successCount = 0;
      const now = Utilities.formatDate(new Date(), "GMT+7", "dd/MM HH:mm");
      
      data.payload.forEach(item => {
        const res = directFonnteSend("https://api.fonnte.com/send", { target: item.target, message: item.message }, item.token);
        if (res.status) {
          sheet1.getRange(item.row, 16).setValue(`✅ [${now}]`); 
          successCount++;
        } else {
          sheet1.getRange(item.row, 16).setValue(`❌ [Err: ${now}]`);
        }
      });
      SpreadsheetApp.flush(); 
      return createResponse({ status: "success", sent: successCount });
    }

  } catch (err) {
    return createResponse({ status: "error", msg: err.toString() });
  }
}

// --- FUNGSI HELPER ---
function directFonnteSend(url, payload, token) {
  try {
    const options = {
      method: "post",
      payload: payload,
      headers: { "Authorization": token },
      muteHttpExceptions: true
    };
    const response = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(response.getContentText());
    return (json.status === true || json.token || json.status === "connect" || json.status === "disconnect") 
      ? { status: true, data: json } 
      : { status: false, msg: json.reason || "Rejected" };
  } catch (e) { return { status: false, msg: "Error" }; }
}

// responseJSON removed
