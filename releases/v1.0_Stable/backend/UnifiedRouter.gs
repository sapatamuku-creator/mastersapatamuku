/**
 * SAPATAMU.KU - UNIFIED ROUTER (V10.2)
 * Central entry point for all frontend modules.
 */

function doGet(e) {
  const action = e.parameter.action;
  
  // Routing based on action parameter
  switch(action) {
    case 'getAnalytics':
      return handleAnalyticsGet(e);
    case 'getWelcome':
      return handleWelcomeGet(e);
    case 'getWAForm':
      return handleWAFormGet(e);
    case 'resolveSubdomain':
      return handleCentralPost(e.parameter);
    case 'logout':
      return handleLogout(e.parameter);
    case 'getMasterData':
    case 'getMasterDataAngpao':
    case 'getPrintQueue':
      return handleMainGet(e);
    default:
      // Handle legacy URL params (row & ssId) for check-in via WhatsApp links
      if (e.parameter.row && e.parameter.ssId) {
        return handleMainGet(e);
      }
      return createResponse({ status: "success", message: "SapaTamu.Ku API Ready - v10.2 [2026-05-14]" });
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createResponse({ status: "error", message: "No payload received" });
    }

    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    // Routing based on action field in JSON payload
    switch(action) {
      // Auth & Management (CentralBackend.gs)
      case 'login':
      case 'logout':
      case 'register':
      case 'copyMaster':
      case 'forgotPassword':
      case 'changePassword':
      case 'updateClientData':
      case 'resolveSubdomain':
        return handleCentralPost(payload);

      // Media & Selfie (SelfieCheckin.gs)
      case 'selfie':
      case 'uploadSelfie':
        return handleSelfiePost(payload);

      // Messaging (WhatsAppEngine.gs)
      case 'sendWA':
      case 'broadcastWA':
        return handleWAEnginePost(payload);

      // WA Form Submission (WhatsAppFormulir.gs)
      case 'submitWAForm':
      case 'saveMasterToken':
      case 'updateMasterToken':
      case 'remoteFonnte':
      case 'toggleStatus':
      case 'executeFonnteBlast':
        return handleWAFormPost(payload);

      // Core Guestbook Actions (Main.gs)
      default:
        return handleMainPost(payload);
    }
  } catch (error) {
    return createResponse({ status: "error", message: "Router Error: " + error.toString() });
  }
}

/**
 * Standardized JSON response helper
 */
function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * JALANKAN FUNGSI INI DI EDITOR (KLIK RUN) UNTUK MEMBERIKAN IZIN AKSES
 */
function triggerAuth() {
  Logger.log("Memicu izin akses Drive secara penuh...");
  DriveApp.getRootFolder();
  // Memaksa Google mendeteksi kebutuhan izin menulis/duplikat
  const dummy = DriveApp.createFile("DUMMY_AUTH_TEST", "Pemicu Izin", MimeType.PLAIN_TEXT);
  dummy.setTrashed(true); // Langsung hapus
  SpreadsheetApp.getActiveSpreadsheet();
  UrlFetchApp.fetch("https://google.com");
  Logger.log("Izin DRIVE dan SPREADSHEET berhasil dipicu!");
}

