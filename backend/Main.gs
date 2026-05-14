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
  const meta = sheet.getRange("A1:B6").getValues();
  const sesiMeta = sheet.getRange("D1:G1").getValues()[0];

  const eventMeta = {
    pengantin: meta[0][1], tanggal: meta[1][1], lokasi: meta[2][1], waktu: meta[3][1], link: meta[4][1],
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
  return { eventMeta, guestList };
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
  const kodeUnik = "STK-" + randomPart;
  const baseLink = sheet.getRange("B5").getValue();
  let cleanPhone = String(formData.whatsapp || "").replace(/\D/g, ''); 
  if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.substring(1);
  const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?data=" + kodeUnik + "&size=400x400";
  const newRow = [
    "=ROW()-" + (START_ROW - 1), nowFormatted, formData.nama, "'" + cleanPhone, 
    formData.kategori, kodeUnik, qrUrl, formData.rencana || 1, 0, "-", 0, 
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
    
    const meta = sheet.getRange("A1:B6").getValues();
    const weddingName = meta[0][1] || "SapaTamu.Ku";
    const weddingDate = meta[1][1] || "-";
    
    // Cari Tamu Terakhir Check-in (Status 1)
    const lastRow = sheet.getLastRow();
    let latestGuest = { nama: "", kategori: "", alamat: "" };
    
    if (lastRow >= START_ROW) {
      const guestData = sheet.getRange(START_ROW, 1, lastRow - (START_ROW - 1), 13).getValues(); 
      for (let i = guestData.length - 1; i >= 0; i--) {
        if (String(guestData[i][8]) === "1") {
          latestGuest = {
            nama: guestData[i][2],     // Kolom C
            kategori: guestData[i][4], // Kolom E
            alamat: guestData[i][12]   // Kolom M
          };
          break;
        }
      }
    }

    // Ambil Rundown secara Aman
    let rundown = [];
    const rundownSheet = ss.getSheetByName("Rundown");
    if (rundownSheet) {
      const rdLast = rundownSheet.getLastRow();
      if (rdLast >= 2) {
        const rdData = rundownSheet.getRange(2, 1, rdLast - 1, 3).getValues();
        rundown = rdData.map(r => {
          let sTime = "00:00";
          try {
            // Indikator ada di kolom C (r[2])
            const timeRaw = r[2];
            const d = (timeRaw instanceof Date) ? timeRaw : new Date(timeRaw);
            if (!isNaN(d.getTime())) {
              sTime = Utilities.formatDate(d, "GMT+7", "HH:mm");
            } else if (typeof timeRaw === 'string' && timeRaw.includes(':')) {
              sTime = timeRaw.substring(0, 5); 
            }
          } catch(e) { console.warn("Rundown time parse error:", e); }

          return {
            syncTime: sTime,
            displayTime: String(r[0] || ""), // Kolom A: Waktu
            eventName: String(r[1] || "")    // Kolom B: Nama Acara
          };
        });
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

    return {
      status: "success",
      weddingName,
      weddingDate,
      latestGuest,
      rundown,
      log: guestLog.toUpperCase(),
      displayDuration: 10000
    };
  } catch (err) {
    console.error("getWelcomeData Error:", err);
    return { status: "error", error: err.toString(), message: err.toString() };
  }
}
