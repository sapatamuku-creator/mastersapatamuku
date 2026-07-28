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
  if (action === "findSheetId") {
    const name = e.parameter.name;
    const files = DriveApp.getFilesByName(name);
    if (files.hasNext()) {
      return createResponse({ status: "success", id: files.next().getId() });
    }
    const searchFiles = DriveApp.searchFiles("title contains '" + name + "'");
    if (searchFiles.hasNext()) {
      return createResponse({ status: "success", id: searchFiles.next().getId() });
    }
    return createResponse({ status: "error", message: "Not found" });
  }
  if (action === "getMasterDataAngpao") return createResponse({ status: "success", guestList: getMasterDataV3(ssId) });
  if (action === "getSettings") return createResponse(getSettings(ssId, e.parameter.guestId));
  if (action === "getDropdownOptions") return createResponse(getDropdownOptions(ssId));
  if (action === "getWishes") return createResponse(getWishes(ssId));
  if (action === "updateRsvp") return createResponse(updateRsvp(ssId, e.parameter.guestId, e.parameter.pax, e.parameter.wishText));
  
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
        
      case "syncSheetToSupabase":
        result = syncSheetToSupabase(ssId);
        break;
        
      case "syncWishesToSupabase":
        result = syncWishesToSupabase(ssId);
        break;
        
      case "submitCollection": 
        result = submitGuestCollection(payload); 
        break;

      case "markSent": 
        result = markAsSent(ssId, payload.row, payload.kodeUnik); 
        break;
      
      case "confirm_checkin": 
        result = confirmCheckIn(
          ssId, 
          payload.kodeUnik, 
          payload.realHadir, 
          payload.statusAngpao || payload.catatan, 
          payload.stationId, 
          payload.customUuid, 
          payload.skipSupabase, 
          payload.skipSupabasePrint
        ); 
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
        result = updateTandaKasih(ssId, payload.kodeUnik, payload.nominal, payload.statusHadiah); 
        break;

      case "sendAutomationBlast":
        result = handleSendAutomationBlast(payload);
        break;

      case "deleteGuest":
        result = deleteGuest(ssId, payload.kodeUnik);
        break;

      case "saveGuestsToSheet":
        result = saveGuestsToSheet(ssId, payload.guests);
        break;

      case "deleteGuestsFromSheet":
        result = deleteGuestsFromSheet(ssId, payload.codes);
        break;
        
      case "overwriteSheetWithGuests":
        result = overwriteSheetWithGuests(ssId, payload.guests);
        break;
        
      case "editGuest":
        result = editGuest(payload);
        break;
        
      case "uploadSelfie":
      case "selfiePost":
        result = handleSelfiePost(payload);
        break;
      
      case "getSpreadsheetGuestCount":
        result = getSpreadsheetGuestCount(ssId);
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
      
      case "updateRsvp":
        result = updateRsvp(ssId, payload.guestId, payload.pax, payload.wishText);
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
        
        // HAPUS DI SUPABASE SECARA OTOMATIS
        try {
          if (SUPABASE_URL && SUPABASE_URL !== "YOUR_SUPABASE_PROJECT_URL") {
            supabaseFetch(SUPABASE_URL + "/rest/v1/tamu?ssid=eq." + ssId + "&kode=eq." + kodeUnik, {
              method: "delete",
              headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": "Bearer " + SUPABASE_KEY
              },
              muteHttpExceptions: true
            });
          }
        } catch (e) {
          console.error("Failed to delete guest in Supabase: " + e.toString());
        }

        return { status: "success", message: "Tamu berhasil dihapus" };
      }
    }
    return { status: "error", message: "Kode tidak ditemukan" };
  } catch (err) {
    return { status: "error", message: err.toString() };
  }
}

function saveGuestsToSheet(ssId, guests) {
  try {
    const ss = getSS(ssId);
    const sheet = ss.getSheetByName(SHEET_DATA);
    const lastRow = sheet.getLastRow();
    
    let existingCodes = new Set();
    if (lastRow >= START_ROW) {
      const data = sheet.getRange(START_ROW, COL_KODE_UNIK, lastRow - (START_ROW - 1), 1).getValues();
      for (let i = 0; i < data.length; i++) {
        existingCodes.add(String(data[i][0]).trim());
      }
    }
    
    let addedCount = 0;
    const nowFormatted = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm:ss");
    
    // Ambil event date sekali untuk semua tamu
    let eventDate = "";
    try {
      const eventDateRaw = sheet.getRange("B2").getValue();
      eventDate = Utilities.formatDate(parseEventDate(eventDateRaw), "GMT+7", "yyyy-MM-dd");
    } catch (dateErr) {
      console.error("Failed to parse event date in saveGuestsToSheet: " + dateErr.toString());
    }

    for (let i = 0; i < guests.length; i++) {
      const g = guests[i];
      const kode = String(g.kode || "").trim();
      if (!kode || existingCodes.has(kode)) continue;
      
      const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?data=" + kode + "&size=400x400";
      const rowData = [
        "=ROW()-" + (START_ROW - 1),
        nowFormatted,
        g.nama || "Tanpa Nama",
        g.whatsapp || "",
        g.kategori || "Umum",
        kode,
        qrUrl,
        g.rencanaHadir || 1,
        g.statusHadir || "0",
        g.jamDatang || "-",
        g.souvenir || "tidak",
        g.pihakPengundang || "-",
        g.alamat || "-",
        g.realHadir || "0",
        g.statusHadiah || "-",
        g.statusWA || "BELUM TERKIRIM",
        "-",
        g.tandaKasih || 0,
        g.sesi || "-"
      ];
      sheet.appendRow(rowData);
      const newRowIdx = sheet.getLastRow();
      addedCount++;
      
      // Update row index dan event_date kembali ke Supabase secara otomatis
      try {
        if (SUPABASE_URL && SUPABASE_URL !== "YOUR_SUPABASE_PROJECT_URL") {
          supabaseFetch(SUPABASE_URL + "/rest/v1/tamu?ssid=eq." + ssId + "&kode=eq." + kode, {
            method: "patch",
            headers: {
              "apikey": SUPABASE_KEY,
              "Authorization": "Bearer " + SUPABASE_KEY,
              "Content-Type": "application/json"
            },
            payload: JSON.stringify({
              row: newRowIdx,
              event_date: eventDate || null
            }),
            muteHttpExceptions: true
          });
        }
      } catch (sbErr) {
        console.error("Failed to sync row index to Supabase for kode " + kode + ": " + sbErr.toString());
      }
    }
    
    return { status: "success", message: `Berhasil menambahkan ${addedCount} tamu ke Spreadsheet.` };
  } catch (e) {
    return { status: "error", message: e.toString() };
  }
}

function deleteGuestsFromSheet(ssId, guestCodes) {
  try {
    const ss = getSS(ssId);
    const sheet = ss.getSheetByName(SHEET_DATA);
    const lastRow = sheet.getLastRow();
    if (lastRow < START_ROW) return { status: "success", message: "Data kosong" };
    
    const data = sheet.getRange(START_ROW, COL_KODE_UNIK, lastRow - (START_ROW - 1), 1).getValues();
    const codesToDelete = new Set(guestCodes.map(c => String(c).trim()));
    
    let deleteCount = 0;
    // Loop backwards so row deletions don't affect indices of remaining rows to delete
    for (let i = data.length - 1; i >= 0; i--) {
      const rowCode = String(data[i][0]).trim();
      if (codesToDelete.has(rowCode)) {
        sheet.deleteRow(i + START_ROW);
        deleteCount++;
      }
    }
    
    return { status: "success", message: `Berhasil menghapus ${deleteCount} tamu dari Spreadsheet.` };
  } catch (e) {
    return { status: "error", message: e.toString() };
  }
}


// createResponse removed (using UnifiedRouter version)

// --- 3. CORE FUNCTIONS ---

/**
 * Memperbarui nominal angpao di Kolom R berdasarkan Kode Unik di Kolom F
 */
function updateTandaKasih(ssId, kode, nominal, statusHadiah) {
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
      let cleanedGiftStatus = "-";
      if (statusHadiah !== undefined) {
        let tags = [];
        let upperStatus = String(statusHadiah).toUpperCase();
        if (upperStatus.includes("ANGPAO")) tags.push("ANGPAO");
        if (upperStatus.includes("KADO")) tags.push("KADO");
        cleanedGiftStatus = tags.length > 0 ? tags.join(" ") : "-";
        sheet.getRange(targetRow, COL_CATATAN).setValue(cleanedGiftStatus);
      } else {
        cleanedGiftStatus = String(sheet.getRange(targetRow, COL_CATATAN).getValue() || "").trim();
      }
      
      // SINKRONISASI KE SUPABASE SECARA OTOMATIS
      try {
        if (SUPABASE_URL && SUPABASE_URL !== "YOUR_SUPABASE_PROJECT_URL") {
          let payload = { 
            tanda_kasih: parseFloat(nominal) || 0,
            status_hadiah: cleanedGiftStatus
          };
          
          supabaseFetch(SUPABASE_URL + "/rest/v1/tamu?ssid=eq." + ssId + "&kode=eq." + kode, {
            method: "patch",
            headers: {
              "apikey": SUPABASE_KEY,
              "Authorization": "Bearer " + SUPABASE_KEY,
              "Content-Type": "application/json"
            },
            payload: JSON.stringify(payload),
            muteHttpExceptions: true
          });
        }
      } catch (e) {
        console.error("Failed to sync tanda_kasih to Supabase: " + e.toString());
      }

      return { status: "success", message: "Data Angpao berhasil diupdate" };
    }
  }
  return { status: "error", message: "Kode tamu tidak ditemukan" };
}

function confirmCheckIn(ssId, kodeUnik, realHadir, catatan, stationId, customUuid, skipSupabase, skipSupabasePrint) {
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
      let cleanedCatatan = "-";
      if (catatan) {
        let tags = [];
        let upperC = String(catatan).toUpperCase();
        if (upperC.includes("ANGPAO")) tags.push("ANGPAO");
        if (upperC.includes("KADO")) tags.push("KADO");
        cleanedCatatan = tags.length > 0 ? tags.join(" ") : "-";
      }
      sheet.getRange(rowIndex, COL_CATATAN).setValue(cleanedCatatan);
      
      const currentKasih = sheet.getRange(rowIndex, COLUMN_TANDA_KASIH).getValue();
      if (currentKasih === "" || currentKasih === null || currentKasih === undefined) {
        sheet.getRange(rowIndex, COLUMN_TANDA_KASIH).setValue(0);
      }
      
      SpreadsheetApp.flush(); // Flush updates to spreadsheet so we read correct updated data
      const updatedRowData = sheet.getRange(rowIndex, 1, 1, 19).getValues()[0];
      
      // SINKRONISASI KE SUPABASE SECARA OTOMATIS
      if (!skipSupabase) {
        try {
          if (SUPABASE_URL && SUPABASE_URL !== "YOUR_SUPABASE_PROJECT_URL") {
            const payload = {
              status_hadir: "1",
              jam_datang: timeOnly,
              real_hadir: String(realHadir),
              status_hadiah: cleanedCatatan,
              souvenir: updatedRowData[10] === 1 || updatedRowData[10] === "ya" || updatedRowData[10] === "1" ? "ya" : "tidak"
            };
            
            supabaseFetch(SUPABASE_URL + "/rest/v1/tamu?ssid=eq." + ssId + "&kode=eq." + kodeUnik, {
              method: "patch",
              headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": "Bearer " + SUPABASE_KEY,
                "Content-Type": "application/json"
              },
              payload: JSON.stringify(payload),
              muteHttpExceptions: true
            });
          }
        } catch (e) {
          console.error("Failed to sync checkin to Supabase: " + e.toString());
        }
      }
      
      processPrintLogic(ssId, updatedRowData, catatan, stationId, customUuid, skipSupabasePrint !== undefined ? skipSupabasePrint : skipSupabase);
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

  let rsvpLink = "";
  try {
    rsvpLink = getOrGenerateRsvpLink(ssId, sheet);
  } catch (errR) {
    console.error("Gagal getOrGenerateRsvpLink: " + errR.toString());
    rsvpLink = sheet.getRange("C5").getValue().toString().trim();
  }

  const sesiMeta = sheet.getRange("D1:G1").getValues()[0];

  const eventMeta = {
    pengantin: weddingName, 
    tanggal: weddingDate, 
    lokasi: weddingLoc,
    waktu: weddingTime,
    link: weddingLink,
    rsvpLink: rsvpLink,
    defaultTemplate: sheet.getRange("B6").getValue().toString().trim(),
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

function processPrintLogic(ssId, guestData, giftStatus, stationId, customUuid, skipSupabase) {
  const guestInfo = { 
    nama: guestData[2], 
    kategori: guestData[4], 
    kode: guestData[5], 
    qr: guestData[6],
    pax: guestData[13] || guestData[7] || "1",
    pihak: guestData[11],
    alamat: guestData[12],
    sesi: guestData[18]
  };
  let catUpper = String(guestInfo.kategori).toUpperCase();
  let labelType = (catUpper.includes("VIP") || catUpper.includes("VVIP") || catUpper.includes("KELUARGA")) ? "CHECKIN-LABEL" : "CHECKIN-STRUK";
  addToQueue(ssId, guestInfo, guestInfo.kategori, labelType, stationId, customUuid, skipSupabase);

  if (giftStatus && giftStatus !== "-" && giftStatus !== "ON-SITE") {
    const statusUpper = String(giftStatus).toUpperCase();
    if (statusUpper.includes("ANGPAO") && statusUpper.includes("KADO")) {
      addToQueue(ssId, guestInfo, guestInfo.kategori, "SOUVENIR: KADO", stationId, null, skipSupabase);
      addToQueue(ssId, guestInfo, guestInfo.kategori, "SOUVENIR: ANGPAO", stationId, null, skipSupabase);
    } else {
      addToQueue(ssId, guestInfo, guestInfo.kategori, "SOUVENIR: " + statusUpper, stationId, null, skipSupabase);
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

function addToQueue(ssId, guest, category, info, stationId, customUuid, skipSupabase) {
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
  const uuid = customUuid || Utilities.getUuid();
  qSheet.appendRow([
    uuid, 
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

  if (skipSupabase) {
    return; // Skip posting to Supabase because the frontend handled it directly
  }

  // SINKRONISASI KE SUPABASE SECARA OTOMATIS
  try {
    if (SUPABASE_URL && SUPABASE_URL !== "YOUR_SUPABASE_PROJECT_URL") {
      const payload = {
        id: uuid,
        ssid: ssId,
        nama: guest.nama || "-",
        kode: guest.kode || "-",
        qr: guest.qr || "-",
        info: info,
        status: "WAITING",
        kategori: category || "Umum",
        alamat: guest.alamat || "-",
        pihak: guest.pihak || "-",
        sesi: guest.sesi || "-",
        pax: parseInt(guest.pax) || 1,
        station_id: stationId || "ALL"
      };

      supabaseFetch(SUPABASE_URL + "/rest/v1/print_queue", {
        method: "post",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": "Bearer " + SUPABASE_KEY,
          "Content-Type": "application/json"
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
    }
  } catch (e) {
    console.error("Failed to sync print_queue to Supabase: " + e.toString());
  }
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

  // SINKRONISASI KE SUPABASE SECARA OTOMATIS
  try {
    if (SUPABASE_URL && SUPABASE_URL !== "YOUR_SUPABASE_PROJECT_URL") {
      ids.forEach(id => {
        supabaseFetch(SUPABASE_URL + "/rest/v1/print_queue?id=eq." + id, {
          method: "patch",
          headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": "Bearer " + SUPABASE_KEY,
            "Content-Type": "application/json"
          },
          payload: JSON.stringify({ status: "DONE" }),
          muteHttpExceptions: true
        });
      });
    }
  } catch (e) {
    console.error("Failed to sync markPrinted to Supabase: " + e.toString());
  }

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
    
    // Gunakan kodeUnik dari frontend jika ada untuk konsistensi cepat
    const kodeUnik = data.kodeUnik || ("ONS-" + Math.random().toString(36).substring(2, 7).toUpperCase());
    const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?data=" + kodeUnik + "&size=400x400";
    const rawContact = String(data.whatsapp || "");
    const isPhoneNumber = /^[+\d\s()-]{5,}$/.test(rawContact.trim());
    let cleanPhone;
    if (isPhoneNumber) {
      cleanPhone = rawContact.replace(/\D/g, '');
      if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.substring(1);
    } else {
      // Preserve Instagram username as-is, ensure @ prefix
      cleanPhone = rawContact.startsWith('@') ? rawContact.trim() : '@' + rawContact.trim();
    }
    const giftVal = data.catatan || "-";
    const souvenirVal = data.souvenir === "tidak" ? 0 : 1;

    const newRow = [
      "=ROW()-" + (START_ROW - 1), nowFormatted, data.namaTamu || "Tanpa Nama", "'" + cleanPhone, 
      data.kategori || "UMUM", kodeUnik, qrUrl, 0, 1, timeOnly, souvenirVal, data.host || "-", 
      data.alamat || "-", data.realHadir || 1, giftVal, timestampP, "-", 0, data.sesi || "-"
    ];
    sheet.appendRow(newRow);
    SpreadsheetApp.flush(); // Flush updates to spreadsheet so we read correct row count and values
    const lastRow = sheet.getLastRow();
    const lastRowData = sheet.getRange(lastRow, 1, 1, 19).getValues()[0];

    // SINKRONISASI KE SUPABASE SECARA OTOMATIS
    if (!data.skipSupabase) {
      try {
        if (SUPABASE_URL && SUPABASE_URL !== "YOUR_SUPABASE_PROJECT_URL") {
          const eventDateRaw = sheet.getRange("B2").getValue();
          const eventDate = Utilities.formatDate(parseEventDate(eventDateRaw), "GMT+7", "yyyy-MM-dd");

          const payload = {
            ssid: data.ssId,
            row: lastRow,
            kode: kodeUnik,
            nama: data.namaTamu || "Tanpa Nama",
            whatsapp: cleanPhone,
            kategori: data.kategori || "UMUM",
            rencana_hadir: 0,
            real_hadir: String(data.realHadir),
            souvenir: data.souvenir === "tidak" ? "tidak" : "ya",
            pihak_pengundang: data.host || "-",
            alamat: data.alamat || "-",
            status_hadir: "1",
            status_wa: timestampP,
            status_hadiah: giftVal,
            tanda_kasih: 0,
            sesi: data.sesi || "-",
            jam_datang: timeOnly,
            event_date: eventDate
          };

          supabaseFetch(SUPABASE_URL + "/rest/v1/tamu?on_conflict=ssid,kode", {
            method: "post",
            headers: {
              "apikey": SUPABASE_KEY,
              "Authorization": "Bearer " + SUPABASE_KEY,
              "Content-Type": "application/json",
              "Prefer": "resolution=merge-duplicates"
            },
            payload: JSON.stringify(payload),
            muteHttpExceptions: true
          });
        }
      } catch(e) {
        console.error("Onsite Supabase sync failed: " + e.toString());
      }
    }

    processPrintLogic(data.ssId, lastRowData, giftVal, data.stationId, data.customUuid, data.skipSupabasePrint !== undefined ? data.skipSupabasePrint : data.skipSupabase);
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
      
      // SINKRONISASI KE SUPABASE SECARA OTOMATIS
      try {
        if (SUPABASE_URL && SUPABASE_URL !== "YOUR_SUPABASE_PROJECT_URL") {
          supabaseFetch(SUPABASE_URL + "/rest/v1/tamu?ssid=eq." + ssId + "&kode=eq." + kode, {
            method: "patch",
            headers: {
              "apikey": SUPABASE_KEY,
              "Authorization": "Bearer " + SUPABASE_KEY,
              "Content-Type": "application/json"
            },
            payload: JSON.stringify({ status_undian: "WINNER - SUDAH KLAIM" }),
            muteHttpExceptions: true
          });
        }
      } catch (e) {
        console.error("Failed to sync lucky draw to Supabase: " + e.toString());
      }

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
  } else if (formData.source === "offline") {
    prefix = "OFF-";
  } else {
    if (category.includes("wedding")) prefix = "WDG-";
    else if (category.includes("birthday")) prefix = "BTH-";
    else if (category.includes("anniversary")) prefix = "ANV-";
    else if (category.includes("corporate")) prefix = "CPT-";
    else if (category.includes("gathering")) prefix = "GTH-";
  }

  const kodeUnik = prefix + randomPart;
  const baseLink = sheet.getRange("B5").getValue();
  const rawContact = String(formData.whatsapp || "");
  const isPhoneNumber = /^[+\d\s()-]{5,}$/.test(rawContact.trim());
  let cleanPhone;
  if (isPhoneNumber) {
    cleanPhone = rawContact.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.substring(1);
  } else {
    // Preserve Instagram username as-is, ensure @ prefix
    cleanPhone = rawContact.startsWith('@') ? rawContact.trim() : (rawContact.trim() ? '@' + rawContact.trim() : '');
  }
  const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?data=" + kodeUnik + "&size=400x400";
  
  const statusWA = formData.source === "offline" ? "[TAMU OFFLINE]" : "BELUM TERKIRIM";
  const statusHadiah = formData.statusHadiah || "-";
  const tandaKasih = formData.tandaKasih || 0;
  
  // Jika offline angpao, otomatis set hadir
  const statusCheckin = formData.isOfflineAngpao ? 1 : 0;
  const jamDatang = formData.isOfflineAngpao ? Utilities.formatDate(new Date(), "GMT+7", "HH:mm") : "-";
  const realHadir = formData.isOfflineAngpao ? (formData.pax || formData.rencana || 1) : 0;

  const newRow = [
    "=ROW()-" + (START_ROW - 1), nowFormatted, formData.nama, "'" + cleanPhone, 
    formData.kategori, kodeUnik, qrUrl, formData.pax || formData.rencana || 1, statusCheckin, jamDatang, 0, 
    formData.pihak, formData.alamat, realHadir, statusHadiah, statusWA, "-", tandaKasih, formData.sesi || "-"
  ];
  sheet.appendRow(newRow);
  const lastRow = sheet.getLastRow();

  // SINKRONISASI KE SUPABASE SECARA OTOMATIS
  try {
    if (SUPABASE_URL && SUPABASE_URL !== "YOUR_SUPABASE_PROJECT_URL") {
      const eventDateRaw = sheet.getRange("B2").getValue();
      const eventDate = Utilities.formatDate(parseEventDate(eventDateRaw), "GMT+7", "yyyy-MM-dd");
      
      const payload = {
        ssid: formData.ssId,
        row: lastRow,
        kode: kodeUnik,
        nama: formData.nama,
        whatsapp: cleanPhone,
        kategori: formData.kategori || "Umum",
        rencana_hadir: parseInt(formData.pax || formData.rencana) || 1,
        real_hadir: String(realHadir),
        souvenir: "tidak",
        pihak_pengundang: formData.pihak || "-",
        alamat: formData.alamat || "-",
        status_hadir: String(statusCheckin),
        status_wa: statusWA,
        status_hadiah: statusHadiah,
        tanda_kasih: tandaKasih,
        jam_datang: jamDatang,
        sesi: formData.sesi || "-",
        event_date: eventDate
      };
      
      supabaseFetch(SUPABASE_URL + "/rest/v1/tamu?on_conflict=ssid,kode", {
        method: "post",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": "Bearer " + SUPABASE_KEY,
          "Content-Type": "application/json",
          "Prefer": "resolution=merge-duplicates"
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
    }
  } catch (e) {
    console.error("Sync to Supabase failed on submit: " + e.toString());
  }

  return { status: "success", rowID: lastRow, kode: kodeUnik, triggerBlast: true, personalLink: baseLink + "?id=" + kodeUnik + "&u=" + encodeURIComponent(formData.nama) };
}

function markAsSent(ssId, row, kodeUnik) {
  const ss = getSS(ssId);
  const sheet = ss.getSheetByName(SHEET_DATA);
  const statusStr = "✅ " + Utilities.formatDate(new Date(), "GMT+7", "dd/MM HH:mm");
  
  let targetRow = row;
  let targetKode = kodeUnik;
  
  if (targetKode) {
    // Cari row berdasarkan kode
    const lastRow = sheet.getLastRow();
    if (lastRow >= START_ROW) {
      const data = sheet.getRange(START_ROW, COL_KODE_UNIK, lastRow - (START_ROW - 1), 1).getValues();
      for (let i = 0; i < data.length; i++) {
        if (String(data[i][0]).trim() === String(targetKode).trim()) {
          targetRow = i + START_ROW;
          break;
        }
      }
    }
  } else if (targetRow) {
    // Cari kode berdasarkan row
    try {
      targetKode = sheet.getRange(targetRow, COL_KODE_UNIK).getValue();
    } catch (e) {
      console.error("Failed to get kode from row: " + e.toString());
    }
  }
  
  if (!targetRow) return { status: "error", message: "Target row/kode tidak ditemukan" };
  
  sheet.getRange(targetRow, COL_STATUS_WA).setValue(statusStr);
  
  // SINKRONISASI KE SUPABASE SECARA OTOMATIS
  try {
    if (SUPABASE_URL && SUPABASE_URL !== "YOUR_SUPABASE_PROJECT_URL" && targetKode) {
      supabaseFetch(SUPABASE_URL + "/rest/v1/tamu?ssid=eq." + ssId + "&kode=eq." + targetKode, {
        method: "patch",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": "Bearer " + SUPABASE_KEY,
          "Content-Type": "application/json"
        },
        payload: JSON.stringify({ status_wa: statusStr }),
        muteHttpExceptions: true
      });
    }
  } catch (e) {
    console.error("Failed to sync markAsSent to Supabase: " + e.toString());
  }

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
    let vendors = [];
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

        // Ambil Vendor (Kolom K & L)
        const vendorRaw = rundownSheet.getRange(2, 11, Math.max(1, rdLast - 1), 2).getValues();
        vendors = vendorRaw
          .filter(r => r[0] || r[1])
          .map(row => ({
            role: String(row[0] || "").trim(),
            name: String(row[1] || "").trim()
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
      vendors,
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
function getOrGenerateRsvpLink(ssId, sheet) {
  let rsvpLink = sheet.getRange("C5").getValue();
  if (!rsvpLink || rsvpLink.toString().trim() === "") {
    try {
      const res = supabaseFetch(SUPABASE_URL + "/rest/v1/client_public_profile?ssid=eq." + ssId + "&select=subdomain", {
        method: "get",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": "Bearer " + SUPABASE_KEY
        }
      });
      const data = JSON.parse(res.getContentText());
      if (data && data.length > 0 && data[0].subdomain) {
        const subdomain = data[0].subdomain.toLowerCase().trim();
        rsvpLink = "https://" + subdomain + ".sapatamu.id/rsvp.html";
        sheet.getRange("C5").setValue(rsvpLink);
      } else {
        // Fallback: search clients table
        const res2 = supabaseFetch(SUPABASE_URL + "/rest/v1/clients?ssid=eq." + ssId + "&select=subdomain", {
          method: "get",
          headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": "Bearer " + SUPABASE_KEY
          }
        });
        const data2 = JSON.parse(res2.getContentText());
        if (data2 && data2.length > 0 && data2[0].subdomain) {
          const subdomain = data2[0].subdomain.toLowerCase().trim();
          rsvpLink = "https://" + subdomain + ".sapatamu.id/rsvp.html";
          sheet.getRange("C5").setValue(rsvpLink);
        }
      }
    } catch (e) {
      console.error("Gagal mendapatkan subdomain dari Supabase: " + e.toString());
    }
  }
  return rsvpLink;
}

function getSettings(ssId, guestId = null) {
  try {
    const ss = getSS(ssId);
    const sheet = ss.getSheetByName(SHEET_DATA);
    const configSheet = ss.getSheetByName("Config");
    const settingsSheet = ss.getSheetByName("Settings");
    
    // Cek & isi otomatis RSVP Link jika kosong
    let rsvpLink = "";
    try {
      rsvpLink = getOrGenerateRsvpLink(ssId, sheet);
    } catch (errR) {
      console.error("Gagal getOrGenerateRsvpLink: " + errR.toString());
      rsvpLink = sheet.getRange("C5").getValue() || "";
    }
    
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
        rsvpLink: rsvpLink,
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
    
    // Sync to Supabase config_welcome
    try {
      mirrorWelcomeConfigToSupabase(ssId);
    } catch (err) {
      console.error("Gagal mirror welcome config ke Supabase: " + err.toString());
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
    
    // Proteksi duplikat di Spreadsheet: cek apakah nama dan ucapan yang sama sudah ada
    const lastRow = sheet.getLastRow();
    let alreadyInSheet = false;
    if (lastRow >= 2) {
      const data = sheet.getRange(2, 2, lastRow - 1, 2).getValues(); // Kolom B (Name) dan C (Text)
      for (let i = 0; i < data.length; i++) {
        if (String(data[i][0]).trim() === String(name).trim() && String(data[i][1]).trim() === String(text).trim()) {
          alreadyInSheet = true;
          break;
        }
      }
    }
    
    if (!alreadyInSheet) {
      sheet.appendRow([new Date(), name, text]);
    }
    
    // --- INSERT KE SUPABASE wishes_queue (Dengan Proteksi Duplikat) ---
    try {
      if (typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL && SUPABASE_URL !== "YOUR_SUPABASE_PROJECT_URL") {
        // Cek apakah ucapan sudah ada di Supabase
        let alreadyInSupabase = false;
        const checkUrl = SUPABASE_URL + "/rest/v1/wishes_queue?ssid=eq." + encodeURIComponent(ssId) + 
                         "&nama=eq." + encodeURIComponent(name) + 
                         "&ucapan=eq." + encodeURIComponent(text) + 
                         "&select=id";
        const checkRes = supabaseFetch(checkUrl, {
          method: "get",
          headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": "Bearer " + SUPABASE_KEY
          },
          muteHttpExceptions: true
        });
        
        if (checkRes.getResponseCode() === 200) {
          const checkData = JSON.parse(checkRes.getContentText());
          if (checkData && checkData.length > 0) {
            alreadyInSupabase = true;
          }
        }
        
        if (!alreadyInSupabase) {
          const payload = {
            ssid: ssId,
            nama: name,
            ucapan: text
          };
          supabaseFetch(SUPABASE_URL + "/rest/v1/wishes_queue", {
            method: "post",
            headers: {
              "apikey": SUPABASE_KEY,
              "Authorization": "Bearer " + SUPABASE_KEY,
              "Content-Type": "application/json"
            },
            payload: JSON.stringify(payload),
            muteHttpExceptions: true
          });
        }
      }
    } catch(err) {
      console.error("Gagal insert ke Supabase wishes_queue: " + err.toString());
    }

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

function updateRsvp(ssId, guestId, pax, wishText) {
  try {
    const ss = getSS(ssId);
    const sheet = ss.getSheetByName(SHEET_DATA);
    if (!sheet) return { status: "error", message: "Sheet1 tidak ditemukan" };
    
    const lastRow = sheet.getLastRow();
    if (lastRow < 7) return { status: "error", message: "Data tamu kosong" };
    
    const guestData = sheet.getRange(7, 1, lastRow - 6, 12).getValues();
    const guestIndex = guestData.findIndex(row => row[5] && row[5].toString().trim() === guestId.toString().trim()); // Kolom F: Kode Unik
    
    if (guestIndex > -1) {
      // Row 7 + guestIndex. Kolom H (Rencana Hadir) adalah kolom ke-8.
      const paxVal = (pax !== undefined && pax !== null && pax !== "") ? parseInt(pax) : 0;
      sheet.getRange(7 + guestIndex, 8).setValue(paxVal);
      
      // --- SYNC WISHES KE SPREADSHEET (jika ada) ---
      if (wishText && wishText.trim()) {
        try {
          const senderName = guestData[guestIndex][2] || "Tamu Undangan"; // Kolom C: Nama
          addWish(ssId, senderName, wishText.trim());
          console.log("updateRsvp: wishes synced untuk " + senderName);
        } catch (wishErr) {
          console.error("updateRsvp: gagal sync wishes - " + wishErr.toString());
        }
      }
      
      // --- UPDATE KE SUPABASE tamu table ---
      try {
        if (typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL && SUPABASE_URL !== "YOUR_SUPABASE_PROJECT_URL") {
          const url = `${SUPABASE_URL}/rest/v1/tamu?ssid=eq.${ssId}&kode=eq.${guestId}`;
          const headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
          };
          const options = {
            method: "patch",
            headers: headers,
            payload: JSON.stringify({ rencana_hadir: paxVal }),
            muteHttpExceptions: true
          };
          supabaseFetch(url, options);
        }
      } catch (sbErr) {
        console.error("Gagal update rencana_hadir ke Supabase: " + sbErr.toString());
      }
      
      return { status: "success", message: "Rencana Hadir diupdate" + (wishText ? " & wishes disinkronkan" : "") };
    } else {
      return { status: "error", message: "Tamu tidak ditemukan" };
    }
  } catch (e) {
    return { status: "error", message: e.toString() };
  }
}

// --- SUPABASE INTEGRATION SCRIPT ---
var SUPABASE_URL = PropertiesService.getScriptProperties().getProperty('SUPABASE_URL') || 'https://llrapesaaoliyjrrrsjh.supabase.co';
var SUPABASE_KEY = PropertiesService.getScriptProperties().getProperty('SUPABASE_KEY') || 'sb_publishable_414hQDyPBaFi0fnzmIKyZw_Iwa09Q0u';

function supabaseFetch(url, options) {
  options = options || {};
  options.headers = options.headers || {};
  options.headers["User-Agent"] = "SapaTamu-Backend/1.0";
  
  // Ambil secret key dari Script Properties untuk validasi RLS (bypassing Kong browser block)
  try {
    const secretKey = PropertiesService.getScriptProperties().getProperty("SUPABASE_KEY");
    if (secretKey) {
      options.headers["x-sapatamu-secret"] = secretKey;
    }
  } catch (e) {
    console.error("Gagal membaca Script Properties SUPABASE_KEY: " + e.toString());
  }
  
  return UrlFetchApp.fetch(url, options);
}

/**
 * Mirror konfigurasi undangan (invitationData JSON) ke tabel Supabase.
 * Dipanggil dari frontend setelah save ke Google Sheet berhasil.
 * Tabel target: config_invitation (ssid TEXT PK, data JSONB, updated_at TIMESTAMPTZ)
 *
 * SQL untuk buat tabel (jalankan sekali di Supabase Dashboard > SQL Editor):
 * ──────────────────────────────────────────────────────────────────────────
 * CREATE TABLE IF NOT EXISTS config_invitation (
 *   ssid       TEXT PRIMARY KEY,
 *   data       JSONB NOT NULL DEFAULT '{}',
 *   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 * ALTER TABLE config_invitation ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Public read" ON config_invitation FOR SELECT USING (true);
 * CREATE POLICY "Anon write"  ON config_invitation FOR ALL  USING (true);
 * ──────────────────────────────────────────────────────────────────────────
 */
function mirrorInvConfigToSupabase(ssId, invitationData) {
  try {
    if (!SUPABASE_URL || SUPABASE_URL === "YOUR_SUPABASE_PROJECT_URL") return { status: "skip" };
    if (!ssId || !invitationData) return { status: "error", message: "ssId atau data kosong" };

    const url = SUPABASE_URL + "/rest/v1/config_invitation?on_conflict=ssid";
    const body = JSON.stringify({
      ssid: ssId,
      data: invitationData,
      updated_at: new Date().toISOString()
    });

    const response = supabaseFetch(url, {
      method: "post",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
      },
      payload: body,
      muteHttpExceptions: true
    });

    const code = response.getResponseCode();
    if (code >= 200 && code < 300) {
      return { status: "success" };
    } else {
      console.error("Mirror InvConfig to Supabase failed: " + response.getContentText());
      return { status: "error", code: code };
    }
  } catch (e) {
    console.error("mirrorInvConfigToSupabase exception: " + e.toString());
    return { status: "error", message: e.toString() };
  }
}

/**
 * Mirror welcome configuration data to the config_welcome table in Supabase.
 */
function mirrorWelcomeConfigToSupabase(ssId) {
  try {
    if (!SUPABASE_URL || SUPABASE_URL === "YOUR_SUPABASE_PROJECT_URL") return { status: "skip" };
    if (!ssId) return { status: "error", message: "ssId kosong" };

    const welcomeData = getWelcomeData(ssId);
    if (welcomeData.status === "error") {
      return welcomeData;
    }

    // Remove temporary/realtime fields that don't belong to static config
    delete welcomeData.status;
    delete welcomeData.latestGuest;
    delete welcomeData.log;

    const url = SUPABASE_URL + "/rest/v1/config_welcome?on_conflict=ssid";
    const body = JSON.stringify({
      ssid: ssId,
      data: welcomeData,
      updated_at: new Date().toISOString()
    });

    const response = supabaseFetch(url, {
      method: "post",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
      },
      payload: body,
      muteHttpExceptions: true
    });

    const code = response.getResponseCode();
    if (code >= 200 && code < 300) {
      return { status: "success" };
    } else {
      console.error("Mirror WelcomeConfig to Supabase failed: " + response.getContentText());
      return { status: "error", code: code };
    }
  } catch (e) {
    console.error("mirrorWelcomeConfigToSupabase exception: " + e.toString());
    return { status: "error", message: e.toString() };
  }
}

/**
 * Sinkronisasi otomatis seluruh data tamu dari Spreadsheet ke Supabase.
 * Dipicu oleh Frontend untuk inisialisasi data sebelum Hari-H.
 */
function syncSheetToSupabase(ssId) {
  try {
    if (SUPABASE_URL === "YOUR_SUPABASE_PROJECT_URL" || SUPABASE_KEY === "PASTE_NEW_SUPABASE_SERVICE_ROLE_KEY_HERE") {
      return { status: "error", message: "API Supabase belum diatur di backend. Harap masukkan URL dan Service Role Key Anda di Main.gs." };
    }

    const ss = getSS(ssId);
    const sheet = ss.getSheetByName(SHEET_DATA);
    const lastRow = sheet.getLastRow();
    
    if (lastRow < START_ROW) {
      return { status: "success", message: "Spreadsheet kosong, tidak ada data untuk disinkronkan." };
    }

    // Ambil tanggal acara dari B2 (Metadata)
    const eventDateRaw = sheet.getRange("B2").getValue();
    const eventDate = Utilities.formatDate(parseEventDate(eventDateRaw), "GMT+7", "yyyy-MM-dd");

    // Ambil data tamu
    const dataRange = sheet.getRange(START_ROW, 1, lastRow - (START_ROW - 1), 19).getValues();
    let guestList = dataRange.map((row, index) => {
      let cleanPhone = String(row[3] || "").replace(/\D/g, ''); 
      if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.substring(1);
      
      return {
        ssid: ssId,
        row: index + START_ROW,
        kode: String(row[5] || "").trim(),
        nama: String(row[2] || "").trim(),
        whatsapp: row[3] ? String(row[3]) : "",
        kategori: String(row[4] || "Umum"),
        rencana_hadir: parseInt(row[7]) || 1,
        real_hadir: String(row[13]),
        souvenir: String(row[10] || "tidak"),
        pihak_pengundang: String(row[11] || "-"),
        alamat: String(row[12] || "-"),
        status_hadir: String(row[8] || "0"),
        status_wa: String(row[15] || "BELUM TERKIRIM"),
        status_hadiah: (() => {
          let colO = String(row[14] || "").trim();
          let oTags = [];
          let upperO = colO.toUpperCase();
          if (upperO.includes("ANGPAO")) oTags.push("ANGPAO");
          if (upperO.includes("KADO")) oTags.push("KADO");
          return oTags.length > 0 ? oTags.join(" ") : "-";
        })(),
        status_undian: String(row[16] || "-").trim(),
        tanda_kasih: parseFloat(row[17]) || 0,
        sesi: String(row[18] || "-"),
        jam_datang: (() => {
          let val = row[9];
          if (val === "" || val === null || val === undefined || String(val).trim() === "-") return "-";
          if (val instanceof Date) {
            return Utilities.formatDate(val, "GMT+7", "HH:mm:ss");
          }
          let str = String(val).trim();
          if (str.includes("T") || str.includes("GMT") || str.length > 10) {
            try {
              let parsedDate = new Date(str);
              if (!isNaN(parsedDate.getTime())) {
                return Utilities.formatDate(parsedDate, "GMT+7", "HH:mm:ss");
              }
            } catch(e) {}
          }
          return str;
        })(),
        event_date: eventDate
      };
    }).filter(g => g.nama !== "" && g.kode !== "");

    // Deduplicate by guest code to prevent ON CONFLICT DO UPDATE command cannot affect row a second time
    const seen = new Set();
    guestList = guestList.filter(g => {
      if (seen.has(g.kode)) {
        return false;
      }
      seen.add(g.kode);
      return true;
    });

    if (guestList.length === 0) {
      return { status: "success", message: "Tidak ada tamu valid (nama & kode tidak kosong) untuk disinkronkan." };
    }

    // Lakukan bulk upsert ke Supabase REST API
    const url = `${SUPABASE_URL}/rest/v1/tamu?on_conflict=ssid,kode`;
    const headers = {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates"
    };

    const options = {
      method: "post",
      headers: headers,
      payload: JSON.stringify(guestList),
      muteHttpExceptions: true
    };

    const response = supabaseFetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode >= 200 && responseCode < 300) {
      return { status: "success", message: `Berhasil menyelaraskan ${guestList.length} tamu ke database cepat.` };
    } else {
      return { status: "error", message: `Supabase Error (${responseCode}): ${responseText}` };
    }

  } catch (e) {
    return { status: "error", message: "Exception: " + e.toString() };
  }
}

/**
 * Mendapatkan jumlah baris tamu di spreadsheet secara cepat.
 */
function getSpreadsheetGuestCount(ssId) {
  try {
    const ss = getSS(ssId);
    const sheet = ss.getSheetByName(SHEET_DATA);
    
    // Auto-sync metadata ke Supabase sebagai pengaman tambahan jika trigger onEdit tidak berjalan
    try {
      syncMetadataClientToSupabase(ssId, sheet);
    } catch(err) {
      console.error("Auto sync in getSpreadsheetGuestCount failed: " + err.toString());
    }

    const lastRow = sheet.getLastRow();
    
    // Hitung tamu riil (baris yang memiliki Nama di kolom C)
    let count = 0;
    if (lastRow >= START_ROW) {
      const names = sheet.getRange(START_ROW, 3, lastRow - (START_ROW - 1), 1).getValues();
      count = names.filter(r => String(r[0]).trim() !== "").length;
    }
    return { status: "success", count: count };
  } catch(e) {
    return { status: "error", message: e.toString() };
  }
}

/**
 * Sinkronisasi otomatis seluruh data ucapan (Wishes) dari Spreadsheet ke Supabase.
 * Berguna untuk migrasi data lama agar muncul di Welcome Sign baru.
 */
function syncWishesToSupabase(ssId) {
  try {
    if (typeof SUPABASE_URL === 'undefined' || SUPABASE_URL === "YOUR_SUPABASE_PROJECT_URL") {
      return { status: "error", message: "API Supabase belum diatur di backend." };
    }

    const ss = getSS(ssId);
    const sheet = ss.getSheetByName("Wishes");
    if (!sheet) {
      return { status: "success", message: "Sheet Wishes tidak ditemukan." };
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return { status: "success", message: "Tidak ada ucapan untuk disinkronkan." };
    }

    const dataRange = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
    let wishesList = dataRange.map(row => {
      let dateVal = row[0];
      if (!(dateVal instanceof Date)) {
         dateVal = new Date();
      }
      return {
        ssid: ssId,
        created_at: dateVal.toISOString(),
        nama: String(row[1] || "Tamu").trim(),
        ucapan: String(row[2] || "").trim()
      };
    }).filter(w => w.ucapan !== "");

    if (wishesList.length === 0) {
      return { status: "success", message: "Tidak ada data ucapan yang valid." };
    }

    // Ambil daftar wishes yang sudah ada di Supabase untuk mencocokkan duplikat
    const existingUrl = SUPABASE_URL + "/rest/v1/wishes_queue?ssid=eq." + encodeURIComponent(ssId) + "&select=nama,ucapan";
    const existingRes = supabaseFetch(existingUrl, {
      method: "get",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY
      },
      muteHttpExceptions: true
    });
    
    let existingKeys = new Set();
    if (existingRes.getResponseCode() === 200) {
      const existingList = JSON.parse(existingRes.getContentText());
      for (let k = 0; k < existingList.length; k++) {
        const key = String(existingList[k].nama).trim() + "|||" + String(existingList[k].ucapan).trim();
        existingKeys.add(key);
      }
    }

    // Saring hanya ucapan yang belum ada di Supabase
    wishesList = wishesList.filter(w => {
      const key = w.nama + "|||" + w.ucapan;
      return !existingKeys.has(key);
    });

    if (wishesList.length === 0) {
      return { status: "success", message: "Semua ucapan sudah tersinkronisasi di Supabase." };
    }

    // Lakukan bulk insert ke Supabase REST API
    const url = `${SUPABASE_URL}/rest/v1/wishes_queue`;
    const headers = {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json"
    };

    const options = {
      method: "post",
      headers: headers,
      payload: JSON.stringify(wishesList),
      muteHttpExceptions: true
    };

    const response = supabaseFetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode >= 200 && responseCode < 300) {
      return { status: "success", message: `Berhasil sinkronisasi ${wishesList.length} ucapan ke Supabase.` };
    } else {
      return { status: "error", message: `Supabase Error (${responseCode}): ${responseText}` };
    }

  } catch (e) {
    return { status: "error", message: "Exception: " + e.toString() };
  }
}

/**
 * Helper untuk mem-parse tanggal format bahasa Indonesia (Plain Text)
 * Contoh: "Senin, 25 Mei 2026" atau "25 Mei 2026"
 */
function parseIndonesianDateText(dateStr) {
  if (!dateStr) return null;
  let str = String(dateStr).trim();
  
  if (str.includes(",")) {
    str = str.split(",")[1].trim();
  }
  
  const parts = str.split(/\s+/);
  if (parts.length < 3) return null;
  
  const day = parseInt(parts[0]);
  const monthStr = parts[1].toLowerCase().trim();
  const year = parseInt(parts[2]);
  
  if (isNaN(day) || isNaN(year)) return null;
  
  const months = {
    'januari': 0, 'jan': 0,
    'februari': 1, 'feb': 1,
    'maret': 2, 'mar': 2,
    'april': 3, 'apr': 3,
    'mei': 4,
    'juni': 5, 'jun': 5,
    'juli': 6, 'jul': 6,
    'agustus': 7, 'agt': 7, 'agu': 7,
    'september': 8, 'sep': 8,
    'oktober': 9, 'okt': 9,
    'november': 10, 'nov': 10,
    'desember': 11, 'des': 11
  };
  
  const monthIndex = months[monthStr];
  if (monthIndex === undefined) return null;
  
  return new Date(year, monthIndex, day);
}

/**
 * Parser tanggal aman dengan fallback hari ini
 */
function parseEventDate(eventDateRaw) {
  if (!eventDateRaw) return new Date();
  
  try {
    const indDate = parseIndonesianDateText(eventDateRaw);
    if (indDate && !isNaN(indDate.getTime())) {
      return indDate;
    }
  } catch(e) {}
  
  try {
    const jsDate = new Date(eventDateRaw);
    if (jsDate && !isNaN(jsDate.getTime())) {
      return jsDate;
    }
  } catch(e) {}
  
  return new Date();
}

/**
 * Update guest info in Google Sheets & Supabase
 */
function editGuest(payload) {
  try {
    const ss = getSS(payload.ssId);
    const sheet = ss.getSheetByName(SHEET_DATA);
    const lastRow = sheet.getLastRow();
    if (lastRow < START_ROW) return { status: "error", message: "Data kosong" };
    
    // Find the row with the matching kodeUnik
    const data = sheet.getRange(START_ROW, COL_KODE_UNIK, lastRow - (START_ROW - 1), 1).getValues();
    let rowIndex = -1;
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]) === String(payload.kode)) {
        rowIndex = i + START_ROW;
        break;
      }
    }
    
    if (rowIndex === -1) return { status: "error", message: "Tamu tidak ditemukan" };
    
    // Normalize phone number
    let cleanPhone = String(payload.whatsapp || "").replace(/\D/g, ''); 
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.substring(1);
    const isInstagram = payload.whatsapp && (/[a-zA-Z]/.test(payload.whatsapp) || payload.whatsapp.trim().startsWith('@'));
    const finalPhone = isInstagram ? payload.whatsapp : cleanPhone;

    // Update columns: 3 (Nama), 4 (Whatsapp), 5 (Kategori), 8 (Pax/Rencana), 11 (Souvenir), 12 (Pihak Pengundang), 13 (Alamat), 19 (Sesi)
    sheet.getRange(rowIndex, 3).setValue(payload.nama);
    sheet.getRange(rowIndex, 4).setValue("'" + finalPhone);
    sheet.getRange(rowIndex, 5).setValue(payload.kategori);
    sheet.getRange(rowIndex, 8).setValue(payload.pax || payload.rencana || 1);
    sheet.getRange(rowIndex, 11).setValue(payload.souvenir || "tidak");  // ✅ FIX: souvenir col
    sheet.getRange(rowIndex, 12).setValue(payload.pihak);
    sheet.getRange(rowIndex, 13).setValue(payload.alamat);
    sheet.getRange(rowIndex, 19).setValue(payload.sesi || "-");

    // Also update Supabase
    try {
      if (SUPABASE_URL && SUPABASE_URL !== "YOUR_SUPABASE_PROJECT_URL") {
        const supabasePayload = {
          nama: payload.nama,
          whatsapp: finalPhone,
          kategori: payload.kategori,
          rencana_hadir: payload.pax || payload.rencana || 1,
          pihak_pengundang: payload.pihak,
          alamat: payload.alamat,
          sesi: payload.sesi || "-"
        };
        supabaseFetch(SUPABASE_URL + "/rest/v1/tamu?ssid=eq." + payload.ssId + "&kode=eq." + payload.kode, {
          method: "patch",
          headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": "Bearer " + SUPABASE_KEY,
            "Content-Type": "application/json"
          },
          payload: JSON.stringify(supabasePayload),
          muteHttpExceptions: true
        });
      }
    } catch (e) {
      console.error("Failed to update guest in Supabase: " + e.toString());
    }

    return { status: "success", message: "Data tamu berhasil diperbarui" };
  } catch (e) {
    return { status: "error", message: e.toString() };
  }
}

/**
 * Installable Trigger: Diaktifkan ketika spreadsheet diedit.
 * Mensinkronisasikan baris data tamu yang berubah langsung ke Supabase.
 */
function handleSpreadsheetEdit(e) {
  try {
    const range = e.range;
    const sheet = range.getSheet();
    const sheetName = sheet.getName();
    const ss = e.source;
    const ssId = ss.getId();
    
    if (sheetName === "Rundown" || sheetName === "Config" || sheetName === "CONFIG") {
      try {
        mirrorWelcomeConfigToSupabase(ssId);
      } catch(err) {
        console.error("Gagal mirror welcome config pada edit spreadsheet: " + err.toString());
      }
      return;
    }
    
    if (sheetName !== SHEET_DATA) return;
    
    const row = range.getRow();
    const col = range.getColumn();
    
    // Jika edit terjadi pada area Metadata (Baris 1 s/d 6, Kolom B s/d C ATAU E s/d G)
    if (row <= 6) {
      if ((col >= 2 && col <= 3) || (col >= 5 && col <= 7)) {
        syncMetadataClientToSupabase(ssId, sheet);
        try {
          mirrorWelcomeConfigToSupabase(ssId);
        } catch(err) {
          console.error("Gagal mirror welcome config pada metadata edit: " + err.toString());
        }
      }
      return;
    }
    
    if (row < START_ROW) return;
    
    // Monitor kolom penting: Nama (3), Whatsapp (4), Status Hadir (9), Souvenir (11), Pihak (12), Alamat (13), Real Hadir (14), Jenis Gift (15), WA Send API (16), Lucky Draw (17), Sesi (19)
    const monitoredCols = [3, 4, 5, 9, 11, 12, 13, 14, 15, 16, 17, 19];
    if (monitoredCols.indexOf(col) === -1) return;
    
    // Sync baris ini ke Supabase
    syncRowToSupabase(ss, row, ssId);
  } catch(err) {
    console.error("Watcher handleSpreadsheetEdit error: " + err.toString());
  }
}

/**
 * Menyinkronkan baris tamu spesifik dari spreadsheet ke Supabase.
 */
function syncRowToSupabase(ss, row, ssId) {
  const sheet = ss.getSheetByName(SHEET_DATA);
  const rowData = sheet.getRange(row, 1, 1, 19).getValues()[0];
  
  // Ambil tanggal acara dari B2 (Metadata)
  let eventDate = "";
  try {
    const eventDateRaw = sheet.getRange("B2").getValue();
    eventDate = Utilities.formatDate(parseEventDate(eventDateRaw), "GMT+7", "yyyy-MM-dd");
  } catch(e) {
    eventDate = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd");
  }
  
  let cleanPhone = String(rowData[3] || "").replace(/\D/g, ''); 
  if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.substring(1);
  
  const guestObj = {
    ssid: ssId,
    row: row,
    kode: String(rowData[5] || "").trim(),
    nama: String(rowData[2] || "").trim(),
    whatsapp: rowData[3] ? String(rowData[3]) : "",
    kategori: String(rowData[4] || "Umum"),
    rencana_hadir: parseInt(rowData[7]) || 1,
    real_hadir: String(rowData[13]),
    souvenir: String(rowData[10] || "tidak"),
    pihak_pengundang: String(rowData[11] || "-"),
    alamat: String(rowData[12] || "-"),
    status_hadir: String(rowData[8] || "0"),
    status_wa: String(rowData[15] || "BELUM TERKIRIM"),
    status_hadiah: (() => {
      let colO = String(rowData[14] || "").trim();
      let oTags = [];
      let upperO = colO.toUpperCase();
      if (upperO.includes("ANGPAO")) oTags.push("ANGPAO");
      if (upperO.includes("KADO")) oTags.push("KADO");
      return oTags.length > 0 ? oTags.join(" ") : "-";
    })(),
    status_undian: String(rowData[16] || "-").trim(),
    tanda_kasih: parseFloat(rowData[17]) || 0,
    sesi: String(rowData[18] || "-"),
    jam_datang: (() => {
      let val = rowData[9];
      if (val === "" || val === null || val === undefined || String(val).trim() === "-") return "-";
      if (val instanceof Date) {
        return Utilities.formatDate(val, "GMT+7", "HH:mm:ss");
      }
      let str = String(val).trim();
      if (str.includes("T") || str.includes("GMT") || str.length > 10) {
        try {
          let parsedDate = new Date(str);
          if (!isNaN(parsedDate.getTime())) {
            return Utilities.formatDate(parsedDate, "GMT+7", "HH:mm:ss");
          }
        } catch(e) {}
      }
      return str;
    })(),
    event_date: eventDate
  };

  if (!guestObj.kode || !guestObj.nama) return;

  if (SUPABASE_URL && SUPABASE_URL !== "YOUR_SUPABASE_PROJECT_URL") {
    const url = `${SUPABASE_URL}/rest/v1/tamu?on_conflict=ssid,kode`;
    const headers = {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates"
    };

    supabaseFetch(url, {
      method: "post",
      headers: headers,
      payload: JSON.stringify([guestObj]),
      muteHttpExceptions: true
    });
  }
}

/**
 * Jalankan fungsi ini sekali di Apps Script Editor untuk mengaktifkan Watcher Edit Otomatis.
 */
function setupAutoSyncTrigger() {
  let ss = null;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch(e) {}

  if (!ss) {
    // Jika tidak mendeteksi spreadsheet aktif (misalnya dijalankan di master/standalone script),
    // jangan melempar error agar tidak mengganggu eksekusi/deployment master script.
    Logger.log("Peringatan: Tidak mendeteksi active spreadsheet (Master/Standalone Script). Trigger watcher tidak dipasang di sini. Pemasangan trigger hanya diperlukan pada spreadsheet client masing-masing.");
    return;
  }
  
  // Gunakan ID spreadsheet secara dinamis
  const targetId = ss.getId();
  
  // Hapus trigger edit yang ada sebelumnya agar tidak ganda
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === "handleSpreadsheetEdit") {
      ScriptApp.deleteTrigger(t);
    }
  });
  
  // Buat trigger edit installable baru
  ScriptApp.newTrigger("handleSpreadsheetEdit")
    .forSpreadsheet(targetId)
    .onEdit()
    .create();
    
  Logger.log("Trigger watcher berhasil dipasang untuk spreadsheet: " + ss.getName() + " (ID: " + targetId + ")");
}

function overwriteSheetWithGuests(ssId, guests) {
  try {
    const ss = getSS(ssId);
    const sheet = ss.getSheetByName(SHEET_DATA);
    const lastRow = sheet.getLastRow();
    
    // 1. Bersihkan semua baris data dari START_ROW sampai baris terakhir
    if (lastRow >= START_ROW) {
      sheet.getRange(START_ROW, 1, lastRow - START_ROW + 1, sheet.getLastColumn()).clearContent();
    }
    
    // 2. Tulis ulang semua data tamu
    const nowFormatted = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm:ss");
    
    // Ambil event date
    let eventDate = "";
    try {
      const eventDateRaw = sheet.getRange("B2").getValue();
      eventDate = Utilities.formatDate(parseEventDate(eventDateRaw), "GMT+7", "yyyy-MM-dd");
    } catch (e) {}

    // Siapkan array data untuk bulk write (lebih cepat daripada appendRow satu per satu)
    const rowsToWrite = guests.map((g, index) => {
      const kode = String(g.kode || "").trim();
      const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?data=" + kode + "&size=400x400";
      
      return [
        "=ROW()-" + (START_ROW - 1),                   // A: No
        g.created_at ? Utilities.formatDate(new Date(g.created_at), "GMT+7", "yyyy-MM-dd HH:mm:ss") : nowFormatted, // B: Tgl Input
        g.nama || "Tanpa Nama",                         // C: Nama
        g.whatsapp || "",                               // D: No. WhatsApp
        g.kategori || "Umum",                           // E: Kategori
        kode,                                           // F: Kode
        qrUrl,                                          // G: QR Code Link
        g.rencana_hadir || 1,                           // H: Pax
        g.status_hadir || "0",                          // I: Check-in
        g.jam_datang || "-",                            // J: Jam Datang
        g.souvenir || "tidak",                          // K: Souvenir
        g.pihak_pengundang || "-",                      // L: Pihak Pengundang
        g.alamat || "-",                                // M: Alamat
        g.real_hadir || "0",                            // N: Real Hadir
        g.status_hadiah || "-",                         // O: Angpao/Gift
        g.status_wa || "BELUM TERKIRIM",                // P: Status WA
        g.status_undian || "-",                         // Q: Lucky Draw
        g.tanda_kasih || 0,                             // R: Nominal Angpao
        g.sesi || "-"                                   // S: Sesi
      ];
    });

    if (rowsToWrite.length > 0) {
      sheet.getRange(START_ROW, 1, rowsToWrite.length, 19).setValues(rowsToWrite);
    }
    
    return { status: "success", message: "Spreadsheet berhasil ditimpa dengan data backup baru (" + rowsToWrite.length + " tamu)." };
  } catch (err) {
    return { status: "error", message: "Failed to overwrite sheet: " + err.toString() };
  }
}

