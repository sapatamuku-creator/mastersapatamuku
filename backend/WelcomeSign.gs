/**
 * BACKEND SAPATAMU.KU - WELCOME SIGN ENGINE (Dynamic ssId Version)
 */

function handleWelcomeGet(e) {
  const ssId = e.parameter.ssId || "1l4NNvzl-9GpVqoVWlIha9POQLKGzSA8ByF1dTLp6SYc";
  const action = e.parameter.action;

  // Handler untuk request data (Fetch dari Frontend)
  if (action === "getWelcomeData") {
    try {
      const data = getWelcomeData(ssId); 
      return createResponse(data);
    } catch (err) {
      return createResponse({ error: err.toString() });
    }
  }
  
  // Handler untuk memuat halaman HTML
  try {
    return HtmlService.createTemplateFromFile('Welcome')
        .evaluate()
        .setTitle('SapaTamu.ku - Welcome Sign')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    return ContentService.createTextOutput("Error loading Welcome.html: " + err.toString());
  }
}

/**
 * Mengolah data antrian dan menyinkronkan data antar Sheet secara dinamis
 */
function getWelcomeData(ssId) {
  const ss = SpreadsheetApp.openById(ssId);
  const sheetUtama = ss.getSheetByName("Sheet1");
  const sheetRundown = ss.getSheetByName("Rundown");
  
  if (!sheetUtama || !sheetRundown) throw new Error("Sheet tidak ditemukan");

  const config = sheetUtama.getRange("B1:B2").getValues();
  const dataTamu = sheetUtama.getDataRange().getValues();
  
  // Helper Format Waktu (HH:mm)
  const formatTime = (timeVal) => {
    if (!timeVal) return "";
    if (timeVal instanceof Date) return Utilities.formatDate(timeVal, Session.getScriptTimeZone(), "HH:mm");
    const match = timeVal.toString().match(/\d{2}:\d{2}/);
    return match ? match[0] : timeVal.toString().substring(0, 5);
  };

  // --- 1. PROSES SINKRONISASI KE ANTRIAN (RUNDOWN E:J) ---
  const lastRowRundown = sheetRundown.getLastRow();
  const rangeAntrian = sheetRundown.getRange("E1:J" + (lastRowRundown > 0 ? lastRowRundown : 1));
  const dataAntrian = rangeAntrian.getValues();
  const existingCodes = dataAntrian.map(r => r[0].toString());

  for (let i = 1; i < dataTamu.length; i++) {
    const kodeUnik = dataTamu[i][5] ? dataTamu[i][5].toString() : ""; // Kolom F
    const saklar = dataTamu[i][8]; // Kolom I (Status Check-in)
    
    if (saklar == 1 && kodeUnik !== "" && !existingCodes.includes(kodeUnik)) {
      sheetRundown.appendRow([
        "", "", "", "", // Lewati kolom A-D (Rundown Events)
        kodeUnik,       // Kolom E
        dataTamu[i][2], // Kolom F: Nama
        dataTamu[i][9], // Kolom G: Jam Datang
        "waiting",      // Kolom H: Status
        dataTamu[i][4], // Kolom I: Kategori
        dataTamu[i][12] // Kolom J: Alamat
      ]);
    }
  }

  // --- 2. LOGIKA TRANSISI STATUS PADA KOLOM H (WAITING -> DISPLAY -> DONE) ---
  const lastRow = sheetRundown.getLastRow();
  if (lastRow > 1) {
    const updatedAntrian = sheetRundown.getRange("E2:J" + lastRow).getValues();
    const waitingList = updatedAntrian.filter(r => r[3] === "waiting");
    
    if (waitingList.length > 0) {
      for (let j = 0; j < updatedAntrian.length; j++) {
        if (updatedAntrian[j][3] === "display") {
          sheetRundown.getRange(j + 2, 8).setValue("done");
        }
      }
      const indexWaiting = updatedAntrian.findIndex(r => r[3] === "waiting");
      if (indexWaiting !== -1) {
        sheetRundown.getRange(indexWaiting + 2, 8).setValue("display");
      }
    }
  }

  // Ambil ulang data final setelah transisi status
  const finalLastRow = sheetRundown.getLastRow();
  const finalAntrian = finalLastRow > 1 ? sheetRundown.getRange("E2:J" + finalLastRow).getValues() : [];
  const currentDisplay = finalAntrian.filter(r => r[3] === "display")[0] || [];
  const totalWaiting = finalAntrian.filter(r => r[3] === "waiting").length;

  // --- 3. HITUNG DURASI DINAMIS ---
  let displayInterval = 12000; 
  if (totalWaiting >= 5) displayInterval = 4000; 
  else if (totalWaiting >= 3) displayInterval = 7000;

  // --- 4. LOG HISTORY (RUNNING TEXT) ---
  const logHistory = finalAntrian
    .filter(r => r[3] === "done" || r[3] === "display")
    .sort((a, b) => {
      const timeA = new Date('1970/01/01 ' + formatTime(a[2])).getTime();
      const timeB = new Date('1970/01/01 ' + formatTime(b[2])).getTime();
      return timeB - timeA;
    })
    .slice(0, 15) // Batasi 15 tamu terakhir
    .map(r => `${r[1].toString().toUpperCase()} [${formatTime(r[2])}]`)
    .join("   •   ");

  // --- 5. DATA RUNDOWN ACARA ---
  const rundownRaw = sheetRundown.getRange("A2:C" + Math.max(sheetRundown.getLastRow(), 2)).getValues();

  return {
    weddingName: config[0][0] || "The Wedding Of",
    weddingDate: config[1][0] || "",
    displayDuration: displayInterval,
    latestGuest: {
      nama: currentDisplay[1] || "SELAMAT DATANG",
      jam: currentDisplay[2] ? formatTime(currentDisplay[2]) : "--:--",
      kategori: currentDisplay[4] || "Tamu",
      alamat: currentDisplay[5] || ""
    },
    rundown: rundownRaw.filter(r => r[0] !== "").map(row => ({
      displayTime: row[0].toString(),
      eventName: row[1].toString(),
      syncTime: formatTime(row[2])
    })),
    log: logHistory || "MENUNGGU TAMU..."
  };
}
