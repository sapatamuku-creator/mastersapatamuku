/**
 * Sapatamu.ku v3.3 - Selfie Check-in Microservice (Dynamic Naming)
 * Migrated to New Drive Environment
 */

const TARGET_FOLDER_ID = "1yqHqIf6prjKWs5HxSVjw3t3zOLykJn7S";
const MASTER_DB_ID = "12z2fqewIamIRpVJ4zocMDp-8CwjZsjsrQRh3dXx-VAw"; // Database Pusat (Updated to New ID)

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // Ambil ssId dinamis dari payload login
    const SPREADSHEET_ID = data.ssId; 
    
    if (!SPREADSHEET_ID) throw new Error("Spreadsheet ID (ssId) diperlukan untuk identifikasi client.");

    const base64String = data.image || data.imageRaw; 
    const namaTamu = data.nama || data.namaTamu || "Guest";
    const kategori = (data.kategori || "REGULAR").toUpperCase();
    const kodeUnik = data.kode || data.kodeUnik;

    if (!base64String) throw new Error("Data gambar tidak ditemukan.");

    // 1. Ambil Username Wedding dari Master Database berdasarkan ssId
    const weddingUsername = getWeddingUsername(SPREADSHEET_ID);

    // 2. Sanitasi Nama dan Susun Nama File: "Username_KATEGORI_Nama_Kode.jpg"
    const cleanNama = namaTamu.replace(/[\\\/\:\*\?\"\<\>\|]/g, "");
    const fileName = `${weddingUsername}_${kategori}_${cleanNama}_${kodeUnik}.jpg`;

    // 3. Proses Base64 ke Blob
    let rawData = base64String;
    if (base64String.includes(",")) {
      rawData = base64String.split(',')[1];
    }
    const bytes = Utilities.base64Decode(rawData);
    const blob = Utilities.newBlob(bytes, "image/jpeg", fileName);

    // 4. Simpan ke Folder Statis
    const folder = DriveApp.getFolderById(TARGET_FOLDER_ID);
    const file = folder.createFile(blob);
    const fileUrl = file.getUrl();

    // 5. Update Link Foto ke Spreadsheet Client (Kolom Q)
    updateSpreadsheetPhoto(SPREADSHEET_ID, kodeUnik, fileUrl);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      fileName: fileName,
      fileUrl: fileUrl
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Mengambil Username (Kolom A) dari Master Database berdasarkan Spreadsheet ID (Kolom C)
 */
function getWeddingUsername(clientSsId) {
  try {
    const masterSs = SpreadsheetApp.openById(MASTER_DB_ID);
    const sheet = masterSs.getSheets()[0]; // Mengambil sheet pertama (index 0)
    const range = sheet.getDataRange().getValues();
    
    // Cari baris yang kolom C-nya (index 2) cocok dengan clientSsId
    for (let i = 1; i < range.length; i++) {
      if (String(range[i][2]).trim() === String(clientSsId).trim()) {
        return range[i][0]; // Kembalikan nilai Kolom A (index 0)
      }
    }
    return "UnknownWedding"; // Fallback jika tidak ditemukan
  } catch (err) {
    return "SystemError";
  }
}

/**
 * Update URL foto ke Kolom Q Spreadsheet Client
 */
function updateSpreadsheetPhoto(ssId, kode, url) {
  const ss = SpreadsheetApp.openById(ssId);
  const sheet = ss.getSheetByName("Sheet1");
  const lastRow = sheet.getLastRow();
  if (lastRow < 8) return;

  const data = sheet.getRange(8, 6, lastRow - 7, 1).getValues(); // Kolom F
  
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === String(kode)) {
      sheet.getRange(i + 8, 17).setValue(url); // Kolom Q
      break;
    }
  }
}
