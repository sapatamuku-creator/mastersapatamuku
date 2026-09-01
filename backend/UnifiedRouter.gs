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
    case 'sendOwnerOtp':
    case 'verifyOwnerOtp':
    case 'verifyOwnerPass':
      return handleCentralPost(e.parameter);
    case 'logout':
      return handleLogout(e.parameter);
    case 'syncAllInvitationConfigs':
      return handleCentralPost({ action: 'syncAllInvitationConfigs' });
    case 'runWishesWatcher':
      return handleCentralPost({ action: 'runWishesWatcher' });
    case 'setupWishesWatcher':
      return handleCentralPost({ action: 'setupWishesWatcher' });
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

    // Install onEdit trigger untuk spreadsheet client tertentu
    if (action === 'installEditTrigger') {
      if (!payload.ssId) return createResponse({ status: "error", message: "ssId required" });
      try {
        const ss = SpreadsheetApp.openById(payload.ssId);
        const existing = ScriptApp.getProjectTriggers().filter(t =>
          t.getHandlerFunction() === "handleSpreadsheetEdit" && t.getTriggerSourceId() === payload.ssId
        );
        existing.forEach(t => ScriptApp.deleteTrigger(t));
        ScriptApp.newTrigger("handleSpreadsheetEdit").forSpreadsheet(payload.ssId).onEdit().create();
        return createResponse({ status: "success", message: "onEdit trigger terpasang untuk " + ss.getName() });
      } catch (e) {
        return createResponse({ status: "error", message: "Gagal pasang trigger: " + e.toString() });
      }
    }

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
      case 'saveInvitationConfig':
      case 'resolveSubdomain':
      case 'checkSubdomain':
      case 'verifyAdminPassword':   // RBAC Guard — cek password admin di K1
      case 'uploadFile':             // Upload asset ke Drive
      case 'syncAllClients':
      case 'syncAllInvitationConfigs':
      case 'runWishesWatcher':
      case 'setupWishesWatcher':
      case 'createMidtransTransaction':
      case 'sendOTP':
      case 'sendCustomEmail':
      case 'savePendingClient':
      case 'registerAndActivate':
      case 'sendOwnerOtp':
      case 'verifyOwnerOtp':
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
      case 'selfiePost':
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
      case 'uploadMusicChunk':
        return handleMusicUploadChunk(payload);

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

    const safeFilename = `${Date.now()}_${filename}`;
    const rawUrl = pushMusicToGitHub(safeFilename, base64Content);
    if (ssId) saveMusicMeta(ssId, rawUrl, safeFilename);

    return createResponse({ status: 'success', url: rawUrl, filename: safeFilename });

  } catch (err) {
    return createResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * MUSIC UPLOAD (CHUNKED) — file besar dipecah jadi chunk ~1MB base64 agar
 * lolos hop redirect GAS (script.googleusercontent.com) yang flaky untuk
 * body besar. Chunk distaging di Drive, dirakit saat chunk terakhir tiba,
 * lalu di-upload ke GitHub dan URL-nya disimpan ke spreadsheet client.
 */
function handleMusicUploadChunk(payload) {
  const { ssId, filename, uploadId, chunkIndex, totalChunks, base64Content } = payload;
  const prefix = `_sapa_${uploadId}`;

  const cleanupChunks = () => {
    try {
      const leftovers = DriveApp.searchFiles(`title contains '${prefix}'`);
      while (leftovers.hasNext()) leftovers.next().setTrashed(true);
    } catch (e) { Logger.log('Chunk cleanup warning: ' + e); }
  };

  try {
    if (!uploadId || chunkIndex === undefined || !totalChunks || !base64Content) {
      return createResponse({ status: 'error', message: 'Data chunk tidak lengkap' });
    }
    const ci = Number(chunkIndex);
    const tc = Number(totalChunks);
    if (ci < 0 || ci >= tc) {
      return createResponse({ status: 'error', message: 'Indeks chunk tidak valid' });
    }

    // Chunk pertama: bersihkan sisa chunk lama dengan uploadId yang sama (upload retried)
    if (ci === 0) cleanupChunks();

    // Simpan chunk ke Drive (overwrite bila ada)
    const chunkName = `${prefix}_${ci}.b64`;
    const existing = DriveApp.searchFiles(`title = '${chunkName}'`);
    if (existing.hasNext()) existing.next().setTrashed(true);
    DriveApp.createFile(chunkName, base64Content, MimeType.PLAIN_TEXT);

    if (ci < tc - 1) {
      return createResponse({ status: 'progress', chunkIndex: ci });
    }

    // Chunk terakhir — rakit semua chunk menjadi base64 penuh
    let fullBase64 = "";
    for (let i = 0; i < tc; i++) {
      const it = DriveApp.searchFiles(`title = '${prefix}_${i}.b64'`);
      if (!it.hasNext()) {
        cleanupChunks();
        return createResponse({ status: 'error', message: `Chunk ${i} tidak ditemukan — upload dibatalkan` });
      }
      fullBase64 += it.next().getBlob().getDataAsString();
    }
    cleanupChunks();

    if (!filename) {
      return createResponse({ status: 'error', message: 'Missing filename' });
    }

    const safeFilename = `${Date.now()}_${filename}`;
    const rawUrl = pushMusicToGitHub(safeFilename, fullBase64);
    if (ssId) saveMusicMeta(ssId, rawUrl, safeFilename);

    return createResponse({ status: 'success', url: rawUrl, filename: safeFilename });

  } catch (err) {
    cleanupChunks();
    return createResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * PUT base64 MP3 ke GitHub repo musik. Return raw download URL.
 */
function pushMusicToGitHub(safeFilename, base64Content) {
  const GITHUB_TOKEN = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  const GITHUB_OWNER = PropertiesService.getScriptProperties().getProperty('GITHUB_OWNER') || 'sapatamuku-creator';
  const GITHUB_REPO  = PropertiesService.getScriptProperties().getProperty('GITHUB_REPO')  || 'sapatamu-music';

  if (!GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN belum diset di Script Properties.');
  }

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
    throw new Error('GitHub upload gagal: ' + (ghResult.message || JSON.stringify(ghResult)));
  }

  return ghResult.content.download_url;
}

/**
 * Auto-save URL musik + filename ke Config_Invitation sheet client.
 */
function saveMusicMeta(ssId, rawUrl, safeFilename) {
  try {
    if (!ssId) return;
    const ss = SpreadsheetApp.openById(ssId);
    const sheet = ss.getSheetByName('Config_Invitation');
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    let foundUrl = false, foundFile = false;
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === 'musicUrl')      { sheet.getRange(i+1, 2).setValue(rawUrl);       foundUrl  = true; }
      if (data[i][0] === 'musicFilename')  { sheet.getRange(i+1, 2).setValue(safeFilename); foundFile = true; }
    }
    if (!foundUrl)  sheet.appendRow(['musicUrl', rawUrl]);
    if (!foundFile) sheet.appendRow(['musicFilename', safeFilename]);
  } catch (saveErr) {
    Logger.log('Warning: Could not auto-save music URL to sheet: ' + saveErr);
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

