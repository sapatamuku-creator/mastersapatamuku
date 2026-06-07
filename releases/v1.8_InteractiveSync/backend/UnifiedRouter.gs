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
    case 'getSettings':
    case 'getWishes':
    case 'updateRsvp':
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
      case 'checkSubdomain':
      case 'verifyAdminPassword':   // RBAC Guard — cek password admin di K1
      case 'uploadFile':             // Upload asset ke Drive
      case 'syncAllClients':
      case 'createMidtransTransaction':
      case 'sendOTP':
      case 'savePendingClient':
      case 'registerAndActivate':
      case 'getOwnerClients':
      case 'updateOwnerClient':
      case 'deleteOwnerClient':
      case 'syncFromSupabase':
      case 'upgradePackage':
      case 'checkSlot':
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
      case 'markDuplicateBlast':
        return handleWAFormPost(payload);

      // Music Upload to GitHub
      case 'uploadMusic':
        return handleMusicUpload(payload);

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
 * MUSIC UPLOAD — Uploads MP3 to GitHub repo, saves URL to client spreadsheet
 * Requires Script Property: GITHUB_TOKEN (Personal Access Token, scope: repo)
 */
function handleMusicUpload(payload) {
  try {
    const { ssId, filename, base64Content } = payload;
    if (!base64Content || !filename) {
      return createResponse({ status: 'error', message: 'Missing file data' });
    }

    const GITHUB_TOKEN = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
    const GITHUB_OWNER = PropertiesService.getScriptProperties().getProperty('GITHUB_OWNER') || 'opick8c';
    const GITHUB_REPO  = PropertiesService.getScriptProperties().getProperty('GITHUB_REPO')  || 'sapatamu-music';

    if (!GITHUB_TOKEN) {
      return createResponse({ status: 'error', message: 'GITHUB_TOKEN belum diset di Script Properties.' });
    }

    // Unique filename: timestamp + original name
    const safeFilename = `${Date.now()}_${filename}`;
    const filePath = `music/${safeFilename}`;
    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;

    const ghRes = UrlFetchApp.fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      payload: JSON.stringify({
        message: `Upload music: ${safeFilename}`,
        content: base64Content
      }),
      muteHttpExceptions: true
    });

    const ghResult = JSON.parse(ghRes.getContentText());
    if (!ghResult.content || !ghResult.content.download_url) {
      return createResponse({ status: 'error', message: 'GitHub upload gagal: ' + (ghResult.message || JSON.stringify(ghResult)) });
    }

    const rawUrl = ghResult.content.download_url;

    // Auto-save URL + filename to client spreadsheet (Config_Invitation sheet)
    if (ssId) {
      try {
        const ss = SpreadsheetApp.openById(ssId);
        let sheet = ss.getSheetByName('Config_Invitation');
        if (sheet) {
          const data = sheet.getDataRange().getValues();
          let foundUrl = false, foundFile = false;
          for (let i = 0; i < data.length; i++) {
            if (data[i][0] === 'musicUrl')      { sheet.getRange(i+1, 2).setValue(rawUrl);       foundUrl  = true; }
            if (data[i][0] === 'musicFilename')  { sheet.getRange(i+1, 2).setValue(safeFilename); foundFile = true; }
          }
          if (!foundUrl)  sheet.appendRow(['musicUrl', rawUrl]);
          if (!foundFile) sheet.appendRow(['musicFilename', safeFilename]);
        }
      } catch(saveErr) {
        Logger.log('Warning: Could not auto-save music URL to sheet: ' + saveErr);
      }
    }

    return createResponse({ status: 'success', url: rawUrl, filename: safeFilename });

  } catch (err) {
    return createResponse({ status: 'error', message: err.toString() });
  }
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

