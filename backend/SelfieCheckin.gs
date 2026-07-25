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
  // 1. Coba ambil dari B1 client spreadsheet (nama wedding)
  try {
    const clientSs = SpreadsheetApp.openById(clientSsId);
    const clientSheet = clientSs.getSheetByName("Sheet1");
    if (clientSheet) {
      const b1Value = clientSheet.getRange("B1").getValue();
      if (b1Value && b1Value.toString().trim()) {
        const cleaned = b1Value.toString().trim().replace(/\s+/g, '_').replace(/[\\\/\:\*\?\"\<\>\|]/g, "");
        if (cleaned) {
          console.log("getWeddingUsername: resolved from Sheet1!B1 = " + cleaned);
          return cleaned;
        }
      }
      // Jika B1 kosong, coba metadata lain di Sheet1
      const b2Value = clientSheet.getRange("B2").getValue();
      if (b2Value && b2Value.toString().trim()) {
        // B2 berisi tanggal, skip - coba baris lain
      }
    }
  } catch (e) {
    console.warn("getWeddingUsername: gagal baca Sheet1!B1 - " + e.toString());
  }

  // 2. Fallback: cari di Master Database
  if (masterDbId) {
    try {
      const masterSs = SpreadsheetApp.openById(masterDbId);
      const sheet = masterSs.getSheets()[0];
      const range = sheet.getDataRange().getValues();

      for (let i = 1; i < range.length; i++) {
        if (String(range[i][2]).trim() === String(clientSsId).trim()) {
          const name = range[i][0];
          if (name && name.toString().trim()) {
            console.log("getWeddingUsername: resolved from MasterDB row " + (i+1) + " = " + name);
            return name.toString().trim().replace(/\s+/g, '_').replace(/[\\\/\:\*\?\"\<\>\|]/g, "");
          }
        }
      }
    } catch (e) {
      console.warn("getWeddingUsername: gagal baca Master Database - " + e.toString());
    }
  }

  // 3. Fallback: coba baca dari Config sheet di client spreadsheet
  try {
    const clientSs = SpreadsheetApp.openById(clientSsId);
    const configSheet = clientSs.getSheetByName("Config") || clientSs.getSheetByName("CONFIG");
    if (configSheet) {
      // Config B3 berisi kategori, tapi kita coba cari nama di sheet lain
      const settingsSheet = clientSs.getSheetByName("Settings_Event");
      if (settingsSheet) {
        const namaMempelai = settingsSheet.getRange("D5").getValue();
        if (namaMempelai && namaMempelai.toString().trim()) {
          const cleaned = namaMempelai.toString().trim().replace(/\s+/g, '_').replace(/[\\\/\:\*\?\"\<\>\|]/g, "");
          console.log("getWeddingUsername: resolved from Settings_Event!D5 = " + cleaned);
          return cleaned;
        }
      }
    }
  } catch (e) {
    console.warn("getWeddingUsername: gagal baca Config/Settings_Event - " + e.toString());
  }

  // 4. Terakhir: gunakan spreadsheet ID sebagai identifier (bukan "UnknownWedding")
  const shortId = clientSsId ? clientSsId.substring(0, 8) : "NoID";
  console.warn("getWeddingUsername: semua metode gagal, menggunakan fallback ID = " + shortId);
  return "Client_" + shortId;
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
