/**
 * SAPATAMU.KU - CENTRAL BACKEND (UPDATED 2026)
 * Fokus: Auth, Register, Auto-Copy, Email & WA Recovery
 * Migrated to New Drive Environment
 */

const MASTER_SS_ID = "12z2fqewIamIRpVJ4zocMDp-8CwjZsjsrQRh3dXx-VAw"; // Master Database ID Client (Updated)
const CLIENT_MASTER_ID = "1eJhbMfrErp9KtHxU0qN2IV4fyhxMTW8tfRooxBwv950"; // Master Draft SapaTamu.Ku (Updated)
const FOLDER_KLIEN_ID = "16rNOcoR_PYQYkn7jq7gLgospii5gw2Dn"; 
const MASTER_SHEET_NAME = "Sheet1";
const ADMIN_WA = "6285111567829";
const ADMIN_EMAIL = "sapatamuku@gmail.com";
const FONNTE_TOKEN = "fRx1Canf4GYroBZZNfo7";

function doPost(e) {
  let request;
  try {
    request = JSON.parse(e.postData.contents);
  } catch (err) {
    return createResponse("error", "Format JSON tidak valid");
  }

  const action = request.action;
  
  switch(action) {
    case 'copyMaster': return handleCopyMaster(request); 
    case 'register': return handleRegister(request); 
    case 'login': return handleLogin(request);
    case 'forgotPassword': return handleForgotPassword(request); // Action disesuaikan frontend
    case 'changePassword': return handleChangePassword(request);
    case 'updateClientData': return handleUpdateClientData(request);  
    default: return createResponse("error", "Action tidak dikenali");
  }
}

// --- FUNGSI REGISTER (TAMBAH EMAIL) ---
function handleRegister(data) {
  try {
    const ss = SpreadsheetApp.openById(MASTER_SS_ID);
    const sheet = ss.getSheetByName(MASTER_SHEET_NAME);
    const values = sheet.getDataRange().getValues();
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] == data.username) return createResponse("error", "Username sudah terdaftar");
    }

    const file = DriveApp.getFileById(data.ssId);
    const cleanUser = data.username.replace(/\s+/g, '');
    const finalName = (data.weddingDate || "NoDate") + " - " + cleanUser;
    file.setName(finalName);

    // Append Row ke Master (Kolom G untuk Email)
    sheet.appendRow([
      data.username,     // A
      data.ssId,         // B
      data.password,     // C
      data.whatsapp,     // D
      data.weddingDate,  // E
      new Date(),        // F
      data.email         // G (Kolom Baru)
    ]);

    return createResponse("success", "Pendaftaran berhasil");
  } catch (err) {
    return createResponse("error", "Gagal pendaftaran: " + err.toString());
  }
}

function sendWA(target, message) {
  const url = "https://api.fonnte.com/send";
  
  // Pastikan target hanya berisi angka (hapus simbol +, spasi, dll)
  const cleanTarget = target.toString().replace(/[^0-9]/g, '');
  
  const payload = {
    'target': cleanTarget,
    'message': message,
    'countryCode': '62' // Memastikan format Indonesia
  };

  const options = {
    'method': 'post',
    'headers': {
      'Authorization': FONNTE_TOKEN // Masukkan token device Anda di sini
    },
    'payload': payload,
    'muteHttpExceptions': true // Agar GAS tidak berhenti jika API error
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const result = response.getContentText();
    console.log("Fonnte Response: " + result); // Cek log di GAS untuk melihat detailnya
    
    const json = JSON.parse(result);
    if (json.status === true) {
      return "success";
    } else {
      return "failed: " + json.reason;
    }
  } catch (e) {
    console.log("Error: " + e.toString());
    return "error: " + e.toString();
  }
}

// Format Pesan Formal untuk Pemulihan
function handleForgotPassword(data) {
  try {
    const ss = SpreadsheetApp.openById(MASTER_SS_ID);
    const sheet = ss.getSheetByName(MASTER_SHEET_NAME);
    const values = sheet.getDataRange().getValues();
    let userData = null;

    for (let i = 1; i < values.length; i++) {
      if (values[i][0] == data.username && (values[i][3] == data.contact || values[i][6] == data.contact)) {
        userData = {
          name: values[i][0],
          pass: values[i][2],
          wa: values[i][3],
          email: values[i][6]
        };
        break;
      }
    }

    if (!userData) return createResponse("error", "Data akun tidak ditemukan.");

    const formalMsg = 
      `Yth. Bapak/Ibu *${userData.name}*,\n\n` +
      `Terima kasih telah menghubungi layanan bantuan *SapaTamu.ku*.\n\n` +
      `Sesuai permintaan Anda, berikut adalah detail akses akun yang terdaftar:\n` +
      `--------------------------\n` +
      `*Username* : ${userData.name}\n` +
      `*Password* : ${userData.pass}\n` +
      `--------------------------\n\n` +
      `Demi keamanan, mohon untuk segera mengganti kata sandi Anda melalui menu 'Ganti Password' di halaman utama.\n\n` +
      `Terima kasih telah menggunakan layanan kami.\n\n` +
      `Salam hangat,\n` +
      `*Management SapaTamu.ku*`;

    // Kirim WA Otomatis
    sendWA(userData.wa, formalMsg);

    // Kirim Email Otomatis (Tanpa simbol bintang Markdown)
    if (userData.email) {
      MailApp.sendEmail(userData.email, "Pemulihan Akses SapaTamu.ku", formalMsg.replace(/\*/g, ''));
    }

    return createResponse("success", "Detail akun telah dikirimkan secara otomatis via WhatsApp & Email.");
  } catch (err) {
    return createResponse("error", "Terjadi gangguan sistem. Silakan hubungi Admin.");
  }
}

// --- FUNGSI GANTI PASSWORD ---
function handleChangePassword(data) {
  try {
    const ss = SpreadsheetApp.openById(MASTER_SS_ID);
    const sheet = ss.getSheetByName(MASTER_SHEET_NAME);
    const values = sheet.getDataRange().getValues();

    for (let i = 1; i < values.length; i++) {
      if (values[i][0] == data.username && values[i][2] == data.currentPass) {
        sheet.getRange(i + 1, 3).setValue(data.newPass); // Update Kolom C
        return createResponse("success", "Password berhasil diperbarui secara permanen.");
      }
    }
    return createResponse("error", "Password saat ini tidak cocok.");
  } catch (err) {
    return createResponse("error", "Gagal memperbarui database.");
  }
}

// --- FUNGSI LAINNYA ---
function handleCopyMaster(data) {
  try {
    const folder = DriveApp.getFolderById(FOLDER_KLIEN_ID);
    const template = DriveApp.getFileById(CLIENT_MASTER_ID);
    const newFile = template.makeCopy("TEMP_" + data.clientName, folder);
    const newId = newFile.getId();
    const targetSS = SpreadsheetApp.openById(newId).getSheets()[0];
    
    targetSS.getRange("A1:B1").setValues([["Nama Pengantin :", data.eventData.nama]]);
    targetSS.getRange("D1:G1").setValues([["Sesi Undangan :", data.eventData.s1, data.eventData.s2, data.eventData.s3]]);
    targetSS.getRange("A2:B2").setValues([["Hari & Tanggal :", data.eventData.tgl]]);
    targetSS.getRange("A3:B3").setValues([["Lokasi Acara :", data.eventData.lokasi]]);
    targetSS.getRange("A4:B4").setValues([["Waktu Acara :", data.eventData.waktu]]);
    targetSS.getRange("A5:B5").setValues([["Link Invitation :", data.eventData.link]]);

    return createResponse("success", "Spreadsheet berhasil dibuat", { fileId: newId });
  } catch (err) {
    return createResponse("error", "Gagal Copy: " + err.toString());
  }
}

function handleLogin(data) {
  try {
    const ss = SpreadsheetApp.openById(MASTER_SS_ID);
    const sheet = ss.getSheetByName(MASTER_SHEET_NAME);
    const values = sheet.getDataRange().getValues();

    for (let i = 1; i < values.length; i++) {
      if (values[i][0] == data.username && values[i][2] == data.password) {
        return createResponse("success", "Login Berhasil", {
          username: values[i][0],
          ssId: values[i][1],
          whatsapp: values[i][3],
          email: values[i][6]
        });
      }
    }
    return createResponse("error", "Username atau Password salah");
  } catch (err) {
    return createResponse("error", "Kesalahan Login");
  }
}

function handleUpdateClientData(data) {
  try {
    const targetSS = SpreadsheetApp.openById(data.ssId).getSheets()[0];
    targetSS.getRange("A1:B1").setValues([["Nama Pengantin :", data.eventData.nama]]);
    targetSS.getRange("D1:G1").setValues([["Sesi Undangan :", data.eventData.s1, data.eventData.s2, data.eventData.s3]]);
    targetSS.getRange("A2:B2").setValues([["Hari & Tanggal :", data.eventData.tgl]]);
    targetSS.getRange("A3:B3").setValues([["Lokasi Acara :", data.eventData.lokasi]]);
    targetSS.getRange("A4:B4").setValues([["Waktu Acara :", data.eventData.waktu]]);
    targetSS.getRange("A5:B5").setValues([["Link Invitation :", data.eventData.link]]);
    return createResponse("success", "Data berhasil diperbarui");
  } catch (err) {
    return createResponse("error", "Update gagal.");
  }
}

function createResponse(status, message, data = null) {
  const result = { status: status, message: message, data: data };
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
