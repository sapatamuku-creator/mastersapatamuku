/**
 * BACKEND SAPATAMU.KU - ANALYTICS ENGINE (Optimized)
 * Update: 2026-05-04
 */

function handleAnalyticsGet(e) {
  try {
    // 1. GET SPREADSHEET ID (Prioritaskan parameter URL)
    const ssId = e.parameter.ssId || "1l4NNvzl-9GpVqoVWlIha9POQLKGzSA8ByF1dTLp6SYc";
    const ss = SpreadsheetApp.openById(ssId);
    const sheet = ss.getSheetByName("Sheet1"); 
    
    if (!sheet) throw new Error("Sheet1 tidak ditemukan.");

    const displayData = sheet.getDataRange().getDisplayValues();
    const rawData = sheet.getDataRange().getValues();
    const headerRow = displayData[0];
    
    // 2. AMBIL VALUE HEADER UNTUK SESI (E5, F5, G5 diwakili oleh indeks kolom terkait di baris header)
    // Sesuai logika Anda: S1=Col E(4), S2=Col F(5), S3=Col G(6)
    const s1Value = String(headerRow[4] || "").trim(); 
    const s2Value = String(headerRow[5] || "").trim(); 
    const s3Value = String(headerRow[6] || "").trim(); 

    // Konversi jam mulai ke menit untuk logika Boundary
    const s2Start = timeToMinutes(cleanTimeText(s2Value));
    const s3Start = timeToMinutes(cleanTimeText(s3Value));

    // 3. DEFINISI INDEKS KOLOM (0-indexed)
    const idxKategori = 4;   // Kolom E
    const idxRSVPValue = 7;  // Kolom H
    const idxCheckIn = 8;    // Kolom I
    const idxTime = 9;       // Kolom J
    const idxHost = 11;      // Kolom L
    const idxAlamat = 12;    // Kolom M
    const idxRealValue = 13; // Kolom N
    const idxSesi = 18;      // Kolom S

    let stats = {
      totalReal: 0,
      totalRSVP: 0,
      categories: {},
      hosts: {},
      addresses: {},
      flowRaw: [] 
    };

    for (let i = 1; i < rawData.length; i++) {
      let rowRaw = rawData[i];
      let rowDisplay = displayData[i];
      
      let valH = parseFloat(rowRaw[idxRSVPValue]) || 0; 
      let valN = parseFloat(rowRaw[idxRealValue]) || 0;
      let isCheckedIn = String(rowDisplay[idxCheckIn] || "0").trim();
      
      // Mapping Sesi Asal (Berdasarkan undangan)
      let sesiRaw = String(rowDisplay[idxSesi] || "").trim();
      let sesiAsalConverted = "TANPA SESI";
      if (sesiRaw === s1Value) sesiAsalConverted = "SESI 1";
      else if (sesiRaw === s2Value) sesiAsalConverted = "SESI 2";
      else if (sesiRaw === s3Value) sesiAsalConverted = "SESI 3";

      stats.totalRSVP += valH;

      // Hanya proses data jika status Check-In = 1
      if (isCheckedIn === "1") {
        stats.totalReal += valN;

        // Grouping Kategori & Host
        let catName = String(rowDisplay[idxKategori] || "UMUM").toUpperCase();
        let hostName = String(rowDisplay[idxHost] || "LAINNYA").toUpperCase();
        stats.categories[catName] = (stats.categories[catName] || 0) + valN;
        stats.hosts[hostName] = (stats.hosts[hostName] || 0) + valN;

        // Grouping Alamat (Ambil kata pertama/Kota saja agar dashboard tidak penuh)
        let rawAddr = String(rowDisplay[idxAlamat] || "LUAR KOTA").toUpperCase();
        let simpleAddr = rawAddr.split(',')[0].split(' ').slice(0,2).join(' '); // Ambil 2 kata pertama
        stats.addresses[simpleAddr] = (stats.addresses[simpleAddr] || 0) + valN;

        // Logika Kedatangan Riil (Flow Monitoring)
        let formattedTime = cleanTimeText(rowDisplay[idxTime]);
        let checkMin = timeToMinutes(formattedTime);

        let arrivalSesi = "SESI 3";
        if (checkMin < s2Start) {
          arrivalSesi = "SESI 1";
        } else if (checkMin >= s2Start && checkMin < s3Start) {
          arrivalSesi = "SESI 2";
        }

        // Deteksi Tamu Datang di Sesi yang Salah
        let isIntruder = (sesiAsalConverted !== arrivalSesi && sesiAsalConverted !== "TANPA SESI");

        stats.flowRaw.push({
          time: formattedTime,
          count: valN,
          sesi: sesiAsalConverted,
          arrivalSesi: arrivalSesi, 
          isIntruder: isIntruder    
        });
      }
    }

    const output = {
      totalReal: stats.totalReal,
      totalRSVP: stats.totalRSVP,
      percentage: stats.totalRSVP > 0 ? ((stats.totalReal / stats.totalRSVP) * 100).toFixed(1) : 0,
      catLabels: Object.keys(stats.categories),
      catValues: Object.values(stats.categories),
      hostLabels: Object.keys(stats.hosts),
      hostValues: Object.values(stats.hosts),
      addrLabels: Object.keys(stats.addresses),
      addrValues: Object.values(stats.addresses),
      flowRaw: stats.flowRaw 
    };

    return createResponse(output);

  } catch (error) {
    return createResponse({ "error": error.message });
  }
}

function cleanTimeText(timeStr) {
  if (!timeStr) return "00:00";
  let cleaned = String(timeStr).replace(/[^0-9.:]/g, '').replace(/\./g, ':');
  let match = cleaned.match(/\d{1,2}:\d{2}/);
  return match ? match[0].padStart(5, '0') : "00:00";
}

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  let p = timeStr.split(':');
  return (parseInt(p[0]) * 60) + (parseInt(p[1]) || 0);
}
