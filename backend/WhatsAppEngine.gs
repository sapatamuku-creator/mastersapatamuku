/**
 * STAND-ALONE WHATSAPP ENGINE - SAPATAMU.KU
 * Deploy as Web App -> Execute as: Me -> Access: Anyone
 */

const FONNTE_TOKEN = "fRx1Canf4GYroBZZNfo7";

function doPost(e) {
  // --- DELAY 2 DETIK UNTUK SINKRONISASI DATA ONSITE ---
  Utilities.sleep(2000); 

  try {
    const data = JSON.parse(e.postData.contents);
    const ssId = data.ssId;
    const kodeUnik = data.kodeUnik;

    if (!ssId || !kodeUnik) {
      return response({"status": "error", "message": "Missing ssId or kodeUnik"});
    }

    const ss = SpreadsheetApp.openById(ssId);
    const sheet = ss.getSheetByName("Sheet1");
    
    // Gunakan flush() agar memastikan semua perubahan tertunda di spreadsheet selesai diproses
    SpreadsheetApp.flush();
    
    const values = sheet.getDataRange().getValues();

    // Mapping Kolom (Sesuaikan Indexnya)
    const COL_NAME = 2;   // Kolom C: Nama
    const COL_PHONE = 3;  // Kolom D: No WhatsApp
    const COL_KODE = 5;   // Kolom F: Kode Unik

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
      // Hilangkan karakter non-numerik dari nomor HP
      let cleanedPhone = guest.phone.toString().replace(/[^0-9]/g, '');
      
      const message = `*SELAMAT DATANG* 🌟\n\nHalo *${guest.nama}*,\n\nTerima kasih telah melakukan check-in di acara kami. \n\n📸 *Informasi:* \nFoto dokumentasi Anda dapat diakses secara berkala melalui scan QR-Code AI gallery yang tersedia selama acara berlangsung.\n\nSelamat menikmati acara!\n— *SapaTamu.ku x Knowhere Studio*`;
      
      return sendToFonnte(cleanedPhone, message);
    } else {
      return response({"status": "skipped", "message": "No phone number found for this code"});
    }

  } catch (err) {
    return response({"status": "error", "message": err.toString()});
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
  return response(JSON.parse(res.getContentText()));
}

function response(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
