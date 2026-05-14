/**
 * MASTER BACKEND SAPATAMU.KU - V10.2 (Unified Version)
 * Update: Perbaikan Update Angpao (Tanda Kasih) & Sinkronisasi Routing
 */

const SHEET_DATA = "Sheet1"; 
const SHEET_PRINT = "PrintQueue"; 
const START_ROW = 8; 

// Indeks Kolom (1-based untuk Spreadsheet App)
const COL_CHECKIN_STATUS = 9;   // Kolom I
const COL_JAM_DATANG = 10;      // Kolom J
const COL_KODE_UNIK = 6;        // Kolom F
const COL_REAL_HADIR = 14;      // Kolom N
const COL_CATATAN = 15;         // Kolom O
const COL_STATUS_WA = 16;       // Kolom P
const COL_STATUS_HADIAH = 17;   // Kolom Q
const COLUMN_TANDA_KASIH = 18;  // Kolom R
const COLUMN_SESI = 19;         // Kolom S

// --- HELPER: GET DYNAMIC SPREADSHEET ---
function getSS(id) {
  if (!id) throw new Error("Spreadsheet ID tidak ditemukan. Harap login ulang.");
  return SpreadsheetApp.openById(id);
}

// --- 1. ROUTING GET ---
function handleMainGet(e) {
  const action = e.parameter.action;
  const row = e.parameter.row;
  const ssId = e.parameter.ssId; 
  const station = e.parameter.station; // Menangkap parameter loket dari Frontend

  // Handler untuk pencatatan Check-in & Blast WA via URL params
  if (row && ssId && !action) {
    try {
      const ss = getSS(ssId);
      const sheet = ss.getSheetByName(SHEET_DATA);
      const settingsSheet = ss.getSheetByName("Settings_Event");

      // UPDATE STATUS CHECK-IN
      sheet.getRange(row, COL_CHECKIN_STATUS).setValue(1);

      // AMBIL DATA SETTINGS
      const presetKode = settingsSheet.getRange("D4").getValue();
      const namaMempelai = settingsSheet.getRange("D5").getValue();
      const namaGedung = settingsSheet.getRange("D6").getValue();
      const apiToken = settingsSheet.getRange("D7").getValue();
      const urlFotoOriginal = settingsSheet.getRange("D8").getValue();

      const namaTamu = sheet.getRange(row, 3).getValue();
      let nomorWA = sheet.getRange(row, 4).getValue().toString();

      // FORMAT URL FOTO & NOMOR WA
      let urlFoto = urlFotoOriginal;
      if (urlFoto && urlFoto.includes("drive.google.com")) {
        urlFoto = urlFoto.replace("/file/d/", "/uc?export=download&id=").split("/view")[0];
      }
      nomorWA = nomorWA.replace(/[^0-9]/g, ''); 
      if (nomorWA.startsWith('0')) nomorWA = '62' + nomorWA.slice(1);

      let message = (presetKode == 1) 
        ? `Halo, Bapak/Ibu *${namaTamu}*.\n\nSelamat datang di hari bahagia *${namaMempelai}* di *${namaGedung}*.\n\nTerima kasih telah melakukan check-in melalui *SapaTamu.Ku*.`
        : `Selamat datang, Kak *${namaTamu}*! ✨\n\nTerima kasih sudah hadir di *${namaMempelai}*. Check-in berhasil!\n\nEnjoy the party! 🥂`;

      const options = {
        'method': 'post',
        'headers': { 'Authorization': apiToken.toString().trim() },
        'payload': {
          'target': nomorWA,
          'url': urlFoto,
          'caption': message,
          'delay': '2'
        },
        'muteHttpExceptions': true
      };

      const fonnteRes = UrlFetchApp.fetch('https://api.fonnte.com/send', options);
      
      return createResponse({
        status: "success",
        message: "Check-in & WA Blast berhasil",
        fonnte: JSON.parse(fonnteRes.getContentText())
      });

    } catch (err) {
      return createResponse({ status: "error", message: err.message });
    }
  }

  // Routing Action Get
  if (action === "getMasterData") return createResponse({ status: "success", data: getMasterDataV3(ssId) });
  if (action === "getMasterDataAngpao") return createResponse({ status: "success", guestList: getMasterDataV3(ssId) });
  if (action === "getSettings") return createResponse(getSettings(ssId));
  if (action === "getDropdownOptions") return createResponse(getDropdownOptions(ssId));
  
  // WELCOME SIGN HANDSHAKE
  if (action === "getWelcome") return createResponse(getWelcomeData(ssId));

  // Routing untuk Worker dengan Filter Station
  if (action === "getPrintQueue") {
    const queueData = getPrintQueue(ssId, station); // Mengirim parameter station ke fungsi filter
    return ContentService.createTextOutput(JSON.stringify(queueData))
           .setMimeType(ContentService.MimeType.JSON);
  }

  return createResponse({ message: "Sapatamu.ku V10.2 Active - System Ready" });
}

// --- 2. ROUTING POST (Centralized Logic) ---
function handleMainPost(payload) {
  try {
    const action = payload.action;
    const ssId = payload.ssId;

    if (!ssId) return createResponse({ status: "error", message: "Spreadsheet ID is missing" });

    let result;
    switch (action) {
      case "get_master_data": 
      case "getMasterData":
        result = getMasterDataV3(ssId); 
        break;
        
      case "submitCollection": 
        result = submitGuestCollection(payload); 
        break;

      case "markSent": 
        result = markAsSent(ssId, payload.row); 
        break;
      
      case "confirm_checkin": 
        result = confirmCheckIn(ssId, payload.kodeUnik, payload.realHadir, payload.statusAngpao || payload.catatan); 
        break;
        
      case "register_new_onsite": 
        result = registerNewOnsite(payload); 
        break;
        
      case "markPrinted": 
        result = markAsPrinted(ssId, payload.printIds); 
        break;

      case "claim_lucky_draw": 
        result = claimLuckyDraw(ssId, payload.kode); 
        break;

      case "update_tanda_kasih": 
        result = updateTandaKasih(ssId, payload.kodeUnik, payload.nominal); 
        break;

      case "deleteGuest":
        result = deleteGuest(ssId, payload.kodeUnik);
        break;
        
      case "uploadSelfie":
        result = handleSelfiePost(payload);
        break;
      
      case "getDropdownOptions":
        result = getDropdownOptions(ssId);
        break;
      
      case "saveDropdownOptions":
        result = saveDropdownOptions(ssId, payload.options);
        break;
        
      case "getSettings":
        result = getSettings(ssId);
        break;
      
      case "saveSettings":
        result = saveSettings(ssId, payload.settings);
        break;
        
      default:
        result = { status: "error", message: "Action unknown" };
    }
    
    return createResponse(result);

  } catch (error) {
    return createResponse({ status: "error", message: "Server Exception: " + error.toString() });
  }
}

function deleteGuest(ssId, kodeUnik) {
  try {
    const ss = getSS(ssId);
    const sheet = ss.getSheetByName(SHEET_DATA);
    const lastRow = sheet.getLastRow();
    if (lastRow < START_ROW) return { status: "error", message: "Data kosong" };
    
    const data = sheet.getRange(START_ROW, COL_KODE_UNIK, lastRow - (START_ROW - 1), 1).getValues();
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]) === String(kodeUnik)) {
        sheet.deleteRow(i + START_ROW);
        return { status: "success", message: "Tamu berhasil dihapus" };
      }
    }
    return { status: "error", message: "Kode tidak ditemukan" };
  } catch (err) {
    return { status: "error", message: err.toString() };
  }
}

// createResponse removed (using UnifiedRouter version)

// --- 3. CORE FUNCTIONS ---

/**
 * Memperbarui nominal angpao di Kolom R berdasarkan Kode Unik di Kolom F
 */
function updateTandaKasih(ssId, kode, nominal) {
  const ss = getSS(ssId);
  const sheet = ss.getSheetByName(SHEET_DATA);
  const lastRow = sheet.getLastRow();
  if (lastRow < START_ROW) return { status: "error", message: "Sheet Empty" };
  
  // Mencari di Kolom F (Index 6)
  const dataRange = sheet.getRange(START_ROW, COL_KODE_UNIK, lastRow - (START_ROW - 1), 1).getValues();
  
  for (let i = 0; i < dataRange.length; i++) {
    if (String(dataRange[i][0]) === String(kode)) {
      const targetRow = i + START_ROW;
      sheet.getRange(targetRow, COLUMN_TANDA_KASIH).setValue(nominal);
      return { status: "success", message: "Data Angpao berhasil diupdate" };
    }
  }
  return { status: "error", message: "Kode tamu tidak ditemukan" };
}

function confirmCheckIn(ssId, kodeUnik, realHadir, catatan) {
  const ss = getSS(ssId);
  const sheet = ss.getSheetByName(SHEET_DATA);
  const data = sheet.getDataRange().getValues();
  const now = new Date();
  const timeOnly = Utilities.formatDate(now, "GMT+7", "HH:mm:ss");

  for (let i = START_ROW - 1; i < data.length; i++) {
    if (String(data[i][5]) === String(kodeUnik)) { 
      const rowIndex = i + 1;
      sheet.getRange(rowIndex, COL_CHECKIN_STATUS).setValue(1);
      sheet.getRange(rowIndex, COL_JAM_DATANG).setValue(timeOnly);
      sheet.getRange(rowIndex, 11).setValue(1); // Print status
      sheet.getRange(rowIndex, COL_REAL_HADIR).setValue(realHadir);
      sheet.getRange(rowIndex, COL_CATATAN).setValue(catatan);
      
      const updatedRowData = sheet.getRange(rowIndex, 1, 1, 19).getValues()[0];
      processPrintLogic(ssId, updatedRowData, catatan);
      addToRundown(ssId, updatedRowData); // Sinkronisasi ke Welcome Sign Rundown

      return { "status": "success", "row": rowIndex };
    }
  }
  return { "status": "error", "message": "Kode tidak ditemukan" };
}

function getMasterDataV3(ssId) {
  const ss = getSS(ssId);
  const sheet = ss.getSheetByName(SHEET_DATA);
  
  // Metadata dari Sheet1 (B1-B5)
  const meta = sheet.getRange("B1:B5").getValues();
  const weddingName = meta[0][0] || "SapaTamu.Ku";
  const weddingDate = meta[1][0] || "-";
  const weddingLoc = meta[2][0] || "-";
  const weddingTime = meta[3][0] || "-";
  const weddingLink = meta[4][0] || "";

  const sesiMeta = sheet.getRange("D1:G1").getValues()[0];

  const eventMeta = {
    pengantin: weddingName, 
    tanggal: weddingDate, 
    lokasi: weddingLoc,
    waktu: weddingTime,
    link: weddingLink,
    labelSesi: sesiMeta[0], 
    sesiOptions: [sesiMeta[1], sesiMeta[2], sesiMeta[3]]
  };

  const lastRow = sheet.getLastRow();
  let guestList = [];
  if (lastRow >= START_ROW) {
    const rawData = sheet.getRange(START_ROW, 1, lastRow - (START_ROW - 1), 19).getValues();
    guestList = rawData.map((row, index) => ({
      row: index + START_ROW,
      nama: row[2],          // Kolom C
      whatsapp: row[3],      // Kolom D
      kategori: row[4],      // Kolom E
      kode: row[5],          // Kolom F
      barcode: row[6],       // Kolom G
      rencanaHadir: row[7],  // Kolom H
      statusHadir: String(row[8]), // Kolom I
      jamDatang: row[9],     // Kolom J
      souvenir: row[10],     // Kolom K
      pihakPengundang: row[11], // Kolom L
      alamat: row[12],       // Kolom M
      realHadir: row[13],    // Kolom N
      statusWA: row[15],     // Kolom P
      statusHadiah: row[16], // Kolom Q
      tandaKasih: row[17],   // Kolom R
      sesi: row[18]          // Kolom S
    })).filter(g => g.nama !== "").reverse(); 
  }
  const dropdownData = getDropdownOptions(ssId);
  const dropdownOptions = dropdownData.options || [];

  return { eventMeta, guestList, dropdownOptions };
}

// --- 4. PRINT & QUEUE FUNCTIONS ---

function processPrintLogic(ssId, guestData, giftStatus) {
  const guestInfo = { 
    nama: guestData[2], 
    kategori: guestData[4], 
    kode: guestData[5], 
    qr: guestData[6],
    pax: guestData[7],
    pihak: guestData[11],
    alamat: guestData[12],
    sesi: guestData[18]
  };
  let catUpper = String(guestInfo.kategori).toUpperCase();
  let labelType = (catUpper.includes("VIP") || catUpper.includes("VVIP") || catUpper.includes("KELUARGA")) ? "CHECKIN-LABEL" : "CHECKIN-STRUK";
  addToQueue(ssId, guestInfo, guestInfo.kategori, labelType);

  if (giftStatus && giftStatus !== "-" && giftStatus !== "ON-SITE") {
    const statusUpper = String(giftStatus).toUpperCase();
    if (statusUpper.includes("ANGPAO") && statusUpper.includes("KADO")) {
      addToQueue(ssId, guestInfo, guestInfo.kategori, "SOUVENIR: KADO");
      addToQueue(ssId, guestInfo, guestInfo.kategori, "SOUVENIR: ANGPAO");
    } else {
      addToQueue(ssId, guestInfo, guestInfo.kategori, "SOUVENIR: " + statusUpper);
    }
  }
}

/**
 * Sinkronisasi data tamu ke sheet Rundown untuk display Welcome Sign
 */
function addToRundown(ssId, guestRow) {
  try {
    const ss = getSS(ssId);
    const rdSheet = ss.getSheetByName("Rundown");
    if (!rdSheet) return;

    const lastRow = rdSheet.getLastRow();
    // Cari baris kosong di kolom E (Kode Unik)
    let targetRow = 2;
    if (lastRow >= 2) {
      const eData = rdSheet.getRange(2, 5, lastRow, 1).getValues();
      for (let i = 0; i < eData.length; i++) {
        if (!eData[i][0]) {
          targetRow = i + 2;
          break;
        }
        if (i === eData.length - 1) targetRow = i + 3;
      }
    }

    const now = new Date();
    const timeOnly = Utilities.formatDate(now, "GMT+7", "HH:mm:ss");

    // E: Kode, F: Nama, G: Jam, H: Status, I: Kategori, J: Alamat
    const rdData = [
      guestRow[5],  // Kode Unik (Kolom F di Data)
      guestRow[2],  // Nama (Kolom C di Data)
      timeOnly,     // Jam Datang
      "CHECKED-IN", // Status
      guestRow[4],  // Kategori (Kolom E di Data)
      guestRow[12]  // Alamat (Kolom M di Data)
    ];

    rdSheet.getRange(targetRow, 5, 1, 6).setValues([rdData]);
    
    // Optional: Bersihkan antrean lama jika sudah terlalu banyak (> 50)
    if (targetRow > 60) {
       // Bisa diimplementasikan rotasi jika perlu
    }
  } catch (e) {
    console.error("addToRundown Error: ", e);
  }
}

function addToQueue(ssId, guest, category, info) {
  const ss = getSS(ssId);
  let qSheet = ss.getSheetByName(SHEET_PRINT) || ss.insertSheet(SHEET_PRINT);
  
  // JABAT TANGAN BACKEND: Pastikan Header Lengkap (ID s/d PAX)
  if (qSheet.getLastRow() === 0) {
    qSheet.appendRow(["ID", "TIMESTAMP", "NAMA", "KODE", "QR LINK", "INFO", "STATUS", "KATEGORI", "ALAMAT", "PIHAK", "SESI", "PAX"]);
  } else {
    // Jika sheet sudah ada, pastikan kolom ke-9 (ALAMAT) sudah ada header-nya
    const headerCheck = qSheet.getRange(1, 1, 1, 12).getValues()[0];
    if (headerCheck.length < 9 || headerCheck[8] !== "ALAMAT") {
       qSheet.getRange(1, 9, 1, 4).setValues([["ALAMAT", "PIHAK", "SESI", "PAX"]]);
    }
  }

  const now = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm:ss");
  qSheet.appendRow([
    Utilities.getUuid(), 
    now, 
    guest.nama || "-", 
    guest.kode || "-", 
    guest.qr || "-", 
    info, 
    "WAITING", 
    category || "UMUM",
    guest.alamat || "-",
    guest.pihak || "-",
    guest.sesi || "-",
    guest.pax || "1"
  ]);
}

function getPrintQueue(ssId, station) {
  const ss = getSS(ssId);
  const sheet = ss.getSheetByName(SHEET_PRINT);
  if (!sheet) return [];
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return []; 

  // JABAT TANGAN: Pastikan kolom cukup sebelum membaca
  if (sheet.getLastColumn() < 12) {
    sheet.getRange(1, 9, 1, 4).setValues([["ALAMAT", "PIHAK", "SESI", "PAX"]]);
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 12).getValues();
  const currentStation = (station || "").toUpperCase().trim();

  return data
    .filter(r => {
      const statusMatch = r[6].toString().toUpperCase().trim() === "WAITING"; // Kolom G
      const jenisInfo = r[5].toString().toUpperCase().trim(); // Kolom F
      
      if (!statusMatch) return false;

      if (currentStation === "LOKET-1") return jenisInfo.indexOf("SOUVENIR") !== -1;
      if (currentStation === "LOKET-2") return jenisInfo.indexOf("CHECKIN") !== -1;
      return true;
    })
    .map(r => ({ 
      id: r[0], timestamp: r[1], nama: r[2], kode: r[3], qr: r[4], info: r[5], status: r[6], kategori: r[7],
      alamat: r[8], pihak: r[9], sesi: r[10], pax: r[11]
    }));
}

function markAsPrinted(ssId, ids) {
  if (!ids || !Array.isArray(ids)) return { status: "error" };
  const ss = getSS(ssId);
  const qSheet = ss.getSheetByName(SHEET_PRINT);
  const qData = qSheet.getDataRange().getValues();
  ids.forEach(id => {
    for (let i = 1; i < qData.length; i++) {
      if (String(qData[i][0]) === String(id)) qSheet.getRange(i + 1, 7).setValue("DONE"); 
    }
  });
  return { status: "success" };
}

function registerNewOnsite(data) {
  const ss = getSS(data.ssId);
  const sheet = ss.getSheetByName(SHEET_DATA);
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const now = new Date();
    const timestampP = "[✅ " + Utilities.formatDate(now, "GMT+7", "dd/MM HH:mm") + "]";
    const nowFormatted = Utilities.formatDate(now, "GMT+7", "yyyy-MM-dd HH:mm:ss");
    const timeOnly = Utilities.formatDate(now, "GMT+7", "HH:mm:ss");
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    const kodeUnik = "ONS-" + randomPart;
    const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?data=" + kodeUnik + "&size=400x400";
    let cleanPhone = String(data.whatsapp || "").replace(/\D/g, ''); 
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.substring(1);
    const giftVal = data.catatan || "-";
    const souvenirVal = data.souvenir === "tidak" ? 0 : 1;

    const newRow = [
      "=ROW()-" + (START_ROW - 1), nowFormatted, data.namaTamu || "Tanpa Nama", "'" + cleanPhone, 
      data.kategori || "UMUM", kodeUnik, qrUrl, 0, 1, timeOnly, souvenirVal, data.host || "-", 
      data.alamat || "-", data.realHadir || 1, giftVal, timestampP, "-", 0, data.sesi || "-"
    ];
    sheet.appendRow(newRow);
    const lastRowData = sheet.getRange(sheet.getLastRow(), 1, 1, 19).getValues()[0];
    processPrintLogic(data.ssId, lastRowData, giftVal);
    addToRundown(data.ssId, lastRowData); // Sinkronisasi ke Welcome Sign
    return { status: "success", kode: kodeUnik, message: "On-Site Berhasil" };
  } catch (e) { return { status: "error", message: e.toString() }; } finally { lock.releaseLock(); }
}

function claimLuckyDraw(ssId, kode) {
  const ss = getSS(ssId);
  const sheet = ss.getSheetByName(SHEET_DATA);
  const lastRow = sheet.getLastRow();
  if (lastRow < START_ROW) return { status: "error", message: "Data kosong" };
  const data = sheet.getRange(START_ROW, 1, lastRow - (START_ROW - 1), 19).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][5]) === String(kode)) {
      sheet.getRange(i + START_ROW, COL_STATUS_HADIAH).setValue("WINNER - SUDAH KLAIM"); 
      processPrintLogic(ssId, data[i], "WINNER-LABEL"); // Trigger print label pemenang
      return { status: "success", message: "Klaim Berhasil" };
    }
  }
  return { status: "error", message: "Kode tidak ditemukan" };
}

function submitGuestCollection(formData) {
  const ss = getSS(formData.ssId);
  const sheet = ss.getSheetByName(SHEET_DATA);
  const nowFormatted = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm:ss");
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  
  // LOGIC KODE DINAMIS
  let category = "wedding";
  const configSheet = ss.getSheetByName("Config");
  if (configSheet) {
    category = String(configSheet.getRange("B3").getValue() || "wedding").toLowerCase();
  }
  let prefix = "STK-"; // Default fallback
  
  if (formData.source === "onsite") {
    prefix = "ONS-";
  } else {
    if (category.includes("wedding")) prefix = "WDG-";
    else if (category.includes("birthday")) prefix = "BTH-";
    else if (category.includes("anniversary")) prefix = "ANV-";
    else if (category.includes("corporate")) prefix = "CPT-";
    else if (category.includes("gathering")) prefix = "GTH-";
  }

  const kodeUnik = prefix + randomPart;
  const baseLink = sheet.getRange("B5").getValue();
  let cleanPhone = String(formData.whatsapp || "").replace(/\D/g, ''); 
  if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.substring(1);
  const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?data=" + kodeUnik + "&size=400x400";
  
  const newRow = [
    "=ROW()-" + (START_ROW - 1), nowFormatted, formData.nama, "'" + cleanPhone, 
    formData.kategori, kodeUnik, qrUrl, formData.pax || formData.rencana || 1, 0, "-", 0, 
    formData.pihak, formData.alamat, 0, "-", "BELUM TERKIRIM", "-", 0, formData.sesi || "-"
  ];
  sheet.appendRow(newRow);
  return { status: "success", rowID: sheet.getLastRow(), kode: kodeUnik, personalLink: baseLink + "?id=" + kodeUnik + "&u=" + encodeURIComponent(formData.nama) };
}

function markAsSent(ssId, row) {
  if (!row) return { status: "error" };
  const ss = getSS(ssId);
  const sheet = ss.getSheetByName(SHEET_DATA);
  sheet.getRange(row, COL_STATUS_WA).setValue("✅ " + Utilities.formatDate(new Date(), "GMT+7", "dd/MM HH:mm"));
  return { status: "success" };
}

/**
 * JABAT TANGAN WELCOME SIGN
 * Mengambil data event, rundown, dan tamu terbaru untuk display.
 */
function getWelcomeData(ssId) {
  try {
    const ss = getSS(ssId);
    const sheet = ss.getSheetByName(SHEET_DATA);
    if (!sheet) throw new Error("Sheet '" + SHEET_DATA + "' tidak ditemukan.");
    
    // Metadata dari Sheet1 (B1 & B2) sesuai screenshot
    const meta = sheet.getRange("B1:B2").getValues();
    const weddingName = meta[0][0] || "SapaTamu.Ku";
    const weddingDate = meta[1][0] || "-";
    
    // Cari Tamu Terakhir dari sheet Rundown (Bukan Sheet1)
    let latestGuest = { nama: "", kategori: "", alamat: "" };
    const rundownSheet = ss.getSheetByName("Rundown");
    
    if (rundownSheet) {
      const rdLast = rundownSheet.getLastRow();
      if (rdLast >= 2) {
        // Scan dari bawah di kolom E (Kode Unik) untuk cari data terakhir
        const logDataFull = rundownSheet.getRange(2, 5, rdLast - 1, 6).getValues(); 
        for (let i = logDataFull.length - 1; i >= 0; i--) {
          if (logDataFull[i][0]) { // Jika Kode Unik (Kolom E) ada isinya
            latestGuest = {
              nama: logDataFull[i][1],     // Kolom F (Index 1 di logDataFull)
              kategori: logDataFull[i][4], // Kolom I (Index 4 di logDataFull)
              alamat: logDataFull[i][5]    // Kolom J (Index 5 di logDataFull)
            };
            break;
          }
        }
      }
    }

    // Ambil Rundown secara Aman
    let rundown = [];
    if (rundownSheet) {
      const rdLast = rundownSheet.getLastRow();
      if (rdLast >= 2) {
        const rdData = rundownSheet.getRange(2, 1, rdLast - 1, 3).getValues();
        const rundownRaw = rundownSheet.getRange(2, 1, Math.max(1, rdLast - 1), 3).getValues();
        rundown = rundownRaw
          .filter(r => r[0] || r[1]) // Hanya baris yang ada isi Waktu atau Nama Acara
          .map(row => ({
            displayTime: String(row[0] || ""),
            eventName: String(row[1] || ""),
            syncTime: formatTime(row[2])
          }));
      }
    }

    // Ambil Daftar Tamu Terakhir dari Rundown (Kolom E-J) untuk Marquee
    let guestLog = "MENUNGGU TAMU...";
    if (rundownSheet) {
      const rdLast = rundownSheet.getLastRow();
      if (rdLast >= 2) {
        // Ambil 10 baris terakhir dari kolom F (Nama Tamu)
        const startScan = Math.max(2, rdLast - 10);
        const logData = rundownSheet.getRange(startScan, 6, (rdLast - startScan) + 1, 1).getValues();
        const names = logData
          .map(r => String(r[0] || "").trim())
          .filter(n => n !== "")
          .reverse(); // Terbaru di depan
        
        if (names.length > 0) {
          guestLog = "SELAMAT DATANG: " + names.join("  •  ");
        }
      }
    }

    // Ambil Background Photos dari Config (B1)
    let urlFoto = "";
    const configSheet = ss.getSheetByName("Config");
    if (configSheet) {
        urlFoto = configSheet.getRange("B1").getValue() || "";
    }

    return {
      status: "success",
      weddingName,
      weddingDate,
      latestGuest,
      rundown,
      log: guestLog.toUpperCase(),
      urlFoto: urlFoto,
      displayDuration: 10000
    };
  } catch (err) {
    console.error("getWelcomeData Error:", err);
    return { status: "error", error: err.toString(), message: err.toString() };
  }
}

function formatTime(timeVal) {
  if (!timeVal) return "00:00";
  
  // Jika objek Date
  if (timeVal instanceof Date) {
    return Utilities.formatDate(timeVal, "GMT+7", "HH:mm");
  }
  
  let str = String(timeVal).trim().toUpperCase();
  
  // Deteksi AM/PM manual jika string
  let isPM = str.includes("PM");
  let isAM = str.includes("AM");
  
  // Bersihkan karakter non-digit dan titik dua
  let cleanTime = str.replace(/[^0-9:]/g, "");
  if (!cleanTime.includes(":")) return cleanTime;
  
  let parts = cleanTime.split(":");
  let hours = parseInt(parts[0], 10);
  let mins = parts[1] ? parts[1].substring(0, 2) : "00";
  
  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;
  
  return hours.toString().padStart(2, '0') + ":" + mins.padStart(2, '0');
}
function getSettings(ssId) {
  try {
    const ss = getSS(ssId);
    const sheet = ss.getSheetByName(SHEET_DATA);
    const configSheet = ss.getSheetByName("Config");
    const settingsSheet = ss.getSheetByName("Settings");
    
    const meta = sheet.getRange("B1:B5").getValues();
    const sesi = sheet.getRange("E1:G1").getValues()[0];
    
    let apiToken = "";
    if (settingsSheet) {
      apiToken = settingsSheet.getRange("E2").getValue();
    }

    let urlFoto = "";
    let presetKode = "1";
    let waPhone = "6282214578132";
    let theme = "classic";
    let invitationData = {};
    
    if (configSheet) {
      urlFoto = configSheet.getRange("B1").getValue();
      presetKode = configSheet.getRange("B2").getValue() || "1";
      waPhone = configSheet.getRange("B5").getValue() || "6282214578132";
      theme = configSheet.getRange("B6").getValue() || "classic";
      
      const invSheet = ss.getSheetByName("InvConfig");
      const invRaw = invSheet ? invSheet.getRange("B1").getValue() : "";
      try {
        invitationData = JSON.parse(invRaw || "{}");
      } catch(e) {}
    }

    return {
      status: "success",
      data: {
        namaAcara: meta[0][0],
        tanggal: meta[1][0],
        lokasi: meta[2][0],
        waktu: meta[3][0],
        link: meta[4][0],
        sesi1: sesi[0],
        sesi2: sesi[1],
        sesi3: sesi[2],
        apiToken: apiToken,
        urlFoto: urlFoto,
        presetKode: presetKode,
        waPhone: waPhone,
        theme: theme,
        invitationData: invitationData
      }
    };
  } catch (e) { return { status: "error", message: e.toString() }; }
}

function saveSettings(ssId, s) {
  try {
    const ss = getSS(ssId);
    const sheet = ss.getSheetByName(SHEET_DATA);
    let configSheet = ss.getSheetByName("Config");
    const settingsSheet = ss.getSheetByName("Settings");

    // 1. Konfigurasi Acara (Sheet1)
    sheet.getRange("B1:B5").setValues([
      [s.namaAcara], [s.tanggal], [s.lokasi], [s.waktu], [s.link]
    ]);
    sheet.getRange("E1:G1").setValues([[s.sesi1, s.sesi2, s.sesi3]]);

    // 2. Integrasi & Display (Config)
    if (!configSheet) {
      configSheet = ss.insertSheet("Config");
      configSheet.getRange("A1:A2").setValues([["URL_FOTO"], ["PRESET_STYLE"]]);
    }
    configSheet.getRange("B1").setValue(s.urlFoto);
    configSheet.getRange("B2").setValue(s.presetKode);

    // 3. API Token (Settings!E2)
    if (settingsSheet && s.apiToken) {
      settingsSheet.getRange("E2").setValue(s.apiToken);
    }

    return { status: "success", message: "Pengaturan berhasil disimpan" };
  } catch (e) { return { status: "error", message: e.toString() }; }
}

function getDropdownOptions(ssId) {
  try {
    const ss = getSS(ssId);
    let sheet = ss.getSheetByName("Config_Dropdown");
    
    // Jika sheet belum ada, buat dan isi dengan default berdasarkan kategori
    if (!sheet) {
      sheet = ss.insertSheet("Config_Dropdown");
      sheet.getRange("A1").setValue("Pilihan Dropdown");
      
      // Deteksi Kategori dari Config!B3 (atau default ke wedding)
      const configSheet = ss.getSheetByName("Config");
      let category = "wedding";
      if (configSheet) {
        category = String(configSheet.getRange("B3").getValue() || "wedding").toLowerCase();
      }
      
      let defaultOptions = [];
      
      if (category.includes("wedding")) {
        defaultOptions = [
          "PENGANTIN PRIA", "PENGANTIN WANITA", 
          "KELUARGA AYAH PENGANTIN PRIA", "KELUARGA IBU PENGANTIN PRIA",
          "KELUARGA AYAH PENGANTIN WANITA", "KELUARGA IBU PENGANTIN WANITA"
        ];
      } else if (category.includes("birthday")) {
        defaultOptions = ["Keluarga Inti", "Teman Sekolah/Kuliah", "Teman Kerja", "Kerabat/Tetangga"];
      } else if (category.includes("corporate")) {
        defaultOptions = ["Direksi / Management", "Staff / Karyawan", "Klien / Partner Bisnis", "Vendor / Supplier"];
      } else if (category.includes("anniversary")) {
        defaultOptions = ["Keluarga Besar", "Kolega Bisnis", "Sahabat", "Umum"];
      } else {
        defaultOptions = ["Panitia", "Peserta Utama", "Tamu Undangan", "Media / VIP"];
      }

      const rowData = defaultOptions.map(opt => [opt.toUpperCase()]);
      sheet.getRange(2, 1, rowData.length, 1).setValues(rowData);
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { status: "success", options: [] };
    
    const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    const options = values.map(r => r[0]).filter(v => v !== "");
    return { status: "success", options: options };
  } catch (e) { return { status: "error", message: e.toString() }; }
}

function saveDropdownOptions(ssId, options) {
  try {
    const ss = getSS(ssId);
    let sheet = ss.getSheetByName("Config_Dropdown") || ss.insertSheet("Config_Dropdown");
    sheet.clear();
    sheet.getRange("A1").setValue("Pilihan Dropdown");
    
    if (options && options.length > 0) {
      const rowData = options.map(opt => [opt]);
      sheet.getRange(2, 1, rowData.length, 1).setValues(rowData);
    }
    return { status: "success", message: "Dropdown berhasil diperbarui" };
  } catch (e) { return { status: "error", message: e.toString() }; }
}
