/**
 * SAPATAMU.KU - SELFIE CHECKIN (Unified Version)
 */

function handleSelfiePost(data) {
  try {
    const SPREADSHEET_ID = data.ssId; 
    
    if (!SPREADSHEET_ID) throw new Error("Spreadsheet ID (ssId) diperlukan untuk identifikasi client.");

    const base64String = data.image || data.imageRaw; 
    const namaTamu = data.nama || data.namaTamu || "Guest";
    const kategori = (data.kategori || "REGULAR").toUpperCase();
    const kodeUnik = data.kode || data.kodeUnik;

    if (!base64String) throw new Error("Data gambar tidak ditemukan.");

    const weddingUsername = getWeddingUsername(SPREADSHEET_ID);
    const cleanWedding = weddingUsername.replace(/\s+/g, '_');
    const cleanNama = namaTamu.replace(/\s+/g, '_').replace(/[\\\/\:\*\?\"\<\>\|]/g, "");
    const cleanKategori = kategori.replace(/\s+/g, '_');
    const fileName = `${cleanWedding}_${cleanKategori}_${cleanNama}_${kodeUnik}.jpg`;

    let rawData = base64String;
    if (base64String.includes(",")) {
      rawData = base64String.split(',')[1];
    }
    const bytes = Utilities.base64Decode(rawData);
    const blob = Utilities.newBlob(bytes, "image/jpeg", fileName);

    // TARGET_FOLDER_ID (Provided by User)
    const TARGET_FOLDER_ID = "1yqHqIf6prjKWs5HxSVjw3t3zOLykJn7S";
    const folder = DriveApp.getFolderById(TARGET_FOLDER_ID);
    const file = folder.createFile(blob);
    const fileUrl = file.getUrl();

    updateSpreadsheetPhoto(SPREADSHEET_ID, kodeUnik, fileUrl);

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

function getWeddingUsername(clientSsId) {
  try {
    // Coba ambil dari Nama Wedding di B1 client spreadsheet dulu (permintaan User)
    const ss = SpreadsheetApp.openById(clientSsId);
    const sheet = ss.getSheetByName("Sheet1");
    if (sheet) {
      const b1Value = sheet.getRange("B1").getValue();
      if (b1Value) {
        // Bersihkan nama dari spasi dan karakter aneh
        return b1Value.toString().trim().replace(/\s+/g, '_').replace(/[\\\/\:\*\?\"\<\>\|]/g, "");
      }
    }

    // Jika gagal, coba cari di Master Database
    const masterSs = SpreadsheetApp.openById(MASTER_SS_ID);
    const mSheet = masterSs.getSheets()[0];
    const range = mSheet.getDataRange().getValues();
    
    for (let i = 1; i < range.length; i++) {
      if (String(range[i][2]).trim() === String(clientSsId).trim()) {
        return range[i][0];
      }
    }
    return "UnknownWedding";
  } catch (err) {
    console.error("getWeddingUsername error:", err);
    return "UnknownWedding";
  }
}

function updateSpreadsheetPhoto(ssId, kode, url) {
  const ss = SpreadsheetApp.openById(ssId);
  const sheet = ss.getSheetByName("Sheet1");
  const lastRow = sheet.getLastRow();
  if (lastRow < 8) return;

  const data = sheet.getRange(8, 6, lastRow - 7, 1).getValues(); 
  
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === String(kode)) {
      sheet.getRange(i + 8, 20).setValue(url); // Kolom T (20) di sebelah kanan Sesi
      break;
    }
  }
}
