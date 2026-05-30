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

// CONFIG MIDTRANS PAYMENT GATEWAY
const MIDTRANS_SERVER_KEY = "PASTE_KEY_SANDBOX_DISINI"; // Sandbox Server Key
const MIDTRANS_IS_PRODUCTION = true; // Set ke true jika live production

function handleCentralPost(request) {
  const action = request.action;
  
  switch(action) {
    case 'copyMaster': return handleCopyMaster(request); 
    case 'register': return handleRegister(request); 
    case 'login': return handleLogin(request);
    case 'verifyAdminPassword': return handleVerifyAdminPassword(request);
    case 'forgotPassword': return handleForgotPassword(request); 
    case 'resetPasswordWithToken': return handleResetPasswordWithToken(request);
    case 'changePassword': return handleChangePassword(request);
    case 'updateClientData': return handleUpdateClientData(request);  
    case 'resolveSubdomain': return handleResolveSubdomain(request);
    case 'checkSubdomain': return handleCheckSubdomain(request);
    case 'uploadFile': return handleUploadFile(request);
    case 'createMidtransTransaction': return handleCreateMidtransTransaction(request);
    case 'sendOTP': return handleSendOTP(request);
    case 'savePendingClient': return handleSavePendingClient(request);
    case 'registerAndActivate': return handleRegisterAndActivate(request);
    case 'getOwnerClients': return handleGetOwnerClients(request);
    case 'updateOwnerClient': return handleUpdateOwnerClient(request);
    case 'deleteOwnerClient': return handleDeleteOwnerClient(request);
    case 'syncFromSupabase': return handleSyncFromSupabase(request);
    case 'upgradePackage': return handleUpgradePackage(request);
    case 'syncAllClients': return createResponse({ status: "success", message: syncAllClientsToSupabase() });
    case 'checkSlot': return handleCheckSlot(request);
    case 'getClientProfile': return handleGetClientProfile(request);
    default: return createResponse({ status: "error", message: "Action tidak dikenali" });
  }
}

// --- FUNGSI REGISTER (TAMBAH EMAIL) ---
// --- FUNGSI REGISTER (UPDATED FOR SUBDOMAIN) ---
function handleRegister(data) {
  try {
    const ss = SpreadsheetApp.openById(MASTER_SS_ID);
    const sheet = ss.getSheetByName(MASTER_SHEET_NAME);
    const values = sheet.getDataRange().getValues();
    
    const sub = data.subdomain.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Cek duplikasi di Kolom A (Username) atau Kolom J (Subdomain)
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] == sub || values[i][9] == sub) {
        return createResponse({ status: "error", message: "Subdomain / Username sudah terdaftar" });
      }
    }

    const file = DriveApp.getFileById(data.ssId);
    // Gunakan finalFileName dari frontend jika ada (format: "Minggu, 14 Juni 2026 - Alisha & Juan")
    // Fallback ke format lama untuk kompatibilitas
    const finalName = data.finalFileName || ((data.weddingDate || "NoDate") + " - " + data.clientName);
    file.setName(finalName);

    // Append Row ke Master
    // A: Username (Slug), B: ID, C: Pass, D: WA, E: Date, F: Created, G: Email, H: Status, I: Kategori, J: Subdomain (Slug), K: Nama Klien, L: Paket
    sheet.appendRow([
      sub,               // A: Username (Slug)
      data.ssId,         // B
      data.password,     // C
      data.whatsapp,     // D
      data.weddingDate,  // E
      new Date(),        // F
      data.email,        // G
      "Active",          // H
      data.category || "wedding", // I
      sub,               // J: Subdomain (Slug)
      data.clientName,   // K: Nama Klien (Full)
      data.package || "Silver" // L: Paket Terpilih
    ]);

    // Sinkronisasi ke Supabase
    try {
      syncClientToSupabase({
        username: sub,
        ssid: data.ssId,
        password: data.password,
        whatsapp: data.whatsapp,
        wedding_date: data.weddingDate,
        created_at: new Date().toISOString(),
        email: data.email,
        status: "Active",
        category: data.category || "wedding",
        subdomain: sub,
        client_name: data.clientName
      });
      syncAdminPasswordToSupabase();
    } catch (e) {
      console.error("Gagal sync saat pendaftaran ke Supabase: " + e.toString());
    }

    return createResponse({ status: "success", message: "Pendaftaran berhasil" });
  } catch (err) {
    return createResponse({ status: "error", message: "Gagal pendaftaran: " + err.toString() });
  }
}

// --- SIMPAN DATA PENDING KE SUPABASE (Sebelum Aktivasi Spreadsheet) ---
function handleSavePendingClient(data) {
  try {
    const sub = (data.subdomain || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!sub) return createResponse({ status: "error", message: "Subdomain tidak valid" });

    // Cek duplikasi di Master Sheet
    const ss = SpreadsheetApp.openById(MASTER_SS_ID);
    const sheet = ss.getSheetByName(MASTER_SHEET_NAME);
    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      const rowSub = String(values[i][9] || values[i][0]).toLowerCase();
      if (rowSub === sub) return createResponse({ status: "error", message: "Subdomain sudah terdaftar" });
    }

    // Simpan ke Supabase dengan status PendingActivation, ssid kosong
    syncClientToSupabaseWithResult({
      username: sub, ssid: "",
      password: data.password, whatsapp: data.whatsapp,
      wedding_date: data.weddingDate || "",
      created_at: new Date().toISOString(),
      email: data.email, status: "PendingActivation",
      category: data.category || "wedding",
      subdomain: sub, client_name: data.clientName,
      package: data.package || ""
    });

    return createResponse({ status: "success", message: "Data pendaftaran tersimpan" });
  } catch (err) {
    return createResponse({ status: "error", message: "Gagal simpan pending: " + err.toString() });
  }
}

// --- AKTIVASI AKUN: BUAT SPREADSHEET + REGISTER + SYNC SUPABASE ---
function handleRegisterAndActivate(data) {
  try {
    const sub = (data.subdomain || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const ss = SpreadsheetApp.openById(MASTER_SS_ID);
    const sheet = ss.getSheetByName(MASTER_SHEET_NAME);
    const values = sheet.getDataRange().getValues();

    // Cek duplikasi di Master Sheet (status Active)
    for (let i = 1; i < values.length; i++) {
      const rowSub = String(values[i][9] || values[i][0]).toLowerCase();
      const rowStatus = String(values[i][7]).toLowerCase();
      if (rowSub === sub && rowStatus === 'active') {
        return createResponse({ status: "error", message: "Akun sudah aktif, tidak bisa aktivasi ulang" });
      }
    }

    // Buat Spreadsheet dari Template
    const cat = data.category || 'wedding';
    const templateId = MASTER_TEMPLATES[cat] || MASTER_TEMPLATES['wedding'];
    const templateFile = DriveApp.getFileById(templateId);
    const folder = DriveApp.getFolderById(FOLDER_KLIEN_ID);
    const tgl = data.weddingDate || 'NoDate';
    const clientName = data.clientName || sub;
    const finalFileName = (tgl !== 'NoDate') ? `${tgl} - ${clientName}` : clientName;

    const newFile = templateFile.makeCopy(finalFileName, folder);
    const newSsId = newFile.getId();
    const sheet1 = SpreadsheetApp.openById(newSsId).getSheets()[0];

    // Inject data ke Spreadsheet Klien
    sheet1.getRange("A1:B1").setValues([["Nama Pengantin :", clientName]]);
    sheet1.getRange("A2:B2").setValues([["Hari & Tanggal :", tgl]]);
    sheet1.getRange("A3:B3").setValues([["Lokasi Acara :", data.address || ""]]);
    sheet1.getRange("A4:B4").setValues([["Waktu Acara :", ""]]);
    sheet1.getRange("A5:B5").setValues([["Link Invitation :", ""]]);

    // Append ke Master Sheet (Kolom A–M)
    sheet.appendRow([
      sub, newSsId, data.password, data.whatsapp, tgl, new Date(),
      data.email, "Active", cat, sub, clientName,
      data.package || "", tgl  // L: Paket, M: Event Date (slot check)
    ]);

    // Update/Sync ke Supabase dengan status Active + SSID
    try {
      syncClientToSupabase({
        username: sub, ssid: newSsId,
        password: data.password, whatsapp: data.whatsapp,
        wedding_date: tgl, created_at: new Date().toISOString(),
        email: data.email, status: "Active",
        category: cat, subdomain: sub,
        client_name: clientName, package: data.package || ""
      });
      syncAdminPasswordToSupabase();
    } catch (e) {
      console.error("Sync Supabase aktivasi gagal: " + e.toString());
    }

    // Kirim Email Invoice/Aktivasi
    if (data.email) {
      const emailHtml = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #E07B7B; margin: 0; font-size: 28px; font-weight: 800;">SapaTamu.ku</h2>
          <p style="color: #8C7560; font-size: 14px; margin-top: 5px;">Aktivasi Akun Berhasil</p>
        </div>
        <p style="color: #4A3F35; font-size: 16px; line-height: 1.5;">Halo <b>${clientName}</b>,</p>
        <p style="color: #4A3F35; font-size: 16px; line-height: 1.5;">Terima kasih atas kepercayaan Anda. Pembayaran Anda telah kami terima dan akun SapaTamu Anda kini <b>aktif</b>.</p>
        
        <div style="background-color: #FFF9F6; border: 1px solid #F0E6DE; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="margin-top:0; color: #E07B7B; font-size: 16px;">Ringkasan Pesanan:</h3>
          <ul style="color: #4A3F35; font-size: 14px; padding-left: 20px; line-height: 1.8;">
            <li><b>Username/Subdomain:</b> ${sub}</li>
            <li><b>Paket Layanan:</b> ${data.package || "Custom"}</li>
            <li><b>Tanggal Acara:</b> ${tgl}</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 35px 0;">
          <a href="https://sapatamuku-creator.github.io/mastersapatamuku/login.html" style="background-color: #E07B7B; color: #ffffff; padding: 14px 28px; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 8px; display: inline-block;">Masuk ke Dashboard Anda</a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #F0E6DE; margin: 30px 0;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">Jika Anda membutuhkan bantuan, silakan hubungi tim Admin kami.</p>
      </div>`;

      try {
        GmailApp.sendEmail(
          data.email, 
          "SapaTamu.ku - Akun Berhasil Diaktifkan!", 
          `Akun Anda dengan username ${sub} telah aktif. Silakan login ke dashboard.`,
          { name: "SapaTamu Activation", htmlBody: emailHtml }
        );
      } catch (e) {
        console.error("Gagal kirim email aktivasi: " + e.toString());
      }
    }

    return createResponse({
      status: "success",
      message: "Akun berhasil diaktifkan!",
      data: { ssId: newSsId, fileName: finalFileName }
    });
  } catch (err) {
    return createResponse({ status: "error", message: "Gagal aktivasi: " + err.toString() });
  }
}

// --- CEK KETERSEDIAAN SLOT (Aman: Data klien lain tidak bocor ke browser) ---
function handleCheckSlot(data) {
  try {
    const ss = SpreadsheetApp.openById(MASTER_SS_ID);
    const sheet = ss.getSheetByName(MASTER_SHEET_NAME);
    const values = sheet.getDataRange().getValues();
    
    const targetDate = String(data.date || '').trim();
    if (!targetDate) return createResponse({ status: "error", message: "Tanggal tidak diberikan" });
    
    const excludeUser = String(data.excludeUsername || '').toLowerCase();
    const usherOnly = data.usherOnly === true;

    let bookedCount = 0;
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const rowDate = String(row[4] || '').trim();
      const rowUser = String(row[0] || '').toLowerCase();
      const rowPackage = String(row[11] || '').toLowerCase();
      const rowStatus = String(row[7] || '').toLowerCase();
      
      if (rowStatus !== 'active') continue;
      if (rowDate !== targetDate) continue;
      if (excludeUser && rowUser === excludeUser) continue;
      
      if (usherOnly) {
        // Hanya hitung yang paket guestbook/collaboration karena butuh tim usher
        if (rowPackage.includes('guestbook') || rowPackage.includes('collaboration')) {
          bookedCount++;
        }
      } else {
        bookedCount++;
      }
    }

    return createResponse({ status: "success", available: bookedCount === 0 });
  } catch (err) {
    return createResponse({ status: "error", message: "Gagal cek slot: " + err.toString() });
  }
}

// --- AMBIL PROFIL KLIEN (Aman: Tidak mengirim password ke browser) ---
function handleGetClientProfile(data) {
  try {
    const username = String(data.username || '').toLowerCase().trim();
    if (!username) return createResponse({ status: "error", message: "Username tidak diberikan" });
    
    const ss = SpreadsheetApp.openById(MASTER_SS_ID);
    const sheet = ss.getSheetByName(MASTER_SHEET_NAME);
    const values = sheet.getDataRange().getValues();

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const rowUser = String(row[0] || '').toLowerCase();
      const rowSub  = String(row[9] || '').toLowerCase();
      if (rowUser === username || rowSub === username) {
        // Kembalikan data profil TANPA password
        return createResponse({
          status: "success",
          data: {
            username:     row[0],
            ssid:         row[1],
            whatsapp:     row[3],
            wedding_date: String(row[4] || ''),
            email:        row[6],
            status:       row[7],
            category:     row[8],
            subdomain:    row[9],
            client_name:  row[10],
            package:      row[11] || ''
          }
        });
      }
    }
    return createResponse({ status: "error", message: "Client tidak ditemukan" });
  } catch (err) {
    return createResponse({ status: "error", message: "Gagal ambil profil: " + err.toString() });
  }
}

function handleGetOwnerClients(data) {
  try {
    const ss = SpreadsheetApp.openById(MASTER_SS_ID);
    const sheet = ss.getSheetByName(MASTER_SHEET_NAME);
    const adminPass = String(sheet.getRange(1, 11).getValue() || "").trim();
    if (data.adminPassword !== adminPass) {
      return createResponse({ status: "error", message: "Password admin tidak valid" });
    }
    const values = sheet.getDataRange().getValues();
    const dValues = sheet.getDataRange().getDisplayValues();
    const clients = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const dRow = dValues[i];
      if (!row[0]) continue;
      
      let pwd = row[2];
      if (pwd instanceof Date) {
        pwd = dRow[2].replace(/\s+/g, '').toLowerCase();
      } else {
        pwd = String(pwd || "");
      }
      
      clients.push({
        username: row[0], ssid: row[1], password: pwd,
        whatsapp: row[3], wedding_date: String(row[4] || ""),
        created_at: String(row[5] || ""), email: row[6],
        status: row[7], category: row[8], subdomain: row[9],
        client_name: row[10], package: row[11] || "", event_date_m: row[12] || ""
      });
    }
    return createResponse({ status: "success", data: clients });
  } catch (err) {
    return createResponse({ status: "error", message: "Gagal ambil data: " + err.toString() });
  }
}

// --- OWNER DASHBOARD: UPDATE CLIENT (SYNC KE SUPABASE + MASTER SHEET) ---
function handleUpdateOwnerClient(data) {
  try {
    const ss = SpreadsheetApp.openById(MASTER_SS_ID);
    const sheet = ss.getSheetByName(MASTER_SHEET_NAME);
    const adminPass = String(sheet.getRange(1, 11).getValue() || "").trim();
    if (data.adminPassword !== adminPass) {
      return createResponse({ status: "error", message: "Password admin tidak valid" });
    }
    const values = sheet.getDataRange().getValues();
    const dValues = sheet.getDataRange().getDisplayValues();
    let rowIndex = -1;
    const targetSub = String(data.originalUsername || "").toLowerCase();
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]).toLowerCase() === targetSub) { rowIndex = i + 1; break; }
    }
    if (rowIndex === -1) return createResponse({ status: "error", message: "Client tidak ditemukan" });

    const c = data.clientData;
    const orig = values[rowIndex - 1];
    const dOrig = dValues[rowIndex - 1];
    
    let origPwd = orig[2];
    if (origPwd instanceof Date) {
      origPwd = dOrig[2].replace(/\s+/g, '').toLowerCase();
    } else {
      origPwd = String(origPwd || "");
    }

    const newRow = [
      c.username || orig[0], c.ssid || orig[1], c.password || origPwd,
      c.whatsapp || orig[3], c.wedding_date || orig[4], orig[5],
      c.email || orig[6], c.status || orig[7], c.category || orig[8],
      c.subdomain || orig[9], c.client_name || orig[10],
      c.package !== undefined ? c.package : (orig[11] || ""),
      c.event_date_m !== undefined ? c.event_date_m : (orig[12] || "")
    ];
    sheet.getRange(rowIndex, 1, 1, 13).setValues([newRow]);

    // Sync perubahan ke Supabase
    try {
      syncClientToSupabase({
        username: newRow[0], ssid: newRow[1], password: newRow[2],
        whatsapp: newRow[3], wedding_date: newRow[4],
        created_at: new Date(newRow[5]).toISOString(),
        email: newRow[6], status: newRow[7], category: newRow[8],
        subdomain: newRow[9], client_name: newRow[10], package: newRow[11] || ""
      });
    } catch (e) { console.error("Sync update owner ke Supabase gagal: " + e.toString()); }

    return createResponse({ status: "success", message: "Data client berhasil diperbarui." });
  } catch (err) {
    return createResponse({ status: "error", message: "Gagal update data: " + err.toString() });
  }
}

// --- OWNER DASHBOARD: DELETE CLIENT (HAPUS MASTER ROW, SPREADSHEET FILES, SUPABASE ROW) ---
function handleDeleteOwnerClient(data) {
  try {
    const ss = SpreadsheetApp.openById(MASTER_SS_ID);
    const sheet = ss.getSheetByName(MASTER_SHEET_NAME);
    const adminPass = String(sheet.getRange(1, 11).getValue() || "").trim();
    if (data.adminPassword !== adminPass) {
      return createResponse({ status: "error", message: "Password admin tidak valid" });
    }

    const values = sheet.getDataRange().getValues();
    let rowIndex = -1;
    let ssidToDelete = "";
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.username) {
        if (String(values[i][7]) === 'Active') {
           return createResponse({ status: "error", message: "Client berstatus Active tidak boleh dihapus! Ubah ke Inactive terlebih dahulu."});
        }
        rowIndex = i + 1; // 1-indexed for Sheets
        ssidToDelete = values[i][1];
        break;
      }
    }

    if (rowIndex === -1) {
      return createResponse({ status: "error", message: "Data client tidak ditemukan." });
    }

    // 1. Hapus dari Master Sheet
    sheet.deleteRow(rowIndex);

    // 2. Hapus Spreadsheet File (pindahkan ke sampah)
    if (ssidToDelete) {
      try {
        DriveApp.getFileById(ssidToDelete).setTrashed(true);
      } catch (errDrive) {
        console.error("Gagal hapus file drive: " + errDrive.toString());
      }
    }

    // 3. Hapus dari Supabase via REST API
    try {
      deleteClientFromSupabaseWithResult(data.username);
    } catch(errSb) {
       console.error("Gagal hapus dari supabase: " + errSb.toString());
    }

    return createResponse({ status: "success", message: "Data client dan spreadsheet berhasil dihapus." });
  } catch (err) {
    return createResponse({ status: "error", message: "Gagal hapus client: " + err.toString() });
  }
}

function deleteClientFromSupabaseWithResult(username) {
  const sbUrl = "https://llrapesaaoliyjrrrsjh.supabase.co/rest/v1/clients?username=eq." + encodeURIComponent(username);
  const apiKey = "PASTE_NEW_SUPABASE_SERVICE_ROLE_KEY_HERE";
  
  const options = {
    method: "delete",
    headers: {
      "apikey": apiKey,
      "Authorization": "Bearer " + apiKey
    },
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(sbUrl, options);
  return response.getContentText();
}


function handleSendOTP(data) {
  try {
    if (!data.otp) {
      return createResponse({ status: "error", message: "OTP wajib diisi" });
    }
    
    const channel = data.channel || "wa";

    if (channel === "email") {
      if (!data.email) return createResponse({ status: "error", message: "Email tujuan wajib diisi" });
      
      const emailHtml = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #E07B7B; margin: 0; font-size: 28px; font-weight: 800;">SapaTamu.ku</h2>
          <p style="color: #8C7560; font-size: 14px; margin-top: 5px;">Verifikasi Keamanan Akun</p>
        </div>
        <p style="color: #4A3F35; font-size: 16px; line-height: 1.5;">Halo,</p>
        <p style="color: #4A3F35; font-size: 16px; line-height: 1.5;">Berikut adalah kode OTP 6-digit untuk melanjutkan proses pendaftaran atau verifikasi akun SapaTamu Anda:</p>
        <div style="background-color: #FFF9F6; border: 2px dashed #E07B7B; padding: 20px; text-align: center; border-radius: 8px; margin: 25px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4A3F35;">${data.otp}</span>
        </div>
        <p style="color: #4A3F35; font-size: 14px; line-height: 1.5;"><strong>Peringatan Keamanan:</strong> Jangan pernah membagikan kode OTP ini kepada siapa pun, termasuk pihak yang mengaku sebagai tim SapaTamu.ku.</p>
        <hr style="border: none; border-top: 1px solid #F0E6DE; margin: 30px 0;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">Email ini dihasilkan secara otomatis. Mohon tidak membalas email ini.</p>
      </div>`;

      GmailApp.sendEmail(
        data.email, 
        "Kode Verifikasi OTP SapaTamu.ku", 
        `Kode OTP Anda adalah: ${data.otp}. Jangan bagikan kode ini kepada siapapun.`, 
        {
          name: "SapaTamu Security",
          htmlBody: emailHtml
        }
      );
      return createResponse({ status: "success", message: "OTP terkirim via Email" });
    } else {
      // Default to WA
      if (!data.whatsapp) return createResponse({ status: "error", message: "WhatsApp tujuan wajib diisi" });
      const message = `*KODE OTP SAPATAMU.KU*\n\nKode OTP Anda adalah: *${data.otp}*\n\nKode ini digunakan untuk verifikasi pendaftaran akun SapaTamu Anda. Rahasiakan kode ini dari siapa pun.`;
      const res = sendWA(data.whatsapp, message);
      if (res === "success") {
        return createResponse({ status: "success", message: "OTP terkirim via WhatsApp" });
      } else {
        return createResponse({ status: "error", message: "Gagal mengirim OTP: " + res });
      }
    }
  } catch (e) {
    return createResponse({ status: "error", message: "Terjadi error OTP: " + e.toString() });
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

    // Generate Token (6 jam valid)
    const token = Utilities.getUuid();
    CacheService.getScriptCache().put("reset_" + token, userData.name, 21600); 

    // Build reset link. Either use provided origin, or fallback to default pages
    const baseUrl = data.baseUrl || "https://sapatamuku-creator.github.io/mastersapatamuku";
    const resetLink = baseUrl + (baseUrl.endsWith('/') ? '' : '/') + "reset.html?token=" + token;

    const emailHtml = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #E07B7B; margin: 0; font-size: 28px; font-weight: 800;">SapaTamu.ku</h2>
          <p style="color: #8C7560; font-size: 14px; margin-top: 5px;">Permintaan Reset Password</p>
        </div>
        <p style="color: #4A3F35; font-size: 16px; line-height: 1.5;">Halo <b>${userData.name}</b>,</p>
        <p style="color: #4A3F35; font-size: 16px; line-height: 1.5;">Kami menerima permintaan untuk melakukan pengaturan ulang kata sandi (reset password) pada akun SapaTamu Anda.</p>
        
        <div style="text-align: center; margin: 35px 0;">
          <a href="${resetLink}" style="background-color: #E07B7B; color: #ffffff; padding: 14px 28px; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 8px; display: inline-block;">Reset Password Saya</a>
        </div>
        
        <p style="color: #4A3F35; font-size: 14px; line-height: 1.5;">Tautan ini hanya berlaku selama 6 jam. Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini dan akun Anda akan tetap aman.</p>
        
        <hr style="border: none; border-top: 1px solid #F0E6DE; margin: 30px 0;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">Email ini dihasilkan secara otomatis. Mohon tidak membalas email ini.</p>
      </div>`;

    if (userData.email) {
      GmailApp.sendEmail(
        userData.email, 
        "Reset Akses SapaTamu.ku", 
        `Gunakan link berikut untuk mereset password Anda: ${resetLink}`,
        {
          name: "SapaTamu Security",
          htmlBody: emailHtml
        }
      );
    }
    
    // Kirim WA Otomatis
    const formalMsg = `Yth. Bapak/Ibu *${userData.name}*,\n\nKami menerima permintaan pengaturan ulang kata sandi akun SapaTamu Anda. Silakan klik tautan berikut untuk mengganti sandi:\n${resetLink}\n\n(Tautan berlaku selama 6 jam)\n\nJika Anda tidak merasa meminta reset password, abaikan pesan ini.`;
    sendWA(userData.wa, formalMsg);

    return createResponse({ status: "success", message: "Tautan reset telah dikirimkan secara otomatis via WhatsApp & Email." });
  } catch (err) {
    return createResponse({ status: "error", message: "Terjadi gangguan sistem. Silakan hubungi Admin." });
  }
}

function handleResetPasswordWithToken(data) {
  try {
    const token = data.token;
    const newPass = data.newPass;

    if (!token || !newPass) return createResponse({ status: "error", message: "Token dan password baru wajib diisi." });

    const username = CacheService.getScriptCache().get("reset_" + token);
    if (!username) return createResponse({ status: "error", message: "Token tidak valid atau sudah kadaluarsa. Silakan minta ulang reset password dari awal." });

    const ss = SpreadsheetApp.openById(MASTER_SS_ID);
    const sheet = ss.getSheetByName(MASTER_SHEET_NAME);
    const values = sheet.getDataRange().getValues();

    let updated = false;
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] == username) {
        sheet.getRange(i + 1, 3).setValue(newPass); // Update Kolom C
        updated = true;
        break;
      }
    }

    if (!updated) return createResponse({ status: "error", message: "Akun tidak ditemukan pada sistem." });

    // Hapus token agar tidak bisa digunakan lagi
    CacheService.getScriptCache().remove("reset_" + token);

    // Minta force sync ke Supabase
    manualForceSyncAllClients();

    return createResponse({ status: "success", message: "Password berhasil diubah." });
  } catch (err) {
    return createResponse({ status: "error", message: "Terjadi kesalahan sistem: " + err.toString() });
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

        // Sinkronisasi perubahan password ke Supabase
        try {
          syncClientToSupabase({
            username: values[i][0],
            ssid: values[i][1],
            password: data.newPass, // Password baru
            whatsapp: values[i][3],
            wedding_date: values[i][4],
            created_at: values[i][5] ? new Date(values[i][5]).toISOString() : new Date().toISOString(),
            email: values[i][6],
            status: values[i][7] || "Active",
            category: values[i][8] || "wedding",
            subdomain: values[i][9] || values[i][0],
            client_name: values[i][10]
          });
        } catch (errSupabase) {
          console.error("Gagal sync password baru ke Supabase: " + errSupabase.toString());
        }

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
    const dValues = sheet.getDataRange().getDisplayValues();

    // Baca admin password dari K1 (kolom 11, index 10) — baris pertama header
    const adminPassword = String(sheet.getRange(1, 11).getValue() || "").trim();

    // Normalisasi username: lowercase, hapus spasi & "&"
    const normalize = s => String(s || "").toLowerCase().replace(/[\s&]/g, '');
    const targetUser = normalize(data.username);
    const inputPass  = String(data.password || "");

    for (let i = 1; i < values.length; i++) {
      const colA = normalize(values[i][0]);  // Col A: username asli
      const colJ = normalize(values[i][9]);  // Col J: subdomain slug

      if (colA !== targetUser && colJ !== targetUser) continue;

      // Cocok username — tentukan role berdasarkan password
      let clientPassword = values[i][2];
      if (clientPassword instanceof Date) {
        clientPassword = dValues[i][2].replace(/\s+/g, '').toLowerCase();
      } else {
        clientPassword = String(clientPassword || "");
      }
      
      let role = null;

      if (adminPassword && inputPass === adminPassword) {
        role = "usher"; // Login sebagai Admin/Usher Sapatamu
      } else if (inputPass === clientPassword) {
        role = "client"; // Login sebagai Client
      }

      if (!role) {
        return createResponse({ status: "error", message: "Password salah" });
      }

      // HANYA SET STATUS KE ACTIVE JIKA BELUM ACTIVE (MENGURANGI LOCK SHEET)
      if (values[i][7] !== "Active") {
        sheet.getRange(i + 1, 8).setValue("Active");
      }

      return createResponse({ status: "success", message: "Login Berhasil", data: {
        username:  values[i][10] || values[i][0], // Kolom K (display name) atau A
        subdomain: values[i][9]  || values[i][0], // Kolom J atau A
        ssId:      values[i][1],
        whatsapp:  values[i][3],
        email:     values[i][6],
        category:  values[i][8] || "wedding",
        role:      role           // ← BARU: 'client' | 'usher'
      } });
    }

    return createResponse({ status: "error", message: "Username atau Password salah" });
  } catch (err) {
    return createResponse({ status: "error", message: "Kesalahan Login: " + err.toString() });
  }
}

// Verifikasi admin password saja (untuk Switch to Admin modal di halaman lapangan)
function handleVerifyAdminPassword(data) {
  try {
    const ss    = SpreadsheetApp.openById(MASTER_SS_ID);
    const sheet = ss.getSheetByName(MASTER_SHEET_NAME);
    const adminPassword = String(sheet.getRange(1, 11).getValue() || "").trim();
    const inputPass = String(data.password || "");
    if (adminPassword && inputPass === adminPassword) {
      return createResponse({ status: "success", message: "Password admin benar" });
    }
    return createResponse({ status: "error", message: "Password salah" });
  } catch (err) {
    return createResponse({ status: "error", message: err.toString() });
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
    
    // Sync Metadata ke Supabase secara otomatis
    syncMetadataClientToSupabase(data.ssId, targetSS);
    
    return createResponse({ status: "success", message: "Data berhasil diperbarui" });
  } catch (err) {
    return createResponse({ status: "error", message: "Update gagal." });
  }
}

function syncMetadataClientToSupabase(ssId, targetSS) {
  try {
    const sbUrl = "https://llrapesaaoliyjrrrsjh.supabase.co/rest/v1/metadata_client?on_conflict=ssid";
    const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxscmFwZXNhYW9saXlqcnJyc2poIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTE3NTY4NSwiZXhwIjoyMDk0NzUxNjg1fQ.Bf0mQybvXLfou-zQVxeLq1Cba3H4DprOhXaj02n9njg";
    
    const bValues = targetSS.getRange("B1:C6").getValues();
    const sValues = targetSS.getRange("E1:G1").getValues();
    
    const payload = {
      ssid: ssId,
      nama_pengantin: String(bValues[0][0] || ""),
      hari_tanggal: String(bValues[1][0] || ""),
      lokasi_acara: String(bValues[2][0] || ""),
      waktu_acara: String(bValues[3][0] || ""),
      link_invitation: String(bValues[4][0] || ""),
      format_pesan_wa: String(bValues[5][0] || ""),
      format_pesan_wa_custom: String(bValues[5][1] || ""),
      sesi_1: String(sValues[0][0] || ""),
      sesi_2: String(sValues[0][1] || ""),
      sesi_3: String(sValues[0][2] || ""),
      updated_at: new Date().toISOString()
    };
    
    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "apikey": apiKey,
        "Authorization": "Bearer " + apiKey,
        "Prefer": "resolution=merge-duplicates"
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    UrlFetchApp.fetch(sbUrl, options);
  } catch(e) {
    console.error("syncMetadataClientToSupabase error: " + e.toString());
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
      const colJ = String(values[i][9] || "").toLowerCase().trim();
      const colA = String(values[i][0] || "").toLowerCase().replace(/\s+/g, '').trim();
      
      // LOGIKA: Cek Kolom J dulu, jika kosong baru cek Kolom A (Akun Lama)
      const dbSub = colJ || colA; 
      const status = String(values[i][7] || "").toLowerCase().trim(); // Kolom H (Index 7)

      if (dbSub === sub) {
        if (status !== "active") {
          return createResponse({ 
            status: "error", 
            message: "Akun ini telah dinonaktifkan oleh Admin. Silakan hubungi pusat." 
          });
        }

        return createResponse({ 
          status: "success", 
          ssId: values[i][1],
          clientName: values[i][10] || values[i][0], // Nama Klien di Kolom K (Index 10) atau Kolom A
          category: values[i][8] || "wedding" // Kolom I (Index 8)
        });
      }
    }
    return createResponse({ status: "error", message: "Subdomain tidak terdaftar" });
  } catch (e) {
    return createResponse({ status: "error", message: e.toString() });
  }
}

// --- FUNGSI CEK KETERSEDIAAN SUBDOMAIN ---
function handleCheckSubdomain(data) {
  try {
    const ss = SpreadsheetApp.openById(MASTER_SS_ID);
    const sheet = ss.getSheetByName(MASTER_SHEET_NAME);
    const values = sheet.getDataRange().getValues();
    const sub = data.subdomain.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    
    if (!sub || sub.length < 3) return createResponse({ status: "too_short" });

    for (let i = 1; i < values.length; i++) {
      const rawJ = String(values[i][9] || "").trim();
      
      if (!rawJ) continue;

      const colJ = rawJ.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // HANYA CEK KOLOM J (Subdomain)
      if (colJ === sub) {
        return createResponse({ 
          status: "taken", 
          message: "Subdomain '" + rawJ + "' sudah dimiliki oleh klien lain. Silakan coba nama lain."
        });
      }
    }
    return createResponse({ status: "available" });
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

// --- SINKRONISASI MASTER CLIENTS KE SUPABASE ---
function syncClientToSupabase(rowData) {
  try {
    const resText = syncClientToSupabaseWithResult(rowData);
    console.log("Supabase Sync Client Result: " + resText);
  } catch (e) {
    console.error("Gagal sinkronisasi ke Supabase: " + e.toString());
  }
}

function syncClientToSupabaseWithResult(rowData) {
  const sbUrl = "https://llrapesaaoliyjrrrsjh.supabase.co/rest/v1/clients";
  const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxscmFwZXNhYW9saXlqcnJyc2poIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTE3NTY4NSwiZXhwIjoyMDk0NzUxNjg1fQ.Bf0mQybvXLfou-zQVxeLq1Cba3H4DprOhXaj02n9njg";
  
  const payload = {
    username: rowData.username,
    ssid: rowData.ssid,
    password: rowData.password,
    whatsapp: rowData.whatsapp,
    wedding_date: rowData.wedding_date,
    created_at: rowData.created_at ? new Date(rowData.created_at).toISOString() : new Date().toISOString(),
    email: rowData.email,
    status: rowData.status || "Active",
    category: rowData.category,
    subdomain: rowData.subdomain,
    client_name: rowData.client_name,
    package: rowData.package
  };

  const options = {
    method: "post",
    headers: {
      "apikey": apiKey,
      "Authorization": "Bearer " + apiKey,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates" // Upsert
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const res = UrlFetchApp.fetch(sbUrl, options);
  return "Status: " + res.getResponseCode() + ", Response: " + res.getContentText();
}

function syncAdminPasswordToSupabase() {
  try {
    const ss = SpreadsheetApp.openById(MASTER_SS_ID);
    const sheet = ss.getSheetByName(MASTER_SHEET_NAME);
    const adminPassword = String(sheet.getRange(1, 11).getValue() || "").trim();
    
    if (!adminPassword) return "Admin password is empty in sheet K1";

    return syncClientToSupabaseWithResult({
      username: "admin_global",
      ssid: "",
      password: adminPassword,
      whatsapp: "",
      wedding_date: "",
      created_at: new Date().toISOString(),
      email: "",
      status: "Active",
      category: "admin",
      subdomain: "admin_global",
      client_name: "Global Admin"
    });
  } catch (e) {
    console.error("Gagal sinkronisasi admin password: " + e.toString());
    return "Error: " + e.toString();
  }
}

function syncAllClientsToSupabase() {
  const logs = [];
  try {
    const ss = SpreadsheetApp.openById(MASTER_SS_ID);
    logs.push("Spreadsheet dibuka sukses. ID: " + MASTER_SS_ID);
    
    const sheets = ss.getSheets();
    logs.push("Daftar sheet yang tersedia: " + sheets.map(s => s.getName()).join(", "));
    
    const sheet = ss.getSheetByName(MASTER_SHEET_NAME);
    if (!sheet) {
      return "Gagal: Sheet '" + MASTER_SHEET_NAME + "' tidak ditemukan!";
    }
    
    const values = sheet.getDataRange().getValues();
    const dValues = sheet.getDataRange().getDisplayValues();
    logs.push("Total baris data (termasuk header): " + values.length);

    // 1. Sinkronisasi Password Admin
    const adminRes = syncAdminPasswordToSupabase();
    logs.push("Sync Admin Global K1: " + adminRes);

    // 2. Loop klien
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const username = String(row[0] || "").trim();
      if (!username) {
        logs.push("Baris " + (i+1) + ": Username kosong, dilewati.");
        continue;
      }

      let createdAtVal = new Date().toISOString();
      if (row[5]) {
        try {
          createdAtVal = new Date(row[5]).toISOString();
        } catch (dateErr) {
          logs.push("Baris " + (i+1) + " (" + username + "): Format tanggal created_at '" + row[5] + "' tidak valid, menggunakan waktu sekarang.");
        }
      }

      let pwd = row[2];
      if (pwd instanceof Date) {
        pwd = dValues[i][2].replace(/\s+/g, '').toLowerCase();
      } else {
        pwd = String(pwd || "").trim();
      }

      const clientData = {
        username: username,
        ssid: String(row[1] || "").trim(),
        password: pwd,
        whatsapp: String(row[3] || "").trim(),
        wedding_date: String(row[4] || "").trim(),
        created_at: createdAtVal,
        email: String(row[6] || "").trim(),
        status: String(row[7] || "Active").trim(),
        category: String(row[8] || "wedding").trim(),
        subdomain: String(row[9] || username).trim(),
        client_name: String(row[10] || "").trim(),
        package: String(row[11] || "").trim()
      };

      try {
        const resText = syncClientToSupabaseWithResult(clientData);
        logs.push("Baris " + (i+1) + " (" + username + "): " + resText);
      } catch (syncErr) {
        logs.push("Baris " + (i+1) + " (" + username + ") Gagal: " + syncErr.toString());
      }
    }
    return "Logs:\n" + logs.join("\n");
  } catch (e) {
    return "Error Sync All Clients: " + e.toString() + "\nLogs:\n" + logs.join("\n");
  }
}

/**
 * GENERATE SNAP TOKEN DARI MIDTRANS API
 */
function handleCreateMidtransTransaction(data) {
  try {
    const subdomain = data.subdomain.toLowerCase().replace(/[^a-z0-9]/g, '');
    const timestamp = Utilities.formatDate(new Date(), "GMT+7", "yyyyMMddHHmmss");
    const orderId = "SAPATAMU-" + subdomain + "-" + timestamp;

    const midtransUrl = MIDTRANS_IS_PRODUCTION 
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions";

    // Setup payload transaksi
    const payload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: Number(data.price)
      },
      item_details: [{
        id: data.packageName.toLowerCase(),
        price: Number(data.price),
        quantity: 1,
        name: "Paket SapaTamu - " + data.packageName
      }],
      customer_details: {
        first_name: data.clientName,
        email: data.email,
        phone: data.whatsapp
      }
    };

    // Base64 Authorization Header: Server Key + ":"
    const authHeader = "Basic " + Utilities.base64Encode(MIDTRANS_SERVER_KEY + ":");

    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "Authorization": authHeader,
        "Accept": "application/json"
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(midtransUrl, options);
    const resText = response.getContentText();
    const resJson = JSON.parse(resText);

    if (response.getResponseCode() === 200 || response.getResponseCode() === 201) {
      return createResponse({
        status: "success",
        token: resJson.token,
        redirect_url: resJson.redirect_url,
        order_id: orderId
      });
    } else {
      return createResponse({
        status: "error",
        message: "Midtrans API Error: " + (resJson.error_messages ? resJson.error_messages.join(", ") : resText)
      });
    }
  } catch (err) {
    return createResponse({
      status: "error",
      message: "Exception generating transaction: " + err.toString()
    });
  }
}

// --- SYNC DARI SUPABASE KE SPREADSHEET (BACKGROUND) ---
function handleSyncFromSupabase(data) {
  try {
    const ss = SpreadsheetApp.openById(MASTER_SS_ID);
    const sheet = ss.getSheetByName(MASTER_SHEET_NAME);
    const values = sheet.getDataRange().getValues();
    let rowIndex = -1;
    const targetSub = String(data.username || "").toLowerCase();
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]).toLowerCase() === targetSub) { rowIndex = i + 1; break; }
    }
    if (rowIndex === -1) return createResponse({ status: "error", message: "Client tidak ditemukan di Spreadsheet" });
    const c = data.data;
    const orig = values[rowIndex - 1];
    const newRow = [
      c.username !== undefined ? c.username : orig[0], 
      orig[1], // ssid jangan dioverwrite dari payload karena tidak editable
      c.password !== undefined ? c.password : orig[2],
      c.whatsapp !== undefined ? c.whatsapp : orig[3], 
      c.wedding_date !== undefined ? c.wedding_date : orig[4], 
      orig[5], // created_at
      c.email !== undefined ? c.email : orig[6], 
      c.status !== undefined ? c.status : orig[7], 
      c.category !== undefined ? c.category : orig[8],
      c.subdomain !== undefined ? c.subdomain : orig[9], 
      c.client_name !== undefined ? c.client_name : orig[10],
      c.package !== undefined ? c.package : (orig[11] || ""),
      orig[12] || "" // event date m
    ];
    sheet.getRange(rowIndex, 1, 1, 13).setValues([newRow]);
    return createResponse({ status: "success", message: "Data client disinkronkan ke Spreadsheet" });
  } catch (err) {
    return createResponse({ status: "error", message: "Gagal sync ke Spreadsheet: " + err.toString() });
  }
}

// --- FUNGSI UPGRADE PAKET ---
function handleUpgradePackage(data) {
  try {
    const ss = SpreadsheetApp.openById(MASTER_SS_ID);
    const sheet = ss.getSheetByName(MASTER_SHEET_NAME);
    const values = sheet.getDataRange().getValues();
    let rowIndex = -1;
    const targetSub = String(data.username || "").toLowerCase();
    
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]).toLowerCase() === targetSub || String(values[i][9]).toLowerCase() === targetSub) { 
        rowIndex = i + 1; 
        break; 
      }
    }
    
    if (rowIndex === -1) return createResponse({ status: "error", message: "Client tidak ditemukan di Spreadsheet" });
    
    const orig = values[rowIndex - 1];
    const newPackage = data.newPackage;
    
    // Update Kolom L (index 11) dengan paket baru
    sheet.getRange(rowIndex, 12).setValue(newPackage);
    
    // Sync ke Supabase
    try {
      syncClientToSupabase({
        username: orig[0],
        ssid: orig[1],
        password: orig[2],
        whatsapp: orig[3],
        wedding_date: orig[4],
        created_at: orig[5] ? new Date(orig[5]).toISOString() : new Date().toISOString(),
        email: orig[6],
        status: orig[7],
        category: orig[8],
        subdomain: orig[9],
        client_name: orig[10],
        package: newPackage
      });
    } catch (e) {
      console.error("Gagal sync upgrade ke Supabase: " + e.toString());
    }

    // Kirim Email Upgrade
    if (orig[6]) { 
      const emailHtml = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #E07B7B; margin: 0; font-size: 28px; font-weight: 800;">SapaTamu.ku</h2>
          <p style="color: #8C7560; font-size: 14px; margin-top: 5px;">Upgrade Layanan Berhasil</p>
        </div>
        <p style="color: #4A3F35; font-size: 16px; line-height: 1.5;">Halo <b>${orig[10] || orig[0]}</b>,</p>
        <p style="color: #4A3F35; font-size: 16px; line-height: 1.5;">Pembayaran upgrade layanan Anda telah kami verifikasi. Layanan akun Anda kini telah berhasil ditingkatkan!</p>
        
        <div style="background-color: #FFF9F6; border: 1px solid #F0E6DE; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="margin-top:0; color: #E07B7B; font-size: 16px;">Detail Baru Anda:</h3>
          <ul style="color: #4A3F35; font-size: 14px; padding-left: 20px; line-height: 1.8;">
            <li><b>Username:</b> ${orig[0]}</li>
            <li><b>Paket Baru:</b> ${newPackage}</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 35px 0;">
          <a href="https://sapatamuku-creator.github.io/mastersapatamuku/login.html" style="background-color: #E07B7B; color: #ffffff; padding: 14px 28px; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 8px; display: inline-block;">Kembali ke Dashboard</a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #F0E6DE; margin: 30px 0;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">Terima kasih atas kepercayaan Anda pada SapaTamu.ku.</p>
      </div>`;

      try {
        GmailApp.sendEmail(
          orig[6], 
          "SapaTamu.ku - Upgrade Layanan Berhasil!", 
          `Akun Anda telah di-upgrade ke paket: ${newPackage}.`,
          { name: "SapaTamu Billing", htmlBody: emailHtml }
        );
      } catch (e) {
        console.error("Gagal kirim email upgrade: " + e.toString());
      }
    }
    
    return createResponse({ status: "success", message: "Upgrade berhasil!" });
  } catch (err) {
    return createResponse({ status: "error", message: "Gagal memproses upgrade: " + err.toString() });
  }
}
