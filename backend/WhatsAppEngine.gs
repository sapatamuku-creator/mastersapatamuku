/**
 * STAND-ALONE WHATSAPP ENGINE - SAPATAMU.KU
 * (Fonnte Token diambil dari CentralBackend secara Global)
 */

function handleWAEnginePost(data) {
  // --- DELAY 2 DETIK UNTUK SINKRONISASI DATA ONSITE ---
  Utilities.sleep(2000); 

  try {
    const ssId = data.ssId;
    const kodeUnik = data.kodeUnik;

    if (!ssId || !kodeUnik) {
      return createResponse({"status": "error", "message": "Missing ssId or kodeUnik"});
    }

    const ss = SpreadsheetApp.openById(ssId);
    const sheet = ss.getSheetByName("Sheet1");
    
    SpreadsheetApp.flush();
    const values = sheet.getDataRange().getValues();

    const COL_NAME = 2;   // Kolom C
    const COL_PHONE = 3;  // Kolom D
    const COL_KODE = 5;   // Kolom F

    let guest = null;
    for (let i = 1; i < values.length; i++) {
      if (values[i][COL_KODE].toString() === kodeUnik.toString()) {
        guest = {
          nama: values[i][COL_NAME],
          phone: values[i][COL_PHONE]
        };
        break;
      }
    }

    if (guest && guest.phone) {
      let cleanedPhone = guest.phone.toString().replace(/[^0-9]/g, '');
      const message = `*SELAMAT DATANG* 🌟\n\nHalo *${guest.nama}*,\n\nTerima kasih telah melakukan check-in di acara kami. \n\n📸 *Informasi:* \nFoto dokumentasi Anda dapat diakses secara berkala melalui scan QR-Code AI gallery yang tersedia selama acara berlangsung.\n\nSelamat menikmati acara!\n— *SapaTamu.ku x Knowhere Studio*`;
      return sendToFonnte(cleanedPhone, message);
    } else {
      return createResponse({"status": "skipped", "message": "No phone number found for this code"});
    }
  } catch (err) {
    return createResponse({"status": "error", "message": err.toString()});
  }
}

function sendToFonnte(target, message) {
  const url = "https://api.fonnte.com/send";
  const payload = {
    target: target,
    message: message,
    countryCode: "62"
  };
  const options = {
    method: "post",
    headers: { "Authorization": FONNTE_TOKEN },
    payload: payload,
    muteHttpExceptions: true
  };
  const res = UrlFetchApp.fetch(url, options);
  return createResponse(JSON.parse(res.getContentText()));
}
