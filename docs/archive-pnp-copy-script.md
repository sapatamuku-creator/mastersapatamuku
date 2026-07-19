# Arsip Kode: PnP Copy Script (Lokal)

> **Lokasi fungsi di `sortir.html`:** baris 1595–1634
> **Tanggal arsip:** 20 Juli 2026

Fungsi `downloadCopyScript` bertugas menghasilkan file `.bat` (Windows) atau `.command` (macOS) yang otomatis menyalin foto pilihan klien dari folder sumber lokal ke subfolder `Selected_by_Client`.

---

## Kode Lengkap

```javascript
window.downloadCopyScript = function(platform) {
    if (!store.activeEvent || store.activeSelections.length === 0) {
        showAlert('Peringatan', 'Belum ada foto pilihan klien yang dapat diekspor.', '⚠️');
        return;
    }

    // Read source path from PnP panel input
    const sourcePath = (document.getElementById('pnp-source-path')?.value || '').trim();
    if (!sourcePath) {
        showAlert('Path Kosong', 'Harap isi path folder sumber RAW/JPG terlebih dahulu.', '📁');
        return;
    }

    // Extract clean names without extension
    const cleanNames = store.activeSelections.map(s => {
        return s.photo_name.split('.').slice(0, -1).join('.');
    });

    let scriptContent = '';
    let filename = '';

    if (platform === 'windows') {
        filename = `cull_photos_${store.activeEvent.event_slug}.bat`;
        const filesStr = cleanNames.join(' ');
        
        scriptContent = `@echo off\r\nchcp 65001 > nul\r\necho ============================================\r\necho  SapaTamu Sortir - Script Penyalinan Foto\r\necho  Mode: Wildcard (*NAMAFILE*.* — otomatis JPG + RAW)\r\necho ============================================\r\necho.\r\n\r\nset "SOURCE_DIR=${sourcePath}"\r\nset "TARGET_DIR=%SOURCE_DIR%\\Selected_by_Client"\r\nif not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"\r\n\r\nset "FILES=${filesStr}"\r\n\r\nfor %%F in (%FILES%) do (\r\n    xcopy /Y "%SOURCE_DIR%\\*%%F*.*" "%TARGET_DIR%\\"\r\n)\r\necho.\r\necho ============================================\r\necho  Ekspor Selesai! File berhasil disalin ke %TARGET_DIR%\r\necho ============================================\r\npause\r\n`;
    } else {
        filename = `cull_photos_${store.activeEvent.event_slug}.command`;
        const filesArr = cleanNames.join(' ');
        
        scriptContent = `#!/bin/bash\n# SapaTamu Sortir - Script Penyalinan Foto (macOS)\n# Mode: Wildcard (*NAMAFILE*.* — otomatis JPG + RAW)\n\nSOURCE_DIR="${sourcePath}"\nTARGET_DIR="$SOURCE_DIR/Selected_by_Client"\nmkdir -p "$TARGET_DIR"\n\necho "✅ Folder output: $TARGET_DIR"\necho ""\necho "Mencari dan menyalin ${cleanNames.length} file foto..."\necho ""\n\nCOPIED=0\nfor NAME in ${filesArr}; do\n    FOUND=0\n    for FILE in "$SOURCE_DIR"/*"$NAME"*.*; do\n        if [ -f "$FILE" ]; then\n            cp -n "$FILE" "$TARGET_DIR/"\n            echo "✅ $(basename "$FILE")"\n            FOUND=1\n            COPIED=$((COPIED+1))\n        fi\n    done\n    if [ $FOUND -eq 0 ]; then\n        echo "⚠️  Tidak ditemukan: *$NAME*"\n    fi\ndone\n\necho ""\necho "============================================"\necho "Ekspor Selesai! Total: $COPIED file disalin"\necho "Output: $TARGET_DIR"\necho "============================================"\n`;
    }

    const blob = new Blob([scriptContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
};
```

---

## Contoh Output `.bat` (Windows)

```batch
@echo off
chcp 65001 > nul
echo ============================================
echo  SapaTamu Sortir - Script Penyalinan Foto
echo  Mode: Wildcard (*NAMAFILE*.* — otomatis JPG + RAW)
echo ============================================
echo.

set "SOURCE_DIR=D:\Foto\2026\Rian-Andini-Wedding"
set "TARGET_DIR=%SOURCE_DIR%\Selected_by_Client"
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

set "FILES=_GSC2373 _GSC2391 _GSC2398 _GSC2414"

for %%F in (%FILES%) do (
    xcopy /Y "%SOURCE_DIR%\*%%F*.*" "%TARGET_DIR%\"
)

echo.
echo ============================================
echo  Ekspor Selesai! File berhasil disalin ke %TARGET_DIR%
echo ============================================
pause
```

## Contoh Output `.command` (macOS)

```bash
#!/bin/bash
# SapaTamu Sortir - Script Penyalinan Foto (macOS)
# Mode: Wildcard (*NAMAFILE*.* — otomatis JPG + RAW)

SOURCE_DIR="/Users/nama/Foto/2026/Rian-Andini-Wedding"
TARGET_DIR="$SOURCE_DIR/Selected_by_Client"
mkdir -p "$TARGET_DIR"

echo "✅ Folder output: $TARGET_DIR"
echo ""
echo "Mencari dan menyalin 4 file foto..."
echo ""

COPIED=0
for NAME in _GSC2373 _GSC2391 _GSC2398 _GSC2414; do
    FOUND=0
    for FILE in "$SOURCE_DIR"/*"$NAME"*.*; do
        if [ -f "$FILE" ]; then
            cp -n "$FILE" "$TARGET_DIR/"
            echo "✅ $(basename "$FILE")"
            FOUND=1
            COPIED=$((COPIED+1))
        fi
    done
    if [ $FOUND -eq 0 ]; then
        echo "⚠️  Tidak ditemukan: *$NAME*"
    fi
done

echo ""
echo "============================================"
echo "Ekspor Selesai! Total: $COPIED file disalin"
echo "Output: $TARGET_DIR"
echo "============================================
```

---

## Catatan Perubahan

| Tanggal | Perubahan |
|---------|-----------|
| 20 Jul 2026 | Mengganti `for /r` + `copy /Y` → `xcopy /Y` + flat `for %%F in (%FILES%)`.Wildcard: `%SOURCE_DIR%\*%%F*.*` menangkap JPG + RAW otomatis. |
