/**
 * SAPATAMU.KU - WHATSAPP ENGINE (Unified Version)
 */

function handleWAEnginePost(data) {
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

    const COL_NAME = 2;   
    const COL_PHONE = 3;  
    const COL_KODE = 5;   

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
      
      // Ambil Nama Acara & Kategori untuk Pesan Dinamis
      const eventName = sheet.getRange("B1").getValue() || "Acara Kami";
      const category = String(sheet.getRange("B6").getValue() || "wedding").toLowerCase();
      
      let greeting = "*SELAMAT DATANG* 🌟";
      let body = `Halo *${guest.nama}*,\n\nTerima kasih telah melakukan check-in di acara *${eventName}*.`;
      
      if (category.includes("wedding")) {
        greeting = "💍 *HAPPY WEDDING*";
        body = `Halo *${guest.nama}*,\n\nTerima kasih telah hadir dan memberikan doa restu di pernikahan *${eventName}*.`;
      } else if (category.includes("corporate")) {
        greeting = "🏢 *WELCOME TO EVENT*";
        body = `Halo *${guest.nama}*,\n\nSelamat datang di acara *${eventName}*. Terima kasih atas partisipasi Anda.`;
      } else if (category.includes("birthday")) {
        greeting = "🎂 *HAPPY BIRTHDAY*";
        body = `Halo *${guest.nama}*,\n\nTerima kasih telah hadir merayakan hari spesial *${eventName}*.`;
      }

      const footer = `\n\n📸 *Informasi:* \nFoto dokumentasi dapat diakses secara berkala melalui scan QR-Code AI gallery yang tersedia.\n\nSelamat menikmati acara!\n— *SapaTamu.ku x Knowhere Studio*`;
      const finalMessage = `${greeting}\n\n${body}${footer}`;
      
      return sendToFonnte(cleanedPhone, finalMessage);
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
