/**
 * MarketplaceUpload.gs — Sapatamu Marketplace Image Upload Service
 * ================================================================
 * CARA DEPLOY:
 *   1. Buka script.google.com → buat project baru
 *   2. Paste seluruh file ini
 *   3. Isi ScriptProperties via: ⚙️ Setelan Project → Properti Skrip → + Tambah properti
 *      Key: MP_FOLDER_LOGO    → Value: <ID folder logos/>
 *      Key: MP_FOLDER_COVER   → Value: <ID folder covers/>
 *      Key: MP_FOLDER_GALLERY → Value: <ID folder gallery/>
 *      Key: MP_FOLDER_PRODUCT → Value: <ID folder products/>
 *   4. Deploy → Aplikasi web → Jalankan sebagai: Saya → Akses: Semua orang
 *
 * ENDPOINT: POST (Web App URL)
 * BODY:     { image: "<base64 WebP>", type: "logo|cover|gallery|product", vendorId: "<uuid>", filename: "<nama>.webp" }
 * RESPONSE: { status: "success", fileId: "...", proxyUrl: "https://sapatamu.id/api/mp-img?id=..." }
 *
 * HEALTH CHECK: GET (Web App URL) → tampilkan status konfigurasi folder
 */

function getFolderIds() {
  const props = PropertiesService.getScriptProperties();
  return {
    logo:    props.getProperty('MP_FOLDER_LOGO'),
    cover:   props.getProperty('MP_FOLDER_COVER'),
    gallery: props.getProperty('MP_FOLDER_GALLERY'),
    product: props.getProperty('MP_FOLDER_PRODUCT')
  };
}

const ROOT_PROXY_URL = 'https://sapatamu.id/api/mp-img';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    const base64   = data.image;
    const type     = (data.type || '').toLowerCase();
    const vendorId = data.vendorId;
    const filename = data.filename || `${vendorId}_${type}_${Date.now()}.webp`;

    if (!base64)   return errorResponse('Field "image" (base64) wajib diisi');
    if (!type)     return errorResponse('Field "type" wajib diisi: logo, cover, gallery, atau product');
    if (!vendorId) return errorResponse('Field "vendorId" wajib diisi');

    const FOLDER_IDS = getFolderIds();
    const folderId   = FOLDER_IDS[type];

    if (!folderId) return errorResponse(
      `Tipe "${type}" tidak valid atau ScriptProperties belum diisi. ` +
      `Cek: ⚙️ Setelan Project → Properti Skrip → MP_FOLDER_${type.toUpperCase()}`
    );

    const bytes = Utilities.base64Decode(base64);
    const blob  = Utilities.newBlob(bytes, 'image/webp', filename);

    const folder = DriveApp.getFolderById(folderId);
    const file   = folder.createFile(blob);

    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileId   = file.getId();
    const proxyUrl = `${ROOT_PROXY_URL}?id=${fileId}`;

    return jsonResponse({
      status:    'success',
      fileId:    fileId,
      proxyUrl:  proxyUrl,
      sizeBytes: bytes.length
    });

  } catch (err) {
    return errorResponse(err.toString());
  }
}

function doGet(e) {
  const FOLDER_IDS = getFolderIds();
  return jsonResponse({
    service:  'sapatamu-marketplace-upload',
    status:   'running',
    version:  '1.0.0',
    timezone: Session.getScriptTimeZone(),
    folders: {
      logo:    FOLDER_IDS.logo    ? '✅ configured' : '❌ NOT SET',
      cover:   FOLDER_IDS.cover   ? '✅ configured' : '❌ NOT SET',
      gallery: FOLDER_IDS.gallery ? '✅ configured' : '❌ NOT SET',
      product: FOLDER_IDS.product ? '✅ configured' : '❌ NOT SET',
    }
  });
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(message) {
  return jsonResponse({ status: 'error', message: message });
}
