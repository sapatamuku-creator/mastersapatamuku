/**
 * SAPATAMU.KU - MUSIC AUTO-CLEANUP (v1.0)
 * Runs daily via Time-based Trigger.
 * Deletes uploaded MP3 files from GitHub 30 days after each client's event date.
 *
 * Setup: Jalankan setupMusicCleanupTrigger() SATU KALI di editor GAS.
 */

var CLEANUP_DELAY_DAYS = 30; // Hapus 30 hari setelah tanggal event

/**
 * Main cleanup function — dipanggil otomatis oleh trigger harian.
 * Loop semua klien di Master Spreadsheet, cek event date vs hari ini.
 */
function cleanupExpiredMusic() {
  var props = PropertiesService.getScriptProperties();
  var GITHUB_TOKEN = props.getProperty('GITHUB_TOKEN');
  var GITHUB_OWNER = props.getProperty('GITHUB_OWNER') || 'sapatamuku-creator';
  var GITHUB_REPO  = props.getProperty('GITHUB_REPO')  || 'sapatamu-music';
  var MASTER_SS_ID = props.getProperty('MASTER_SS_ID'); // ID spreadsheet master klien

  if (!GITHUB_TOKEN) { Logger.log('[Cleanup] GITHUB_TOKEN tidak ditemukan, skip.'); return; }
  if (!MASTER_SS_ID) { Logger.log('[Cleanup] MASTER_SS_ID tidak ditemukan, skip.'); return; }

  var today = new Date();
  today.setHours(0, 0, 0, 0);

  // Ambil semua ssId klien dari master spreadsheet (kolom J = ssId, sesuai arsitektur SapaTamu)
  try {
    var masterSS   = SpreadsheetApp.openById(MASTER_SS_ID);
    var masterSheet = masterSS.getSheets()[0]; // sheet pertama = data klien
    var allData    = masterSheet.getDataRange().getValues();

    var deleted = 0, checked = 0;

    for (var r = 1; r < allData.length; r++) {
      var ssId = String(allData[r][9] || '').trim(); // Kolom J (index 9)
      if (!ssId || ssId.length < 10) continue;

      checked++;
      try {
        var result = checkAndDeleteMusicForClient(ssId, today, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO);
        if (result) deleted++;
      } catch (clientErr) {
        Logger.log('[Cleanup] Error pada ssId ' + ssId + ': ' + clientErr);
      }
    }

    Logger.log('[Cleanup] Selesai. Diperiksa: ' + checked + ' klien, Dihapus: ' + deleted + ' file musik.');
  } catch (e) {
    Logger.log('[Cleanup] Gagal buka Master SS: ' + e);
  }
}

/**
 * Cek satu klien: apakah event-nya sudah lewat + 30 hari?
 * Jika ya, hapus file dari GitHub dan bersihkan spreadsheet.
 */
function checkAndDeleteMusicForClient(ssId, today, token, owner, repo) {
  var ss = SpreadsheetApp.openById(ssId);
  var sheet = ss.getSheetByName('Config_Invitation');
  if (!sheet) return false;

  var data = sheet.getDataRange().getValues();
  var config = {};
  var rowIndex = {};

  // Parse semua key-value dari Config_Invitation
  for (var i = 0; i < data.length; i++) {
    var key = String(data[i][0] || '').trim();
    if (key) {
      config[key] = data[i][1];
      rowIndex[key] = i + 1; // 1-indexed
    }
  }

  var musicFilename = String(config['musicFilename'] || '').trim();
  var musicUrl      = String(config['musicUrl']      || '').trim();

  // Tidak ada file yang diupload via sistem → skip
  if (!musicFilename || !musicUrl.includes('raw.githubusercontent.com')) return false;

  // Ambil event date dari config (coba event1_date atau event_date)
  var eventDateStr = config['event1_date'] || config['event_date'] || config['eventDate'] || '';
  if (!eventDateStr) {
    Logger.log('[Cleanup] ssId ' + ssId + ': tidak ada event_date, skip.');
    return false;
  }

  var eventDate = new Date(eventDateStr);
  if (isNaN(eventDate.getTime())) {
    Logger.log('[Cleanup] ssId ' + ssId + ': format event_date tidak valid (' + eventDateStr + '), skip.');
    return false;
  }

  // Hitung batas hapus = event date + CLEANUP_DELAY_DAYS
  var deleteAfter = new Date(eventDate);
  deleteAfter.setDate(deleteAfter.getDate() + CLEANUP_DELAY_DAYS);
  deleteAfter.setHours(0, 0, 0, 0);

  if (today < deleteAfter) {
    Logger.log('[Cleanup] ssId ' + ssId + ': belum waktunya hapus (hapus setelah ' + deleteAfter.toLocaleDateString() + ')');
    return false;
  }

  // Sudah waktunya → hapus dari GitHub
  Logger.log('[Cleanup] ssId ' + ssId + ': menghapus file ' + musicFilename + '...');
  var deleted = deleteFromGitHub(musicFilename, token, owner, repo);

  if (deleted) {
    // Bersihkan entry di spreadsheet
    if (rowIndex['musicUrl'])      sheet.getRange(rowIndex['musicUrl'],      2).clearContent();
    if (rowIndex['musicFilename']) sheet.getRange(rowIndex['musicFilename'],  2).clearContent();
    Logger.log('[Cleanup] ssId ' + ssId + ': ✅ File dihapus dan spreadsheet dibersihkan.');
    return true;
  }
  return false;
}

/**
 * Hapus satu file dari GitHub via API.
 * Perlu mendapatkan SHA file dulu sebelum bisa delete.
 */
function deleteFromGitHub(filename, token, owner, repo) {
  try {
    var filePath = 'music/' + filename;
    var apiUrl   = 'https://api.github.com/repos/' + owner + '/' + repo + '/contents/' + filePath;
    var headers  = {
      'Authorization': 'token ' + token,
      'Accept': 'application/vnd.github.v3+json'
    };

    // Step 1: GET file info untuk ambil SHA
    var getRes  = UrlFetchApp.fetch(apiUrl, { headers: headers, muteHttpExceptions: true });
    var getJson = JSON.parse(getRes.getContentText());
    if (!getJson.sha) {
      Logger.log('[Cleanup] File tidak ditemukan di GitHub: ' + filePath + ' (mungkin sudah terhapus)');
      return true; // Anggap sudah terhapus
    }

    // Step 2: DELETE dengan SHA
    var delRes = UrlFetchApp.fetch(apiUrl, {
      method: 'DELETE',
      headers: Object.assign({}, headers, { 'Content-Type': 'application/json' }),
      payload: JSON.stringify({
        message: 'Auto-cleanup: event expired > ' + CLEANUP_DELAY_DAYS + ' days ago',
        sha: getJson.sha
      }),
      muteHttpExceptions: true
    });

    var delStatus = delRes.getResponseCode();
    Logger.log('[Cleanup] GitHub DELETE status: ' + delStatus + ' untuk ' + filePath);
    return (delStatus === 200);

  } catch (e) {
    Logger.log('[Cleanup] Error delete GitHub: ' + e);
    return false;
  }
}

/**
 * ═══════════════════════════════════════════════
 * JALANKAN FUNGSI INI SATU KALI untuk setup trigger harian otomatis.
 * ═══════════════════════════════════════════════
 */
function setupMusicCleanupTrigger() {
  // Hapus trigger lama jika ada (cegah duplikat)
  var triggers = ScriptApp.getProjectTriggers();
  for (var t = 0; t < triggers.length; t++) {
    if (triggers[t].getHandlerFunction() === 'cleanupExpiredMusic') {
      ScriptApp.deleteTrigger(triggers[t]);
      Logger.log('Trigger lama dihapus.');
    }
  }

  // Buat trigger baru: jalan setiap hari jam 01:00 WIB (UTC+7 → UTC 18:00 hari sebelumnya)
  ScriptApp.newTrigger('cleanupExpiredMusic')
    .timeBased()
    .everyDays(1)
    .atHour(18) // UTC 18:00 = WIB 01:00
    .create();

  // Pastikan MASTER_SS_ID sudah diset
  var masterId = PropertiesService.getScriptProperties().getProperty('MASTER_SS_ID');
  Logger.log('✅ Trigger cleanup musik harian berhasil dibuat!');
  Logger.log('MASTER_SS_ID saat ini: ' + (masterId || '⚠️ BELUM DISET — tambahkan di Script Properties!'));
}
