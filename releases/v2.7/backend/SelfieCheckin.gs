/**
 * Sapatamu.ku v3.3 - Selfie Check-in Microservice (Dynamic Naming)
 */

function handleSelfiePost(data) {
  try {
    const SPREADSHEET_ID = data.ssId;
    const TARGET_FOLDER_ID = PropertiesService.getScriptProperties().getProperty('TARGET_FOLDER_ID');
    const MASTER_DB_ID = PropertiesService.getScriptProperties().getProperty('MASTER_DB_ID');

    if (!SPREADSHEET_ID) throw new Error("Spreadsheet ID (ssId) diperlukan untuk identifikasi client.");

    const base64String = data.image || data.imageRaw;
    const namaTamu = data.nama || data.namaTamu || "Guest";
    const kategori = (data.kategori || "REGULAR").toUpperCase();
    const kodeUnik = data.kode || data.kodeUnik;

    if (!base64String) throw new Error("Data gambar tidak ditemukan.");

    const weddingUsername = getWeddingUsername(SPREADSHEET_ID, MASTER_DB_ID);
    const cleanNama = namaTamu.replace(/[\\\/\:\*\?\"\<\>\|]/g, "");
    const fileName = `${weddingUsername}_${kategori}_${cleanNama}_${kodeUnik}.jpg`;

    let rawData = base64String;
    if (base64String.includes(",")) {
      rawData = base64String.split(',')[1];
    }
    const bytes = Utilities.base64Decode(rawData);
    const blob = Utilities.newBlob(bytes, "image/jpeg", fileName);

    const folder = DriveApp.getFolderById(TARGET_FOLDER_ID);
    const file = folder.createFile(blob);
    const fileUrl = file.getUrl();

    updateSpreadsheetPhoto(SPREADSHEET_ID, kodeUnik, fileUrl);

    // Update selfie_url ke Supabase tamu table
    updateSupabaseSelfieUrl(SPREADSHEET_ID, kodeUnik, fileUrl);

    return createResponse({
      status: "success",
      fileName: fileName,
      fileUrl: fileUrl
    });

  } catch (error) {
    return createResponse({
      status: "error",
      message: error.toString()
    });
  }
}

function getWeddingUsername(clientSsId, masterDbId) {
  // 1. Coba ambil dari Sheet1!B1 (nama wedding)
  try {
    const clientSs = SpreadsheetApp.openById(clientSsId);
    const clientSheet = clientSs.getSheetByName("Sheet1");
    if (clientSheet) {
      const b1Value = clientSheet.getRange("B1").getValue();
      if (b1Value && b1Value.toString().trim()) {
        return b1Value.toString().trim().replace(/\s+/g, '_').replace(/[\\\/\:\*\?\"\<\>\|]/g, "");
      }
    }
  } catch (e) {
    console.warn("getWeddingUsername: gagal baca Sheet1!B1 - " + e.toString());
  }

  // 2. Ambil subdomain dari Supabase client_public_profile
  try {
    const sbUrl = SUPABASE_URL + "/rest/v1/client_public_profile?ssid=eq." + encodeURIComponent(clientSsId) + "&select=subdomain&limit=1";
    const sbRes = UrlFetchApp.fetch(sbUrl, {
      method: "get",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY
      },
      muteHttpExceptions: true
    });
    if (sbRes.getResponseCode() === 200) {
      const rows = JSON.parse(sbRes.getContentText());
      if (rows && rows.length > 0 && rows[0].subdomain) {
        return rows[0].subdomain.toLowerCase().trim();
      }
    }
  } catch (e) {
    console.warn("getWeddingUsername: gagal ambil subdomain - " + e.toString());
  }

  // 3. Fallback: gunakan ssId
  return clientSsId || "unknown";
}

function updateSpreadsheetPhoto(ssId, kode, url) {
  const ss = SpreadsheetApp.openById(ssId);
  const sheet = ss.getSheetByName("Sheet1");
  const lastRow = sheet.getLastRow();
  if (lastRow < 8) return;

  const data = sheet.getRange(8, 6, lastRow - 7, 1).getValues();

  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === String(kode)) {
      sheet.getRange(i + 8, 20).setValue(url);
      break;
    }
  }
}

function updateSupabaseSelfieUrl(ssId, kode, url) {
  try {
    const sbUrl = SUPABASE_URL + "/rest/v1/tamu?ssid=eq." + ssId + "&kode=eq." + kode;
    const payload = JSON.stringify({ selfie_url: url });

    UrlFetchApp.fetch(sbUrl, {
      method: "PATCH",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      payload: payload
    });
  } catch (err) {
    console.error("updateSupabaseSelfieUrl error:", err);
  }
}
