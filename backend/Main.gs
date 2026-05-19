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
  if (action === "getSettings") return createResponse(getSettings(ssId, e.parameter.guestId));
  if (action === "getDropdownOptions") return createResponse(getDropdownOptions(ssId));
  if (action === "getWishes") return createResponse(getWishes(ssId));
  if (action === "updateRsvp") return createResponse(updateRsvp(ssId, e.parameter.guestId, e.parameter.pax));
  
  // WELCOME SIGN HANDSHAKE
  if (action === "getWelcome") return createResponse(getWelcomeData(ssId));

  // Routing untuk Worker dengan Filter Station
  if (action === "getPrintQueue") {
    const queueData = getPrintQueue(ssId, station, e.parameter.source, e.parameter.jalur); 
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
        result = confirmCheckIn(ssId, payload.kodeUnik, payload.realHadir, payload.statusAngpao || payload.catatan, payload.stationId); 
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

      case "sendAutomationBlast":
        result = handleSendAutomationBlast(payload);
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

      case "saveMasterToken":
      case "updateMasterToken":
      case "remoteFonnte":
      case "toggleStatus":
      case "executeFonnteBlast":
        result = handleWAFormPost(payload);
        break;
        
      case 'saveWelcomePhotos':
        result = saveWelcomePhotos(ssId, payload.urlFoto, payload.teks1, payload.teks2);
        break;
        
      case 'addWish':
        result = addWish(ssId, payload.name, payload.text);
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

function confirmCheckIn(ssId, kodeUnik, realHadir, catatan, stationId) {
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
      processPrintLogic(ssId, updatedRowData, catatan, stationId);
      addToRundown(ssId, updatedRowData); // Sinkronisasi ke Welcome Sign Rundown

      return { "status": "success", "row": rowIndex, "triggerBlast": true };
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
    template: sheet.getRange("C6").getValue().toString().trim(), // Teks kata pengantar dinamis di kolom C6
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

function processPrintLogic(ssId, guestData, giftStatus, stationId) {
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
  addToQueue(ssId, guestInfo, guestInfo.kategori, labelType, stationId);

  if (giftStatus && giftStatus !== "-" && giftStatus !== "ON-SITE") {
    const statusUpper = String(giftStatus).toUpperCase();
    if (statusUpper.includes("ANGPAO") && statusUpper.includes("KADO")) {
      addToQueue(ssId, guestInfo, guestInfo.kategori, "SOUVENIR: KADO", stationId);
      addToQueue(ssId, guestInfo, guestInfo.kategori, "SOUVENIR: ANGPAO", stationId);
    } else {
      addToQueue(ssId, guestInfo, guestInfo.kategori, "SOUVENIR: " + statusUpper, stationId);
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

    // Ambil status antrean untuk menentukan status awal
    let initialStatus = "WAITING";
    const existingStatuses = rdSheet.getRange(2, 8, rdSheet.getLastRow(), 1).getValues();
    const hasDisplay = existingStatuses.some(r => r[0] === "DISPLAY");
    if (!hasDisplay) initialStatus = "DISPLAY";

    // E: Kode, F: Nama, G: Jam, H: Status, I: Kategori, J: Alamat
    const rdData = [
      guestRow[5],  // Kode Unik (Kolom F di Data)
      guestRow[2],  // Nama (Kolom C di Data)
      timeOnly,     // Jam Datang
      initialStatus,// Status (WAITING / DISPLAY)
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

function addToQueue(ssId, guest, category, info, stationId) {
  const ss = getSS(ssId);
  let qSheet = ss.getSheetByName(SHEET_PRINT) || ss.insertSheet(SHEET_PRINT);
  
  // JABAT TANGAN BACKEND: Pastikan Header Lengkap (ID s/d STATION ID)
  if (qSheet.getLastRow() === 0) {
    qSheet.appendRow(["ID", "TIMESTAMP", "NAMA", "KODE", "QR LINK", "INFO", "STATUS", "KATEGORI", "ALAMAT", "PIHAK", "SESI", "PAX", "STATION ID"]);
  } else {
    // Jika sheet sudah ada, pastikan kolom ke-9 (ALAMAT) dan ke-13 (STATION ID) sudah ada header-nya
    const headerCheck = qSheet.getRange(1, 1, 1, Math.max(13, qSheet.getLastColumn())).getValues()[0];
    if (headerCheck.length < 9 || headerCheck[8] !== "ALAMAT") {
       qSheet.getRange(1, 9, 1, 5).setValues([["ALAMAT", "PIHAK", "SESI", "PAX", "STATION ID"]]);
    } else if (headerCheck.length < 13 || headerCheck[12] !== "STATION ID") {
       qSheet.getRange(1, 13).setValue("STATION ID");
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
    guest.pax || "1",
    stationId || "ALL"
  ]);
}

function getPrintQueue(ssId, stationFilter, sourceFilter, jalurFilter) {
  const ss = getSS(ssId);
  const sheet = ss.getSheetByName(SHEET_PRINT);
  if (!sheet) return [];
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return []; 

  // JABAT TANGAN: Pastikan kolom cukup sebelum membaca
  if (sheet.getLastColumn() < 12) {
    sheet.getRange(1, 9, 1, 4).setValues([["ALAMAT", "PIHAK", "SESI", "PAX"]]);
  }

  const lastCol = sheet.getLastColumn();
  const numCols = Math.max(13, lastCol);
  const data = sheet.getRange(2, 1, lastRow - 1, numCols).getValues();
  const currentStation = (stationFilter || "").toUpperCase().trim();
  const currentSource = (sourceFilter || "ALL").toUpperCase().trim();
  const currentJalur = (jalurFilter || "ALL").toUpperCase().trim();

  return data
    .filter(r => {
      const statusMatch = r[6] ? r[6].toString().toUpperCase().trim() === "WAITING" : false; // Kolom G
      if (!statusMatch) return false;

      const jenisInfo = r[5] ? r[5].toString().toUpperCase().trim() : ""; // Kolom F
      if (currentStation === "LOKET-1" && jenisInfo.indexOf("SOUVENIR") === -1) return false;
      if (currentStation === "LOKET-2" && jenisInfo.indexOf("CHECKIN") === -1) return false;

      // Filter by Station ID (Column M, e.g. "CHECKIN-4")
      if (currentSource !== "ALL" || currentJalur !== "ALL") {
        const rowStationId = r[12] ? r[12].toString().toUpperCase().trim() : "ALL";
        if (rowStationId !== "ALL" && rowStationId !== "") {
          let parts = rowStationId.split("-");
          let rowSource = parts[0];
          let rowJalur = parts[1] || "ALL";

          if (currentSource !== "ALL" && rowSource !== currentSource) return false;
          if (currentJalur !== "ALL" && rowJalur !== currentJalur) return false;
        }
      }

      return true;
    })
    .map(r => ({ 
      id: r[0], timestamp: r[1], nama: r[2], kode: r[3], qr: r[4], info: r[5], status: r[6], kategori: r[7],
      alamat: r[8], pihak: r[9], sesi: r[10], pax: r[11], stationId: r[12] || "ALL"
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
    processPrintLogic(data.ssId, lastRowData, giftVal, data.stationId);
    addToRundown(data.ssId, lastRowData); // Sinkronisasi ke Welcome Sign
    return { status: "success", kode: kodeUnik, message: "On-Site Berhasil", triggerBlast: true };
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
  return { status: "success", rowID: sheet.getLastRow(), kode: kodeUnik, triggerBlast: true, personalLink: baseLink + "?id=" + kodeUnik + "&u=" + encodeURIComponent(formData.nama) };
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
    
    const meta = sheet.getRange("B1:B2").getValues();
    const weddingName = meta[0][0] || "SapaTamu.Ku";
    const weddingDate = meta[1][0] || "-";
    
    const rundownSheet = ss.getSheetByName("Rundown");
    let latestGuest = { nama: "", kategori: "", alamat: "" };
    let displayDuration = 12000; // Default 12s

    if (rundownSheet) {
      const rdLast = rundownSheet.getLastRow();
      if (rdLast >= 2) {
        // AMBIL SEMUA DATA RUNDOWN (Kolom E s/d J)
        const rdRange = rundownSheet.getRange(2, 5, rdLast - 1, 6);
        const rdValues = rdRange.getValues();
        
        let displayIdx = -1;
        let waitingIndices = [];

        // Identifikasi status DISPLAY dan antrean WAITING
        for (let i = 0; i < rdValues.length; i++) {
          const status = String(rdValues[i][3]).toUpperCase();
          if (status === "DISPLAY") displayIdx = i;
          if (status === "WAITING") waitingIndices.push(i);
        }

        // LOGIKA ROTASI: Jika ada DISPLAY dan ada antrean WAITING
        if (displayIdx !== -1 && waitingIndices.length > 0) {
          // 1. DISPLAY lama -> DONE
          rundownSheet.getRange(displayIdx + 2, 8).setValue("DONE");
          
          // 2. WAITING tertua -> DISPLAY
          const nextIdx = waitingIndices[0];
          rundownSheet.getRange(nextIdx + 2, 8).setValue("DISPLAY");
          
          // Ambil data DISPLAY baru
          latestGuest = {
            nama: rdValues[nextIdx][1],
            kategori: rdValues[nextIdx][4],
            alamat: rdValues[nextIdx][5]
          };
          
          // Hitung durasi dinamis berdasarkan jumlah sisa antrean
          const qSize = waitingIndices.length;
          if (qSize < 3) displayDuration = 12000;
          else if (qSize < 9) displayDuration = 6000;
          else displayDuration = 3000;

        } else if (displayIdx !== -1) {
          // Hanya ada DISPLAY tanpa antrean WAITING
          latestGuest = {
            nama: rdValues[displayIdx][1],
            kategori: rdValues[displayIdx][4],
            alamat: rdValues[displayIdx][5]
          };
          displayDuration = 12000;
        } else if (waitingIndices.length > 0) {
          // Tidak ada DISPLAY tapi ada WAITING (Kasih makan mesin)
          const nextIdx = waitingIndices[0];
          rundownSheet.getRange(nextIdx + 2, 8).setValue("DISPLAY");
          latestGuest = {
            nama: rdValues[nextIdx][1],
            kategori: rdValues[nextIdx][4],
            alamat: rdValues[nextIdx][5]
          };
          displayDuration = 12000;
        }
      }
    }

    // Ambil Rundown (Timeline)
    let rundown = [];
    if (rundownSheet) {
      const rdLast = rundownSheet.getLastRow();
      if (rdLast >= 2) {
        const rundownRaw = rundownSheet.getRange(2, 1, Math.max(1, rdLast - 1), 3).getValues();
        rundown = rundownRaw
          .filter(r => r[0] || r[1])
          .map(row => ({
            displayTime: String(row[0] || ""),
            eventName: String(row[1] || ""),
            syncTime: formatTime(row[2])
          }));
      }
    }

    // Ambil 10 Nama Terakhir untuk Marquee (Semua yang sudah masuk sistem)
    let guestLog = "MENUNGGU TAMU...";
    if (rundownSheet) {
      const rdLast = rundownSheet.getLastRow();
      if (rdLast >= 2) {
        const logData = rundownSheet.getRange(Math.max(2, rdLast - 10), 6, Math.min(11, rdLast), 1).getValues();
        const names = logData.map(r => String(r[0] || "").trim()).filter(n => n !== "").reverse();
        if (names.length > 0) guestLog = "SELAMAT DATANG: " + names.join("  •  ");
      }
    }

    let urlFoto = "";
    let teksSambutan1 = "";
    let teksSambutan2 = "";
    
    const configSheet = ss.getSheetByName("CONFIG") || ss.getSheetByName("Config");
    if (configSheet) {
      urlFoto = configSheet.getRange("B1").getValue() || "";
      const t1 = configSheet.getRange("B7").getValue();
      if (t1) teksSambutan1 = t1;
      const t2 = configSheet.getRange("B8").getValue();
      if (t2) teksSambutan2 = t2;
    }

    return {
      status: "success",
      weddingName,
      weddingDate,
      latestGuest,
      rundown,
      log: guestLog.toUpperCase(),
      urlFoto,
      teksSambutan1,
      teksSambutan2,
      displayDuration
    };
  } catch (err) {
    return { status: "error", error: err.toString() };
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
function getSettings(ssId, guestId = null) {
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
    let waPhone = "";
    let theme = "classic";
    let teksSambutan1 = "";
    let teksSambutan2 = "";
    let invitationData = {};
    
    // Pencarian waPhone Dinamis berdasarkan guestId
    let foundWaPhone = false;
    if (settingsSheet && guestId && sheet) {
       const lastRow = sheet.getLastRow();
       if (lastRow > 6) {
           const guestData = sheet.getRange(7, 1, lastRow - 6, 12).getValues();
           const matchedGuest = guestData.find(row => row[5] === guestId); // Kolom F (Kode Unik)
           
           if (matchedGuest && matchedGuest[11]) {
               const pengundang = matchedGuest[11].toString().trim().toUpperCase(); // Kolom L
               const settingsData = settingsSheet.getRange("A2:B20").getValues();
               const matchedSetting = settingsData.find(row => row[0] && row[0].toString().trim().toUpperCase() === pengundang);
               
               if (matchedSetting && matchedSetting[1]) {
                   waPhone = matchedSetting[1].toString().trim();
                   if (waPhone.startsWith('0')) waPhone = '62' + waPhone.substring(1);
                   foundWaPhone = true;
               }
           }
       }
    }
    
    // Fallback: cari nomor telepon pertama yang tersedia di sheet Settings jika guestId tidak ditemukan
    if (settingsSheet && !foundWaPhone) {
      const phones = settingsSheet.getRange("B2:B20").getValues().flat().filter(val => val !== null && val.toString().trim() !== "");
      if (phones.length > 0) {
        waPhone = phones[0].toString().trim();
        // Konversi awal 0 ke 62 agar format wa.me valid
        if (waPhone.startsWith('0')) waPhone = '62' + waPhone.substring(1);
      }
    }
    
    if (configSheet) {
      urlFoto = configSheet.getRange("B1").getValue() || "";
      presetKode = configSheet.getRange("B2").getValue() || "1";
      
      // Gunakan Config B5 HANYA jika waPhone belum ditemukan di Settings
      const configWa = configSheet.getRange("B5").getValue();
      if (configWa && !foundWaPhone && (!settingsSheet || settingsSheet.getRange("B2:B20").getValues().flat().filter(val => val !== null && val.toString().trim() !== "").length === 0)) {
         waPhone = configWa.toString().startsWith('0') ? '62' + configWa.toString().substring(1) : configWa;
      }
      
      theme = configSheet.getRange("B6").getValue() || "classic";
      
      const t1 = configSheet.getRange("B7").getValue();
      if (t1) teksSambutan1 = t1;
      const t2 = configSheet.getRange("B8").getValue();
      if (t2) teksSambutan2 = t2;
      
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
        teksSambutan1: teksSambutan1,
        teksSambutan2: teksSambutan2,
        invitationData: invitationData
      }
    };
  } catch (e) { return { status: "error", message: e.toString() }; }
}



function getDropdownOptions(ssId) {
  try {
    const ss = getSS(ssId);
    const sheet = ss.getSheetByName("Config_Dropdown");
    if (!sheet) return { status: "success", options: [] };
    
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
    const options = data.map(r => r[0]).filter(r => r !== "");
    return { status: "success", options: options };
  } catch (e) {
    return { status: "error", message: e.toString() };
  }
}

function saveWelcomePhotos(ssId, urlFoto, teks1, teks2) {
  try {
    const ss = getSS(ssId);
    let configSheet = ss.getSheetByName("CONFIG") || ss.getSheetByName("Config");
    if (!configSheet) {
      configSheet = ss.insertSheet("CONFIG");
      configSheet.getRange("A1").setValue("URL_FOTO");
    }
    configSheet.getRange("B1").setValue(urlFoto);
    
    if (teks1 !== undefined) {
      configSheet.getRange("A7").setValue("TEKS_SAMBUTAN_1");
      configSheet.getRange("B7").setValue(teks1);
    }
    if (teks2 !== undefined) {
      configSheet.getRange("A8").setValue("TEKS_SAMBUTAN_2");
      configSheet.getRange("B8").setValue(teks2);
    }
    
    return { status: "success", message: "Konfigurasi Welcome Sign berhasil diperbarui" };
  } catch (e) { return { status: "error", message: e.toString() }; }
}

function saveSettings(ssId, s) {
  try {
    const ss = getSS(ssId);
    const sheet = ss.getSheetByName(SHEET_DATA);
    let configSheet = ss.getSheetByName("CONFIG") || ss.getSheetByName("Config");
    const settingsSheet = ss.getSheetByName("Settings");

    // 1. Konfigurasi Acara (Sheet1)
    sheet.getRange("B1:B5").setValues([
      [s.namaAcara], [s.tanggal], [s.lokasi], [s.waktu], [s.link]
    ]);
    sheet.getRange("E1:G1").setValues([[s.sesi1, s.sesi2, s.sesi3]]);

    // 2. Integrasi & Display (Config)
    if (!configSheet) {
      configSheet = ss.insertSheet("CONFIG");
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
function handleSendAutomationBlast(data) {
  try {
    const ss = getSS(data.ssId);
    const settingsSheet = ss.getSheetByName("Settings_Event");
    const apiToken = settingsSheet.getRange("D7").getValue();
    const namaMempelai = settingsSheet.getRange("D5").getValue();
    
    if (!apiToken) return { status: "error", message: "API Token Fonnte belum diatur." };

    let message = "";
    const guest = data.guestData;

    // Logika pesan otomatis: HANYA untuk Check-in
    if (data.type === "checkin") {
      message = `Halo *${guest.nama}*,\nSelamat datang di acara *${namaMempelai}*.\n\nTerima kasih telah hadir dan memberikan doa restu. Silakan menikmati hidangan yang telah kami sediakan.\n\n- SapaTamu.Ku`;
    } else {
      // Jika bukan checkin (pendaftaran/onsite), batalkan pengiriman otomatis
      return { status: "success", message: "Otomasi pendaftaran dilewati (Manual Blast Mode)" };
    }

    const res = UrlFetchApp.fetch("https://api.fonnte.com/send", {
      method: "post",
      headers: { "Authorization": apiToken },
      payload: { target: guest.whatsapp, message: message }
    });

    return { status: "success", fonnte: JSON.parse(res.getContentText()) };
  } catch (e) {
    return { status: "error", message: e.toString() };
  }
}

function addWish(ssId, name, text) {
  try {
    const ss = getSS(ssId);
    let sheet = ss.getSheetByName("Wishes");
    if (!sheet) {
      sheet = ss.insertSheet("Wishes");
      sheet.appendRow(["Timestamp", "Name", "Text"]);
    }
    sheet.appendRow([new Date(), name, text]);
    return { status: "success" };
  } catch (e) {
    return { status: "error", message: e.toString() };
  }
}

function getWishes(ssId) {
  try {
    const ss = getSS(ssId);
    const sheet = ss.getSheetByName("Wishes");
    if (!sheet) return { status: "success", data: [] };
    
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { status: "success", data: [] };
    
    const dataRange = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
    const wishes = dataRange.map(row => ({
      name: row[1],
      text: row[2],
      timestamp: row[0]
    })).reverse();
    
    return { status: "success", data: wishes };
  } catch (e) {
    return { status: "error", message: e.toString() };
  }
}

function updateRsvp(ssId, guestId, pax) {
  try {
    const ss = getSS(ssId);
    const sheet = ss.getSheetByName("Sheet1");
    if (!sheet) return { status: "error", message: "Sheet1 tidak ditemukan" };
    
    const lastRow = sheet.getLastRow();
    if (lastRow < 7) return { status: "error", message: "Data tamu kosong" };
    
    const guestData = sheet.getRange(7, 1, lastRow - 6, 12).getValues();
    const guestIndex = guestData.findIndex(row => row[5] && row[5].toString().trim() === guestId.toString().trim()); // Kolom F: Kode Unik
    
    if (guestIndex > -1) {
      // Row 7 + guestIndex. Kolom H (Rencana Hadir) adalah kolom ke-8.
      sheet.getRange(7 + guestIndex, 8).setValue(parseInt(pax) || 1);
      return { status: "success", message: "Rencana Hadir diupdate" };
    } else {
      return { status: "error", message: "Tamu tidak ditemukan" };
    }
  } catch (e) {
    return { status: "error", message: e.toString() };
  }
}
