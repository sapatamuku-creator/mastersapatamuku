/**
 * SAPATAMU.KU - CENTRAL BACKEND (UPDATED 2026)
 * Fokus: Auth, Register, Auto-Copy, Email & WA Recovery
 * Migrated to New Drive Environment
 */

const MASTER_SS_ID = "1R99hDczYr4_OW7l41_DDrYuQRwZx30rhhaRHbJfRq1I"; 
const FOLDER_KLIEN_ID = "1vKXjrfkPLHctEHc_RqK8hSDizpBjph4P"; 
const MASTER_SHEET_NAME = "Sheet1";

// MAPPING TEMPLATE PER KATEGORI
const MASTER_TEMPLATES = {
  "wedding": "10H7oTK0ehhiba9Ire4tUTAV1Hye7RXrNdX6jQJYw20A",
  "birthday": "16qigm_cMOhBf0w5x8FOF26YHraKSfFYSlg574JIa0ew",
  "anniversary": "1e6BMa01k8dTs5uyMWBYaKGY6W7zxziLmVhJ_YfjO8q8",
  "corporate": "1g25_lGhscLxelq5Wa1Sft_QDGu0LOxbd3pNAtmWzt5I",
  "gathering": "1Q-QTWqSx5G2VbQfLoqneMPUIK4f29zz0uaPyAaMREsY"
};
const ADMIN_WA = "6285111567829";
const ADMIN_EMAIL = "sapatamuku@gmail.com";
const FONNTE_TOKEN = "fRx1Canf4GYroBZZNfo7";

function handleCentralPost(request) {
  const action = request.action;
  
  switch(action) {
    case 'copyMaster': return handleCopyMaster(request); 
    case 'register': return handleRegister(request); 
    case 'login': return handleLogin(request);
    case 'forgotPassword': return handleForgotPassword(request); 
    case 'changePassword': return handleChangePassword(request);
    case 'updateClientData': return handleUpdateClientData(request);  
    case 'resolveSubdomain': return handleResolveSubdomain(request);
    case 'uploadFile': return handleUploadFile(request);
    default: return createResponse({ status: "error", message: "Action tidak dikenali" });
  }
}

// --- FUNGSI REGISTER (TAMBAH EMAIL) ---
function handleRegister(data) {
  try {
    const ss = SpreadsheetApp.openById(MASTER_SS_ID);
    const sheet = ss.getSheetByName(MASTER_SHEET_NAME);
    const values = sheet.getDataRange().getValues();
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] == data.username) return createResponse({ status: "error", message: "Username sudah terdaftar" });
    }

    const file = DriveApp.getFileById(data.ssId);
    const cleanUser = data.username.replace(/\s+/g, '');
    const finalName = (data.weddingDate || "NoDate") + " - " + cleanUser;
    file.setName(finalName);

    // Append Row ke Master (Kolom G untuk Email, Kolom H untuk Status, Kolom I untuk Kategori)
    sheet.appendRow([
      data.username,     // A
      data.ssId,         // B
      data.password,     // C
      data.whatsapp,     // D
      data.weddingDate,  // E
      new Date(),        // F
      data.email,        // G
      "Active",          // H
      data.category || "wedding" // I: Kategori Event
    ]);

    return createResponse({ status: "success", message: "Pendaftaran berhasil" });
  } catch (err) {
    return createResponse({ status: "error", message: "Gagal pendaftaran: " + err.toString() });
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

    if (!userData) return createResponse({ status: "error", message: "Data akun tidak ditemukan." });

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

    return createResponse({ status: "success", message: "Detail akun telah dikirimkan secara otomatis via WhatsApp & Email." });
  } catch (err) {
    return createResponse({ status: "error", message: "Terjadi gangguan sistem. Silakan hubungi Admin." });
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
        return createResponse({ status: "success", message: "Password berhasil diperbarui secara permanen." });
      }
    }
    return createResponse({ status: "error", message: "Password saat ini tidak cocok." });
  } catch (err) {
    return createResponse({ status: "error", message: "Gagal memperbarui database." });
  }
}

// --- FUNGSI LAINNYA ---
function handleCopyMaster(data) {
  try {
    const category = (data.category || "wedding").toLowerCase();
    const templateId = MASTER_TEMPLATES[category] || MASTER_TEMPLATES["wedding"];
    
    const folder = DriveApp.getFolderById(FOLDER_KLIEN_ID);
    const template = DriveApp.getFileById(templateId);
    const newFile = template.makeCopy("[" + category.toUpperCase() + "] " + data.clientName, folder);
    const newId = newFile.getId();
    const targetSS = SpreadsheetApp.openById(newId);
    const targetSheet = targetSS.getSheetByName(MASTER_SHEET_NAME);
    
    // Simpan Kategori di Sheet Config (B3)
    let configSheet = targetSS.getSheetByName("Config");
    if (!configSheet) {
      configSheet = targetSS.insertSheet("Config");
      configSheet.getRange("A1:A3").setValues([["URL_FOTO"], ["PRESET_STYLE"], ["CATEGORY"]]);
    }
    configSheet.getRange("B3").setValue(category.toUpperCase());

    const themes = {
      wedding: { client: "Nama Pengantin :", date: "Hari & Tanggal :", loc: "Lokasi Acara :", time: "Waktu Acara :", link: "Link Invitation :" },
      birthday: { client: "Nama Klien :", date: "Hari & Tanggal :", loc: "Lokasi Acara :", time: "Waktu Acara :", link: "Link Invitation :" },
      anniversary: { client: "Nama Klien :", date: "Hari & Tanggal :", loc: "Lokasi Acara :", time: "Waktu Acara :", link: "Link Invitation :" },
      corporate: { client: "Nama Perusahaan :", date: "Hari & Tanggal :", loc: "Lokasi Acara :", time: "Waktu Acara :", link: "Link Invitation :" },
      gathering: { client: "Nama Komunitas :", date: "Hari & Tanggal :", loc: "Lokasi Acara :", time: "Waktu Acara :", link: "Link Invitation :" }
    };
    const t = themes[category] || themes.wedding;

    targetSheet.getRange("A1:B1").setValues([[t.client, data.eventData.nama]]);
    targetSheet.getRange("D1:G1").setValues([["Sesi Undangan :", data.eventData.s1, data.eventData.s2, data.eventData.s3]]);
    targetSheet.getRange("A2:B2").setValues([[t.date, data.eventData.tgl]]);
    targetSheet.getRange("A3:B3").setValues([[t.loc, data.eventData.lokasi]]);
    targetSheet.getRange("A4:B4").setValues([[t.time, data.eventData.waktu]]);
    targetSheet.getRange("A5:B5").setValues([[t.link, data.eventData.link]]);

    return createResponse({ status: "success", message: "Spreadsheet berhasil dibuat", data: { fileId: newId } });
  } catch (err) {
    return createResponse({ status: "error", message: "Gagal Copy: " + err.toString() });
  }
}

function handleLogin(data) {
  try {
    const ss = SpreadsheetApp.openById(MASTER_SS_ID);
    const sheet = ss.getSheetByName(MASTER_SHEET_NAME);
    const values = sheet.getDataRange().getValues();
    const targetUser = String(data.username || "").toLowerCase().trim();

    for (let i = 1; i < values.length; i++) {
      const dbUser = String(values[i][0] || "").toLowerCase().trim();
      if (dbUser === targetUser && values[i][2] == data.password) {
        // SET STATUS KE ACTIVE SAAT LOGIN (KOLOM H)
        sheet.getRange(i + 1, 8).setValue("Active");

        return createResponse({ status: "success", message: "Login Berhasil", data: {
          username: values[i][0],
          ssId: values[i][1],
          whatsapp: values[i][3],
          email: values[i][6],
          category: values[i][8] || "wedding" // Kolom I
        } });
      }
    }
    return createResponse({ status: "error", message: "Username atau Password salah" });
  } catch (err) {
    return createResponse({ status: "error", message: "Kesalahan Login: " + err.toString() });
  }
}

function handleLogout(data) {
  try {
    const ss = SpreadsheetApp.openById(MASTER_SS_ID);
    const sheet = ss.getSheetByName(MASTER_SHEET_NAME);
    const values = sheet.getDataRange().getValues();
    const targetUser = String(data.username || "").toLowerCase().trim();
    
    for (let i = 1; i < values.length; i++) {
      const dbUser = String(values[i][0] || "").toLowerCase().trim();
      if (dbUser === targetUser) {
        // STATUS TETAP AKTIF (Kolom H tidak diubah)
        // Keamanan logout dikelola oleh pembersihan session di browser
        
        if (data.redirect) {
          return HtmlService.createHtmlOutput("<script>window.top.location.replace('" + data.redirect + "');</script>");
        }
        
        return createResponse({ status: "success", message: "Logout berhasil" });
      }
    }
    
    if (data.redirect) {
      return HtmlService.createHtmlOutput("<script>window.top.location.replace('" + data.redirect + "');</script>");
    }
    return createResponse({ status: "error", message: "User tidak ditemukan: " + targetUser });
  } catch (err) {
    return createResponse({ status: "error", message: err.toString() });
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
    
    // Simpan ke Config
    const ss = SpreadsheetApp.openById(data.ssId);
    let configSheet = ss.getSheetByName("Config");
    if (configSheet) {
      if (data.eventData.waPhone) configSheet.getRange("B5").setValue(data.eventData.waPhone);
      if (data.eventData.theme) configSheet.getRange("B6").setValue(data.eventData.theme);
    }
    
    // Simpan ke InvConfig (Sheet Khusus)
    let invSheet = ss.getSheetByName("InvConfig");
    if (!invSheet) {
      invSheet = ss.insertSheet("InvConfig");
      invSheet.getRange("A1").setValue("JSON_DATA_UNDANGAN :");
    }
    if (data.eventData.invitationData) {
      invSheet.getRange("B1").setValue(JSON.stringify(data.eventData.invitationData));
    }
    
    return createResponse({ status: "success", message: "Data berhasil diperbarui" });
  } catch (err) {
    return createResponse({ status: "error", message: "Update gagal." });
  }
}

// createResponse removed (using UnifiedRouter version)

// --- FUNGSI RESOLVE SUBDOMAIN (VERSI SEDERHANA) ---
function handleResolveSubdomain(data) {
  try {
    const ss = SpreadsheetApp.openById(MASTER_SS_ID);
    const sheet = ss.getSheetByName(MASTER_SHEET_NAME);
    const values = sheet.getDataRange().getValues();
    const sub = data.subdomain.toLowerCase().trim();
    
    for (let i = 1; i < values.length; i++) {
      const dbUserRaw = String(values[i][0] || "");
      const dbUserCleaned = dbUserRaw.toLowerCase().replace(/\s+/g, '').trim();
      const status = String(values[i][7] || "").toLowerCase().trim(); // Kolom H (Index 7)

      if (dbUserCleaned === sub) {
        // CEK APAKAH AKUN DIBLOKIR/EXPIRED OLEH ADMIN
        if (status !== "active") {
          return createResponse({ 
            status: "error", 
            message: "Akun ini telah dinonaktifkan oleh Admin. Silakan hubungi pusat." 
          });
        }

        return createResponse({ 
          status: "success", 
          ssId: values[i][1],
          clientName: values[i][0],
          category: values[i][8] || "wedding" // Kolom I
        });
      }
    }
    return createResponse({ status: "error", message: "Subdomain tidak terdaftar" });
  } catch (e) {
    return createResponse({ status: "error", message: e.toString() });
  }
}

// createResponse removed (using UnifiedRouter version)
function handleUploadFile(data) {
  try {
    const folderId = FOLDER_KLIEN_ID; // Default folder parent
    const ssFile = DriveApp.getFileById(data.ssId);
    const parentFolders = ssFile.getParents();
    let targetFolder = parentFolders.hasNext() ? parentFolders.next() : DriveApp.getFolderById(folderId);

    // Buat subfolder assets
    let assetFolder;
    const folders = targetFolder.getFoldersByName("InvitationAssets");
    if (folders.hasNext()) {
      assetFolder = folders.next();
    } else {
      assetFolder = targetFolder.createFolder("InvitationAssets");
      assetFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }

    // Decode base64
    const contentType = data.fileData.split(",")[0].split(":")[1].split(";")[0];
    const bytes = Utilities.base64Decode(data.fileData.split(",")[1]);
    const blob = Utilities.newBlob(bytes, contentType, data.fileName);
    
    const file = assetFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const url = "https://lh3.googleusercontent.com/d/" + file.getId(); // Direct image link format

    return createResponse({ status: "success", url: url });
  } catch (err) {
    return createResponse({ status: "error", message: err.toString() });
  }
}
