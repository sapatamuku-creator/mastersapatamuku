# Arsip Kode: Penerjemah Indeks Manual

> **Lokasi fungsi di `sortir.html`:** baris 2078–2142
> **Tanggal arsip:** 20 Juli 2026

Fungsi `downloadManualScript` bertugas menghasilkan file `.bat` (Windows) atau `.command` (macOS) dari hasil parsing teks WhatsApp klien melalui wizard 3 langkah.

---

## Kode Lengkap

```javascript
window.downloadManualScript = function(platform) {
    const src  = (document.getElementById('manual-source-path')?.value || '').trim();
    const dest = (document.getElementById('manual-dest-path')?.value || '').trim();
    const sub  = (document.getElementById('manual-subfolder-name')?.value || 'Selected_by_Client').trim();
    const outputBase = dest || src;

    if (!src) { showAlert('Path Kosong', 'Harap isi path folder sumber terlebih dahulu.', '📁'); return; }
    if (wizard.files.length === 0) { showAlert('Tidak Ada File', 'Proses dulu daftar indeks klien di Langkah 1.', '📋'); return; }

    const fileList = wizard.files;

    if (platform === 'windows') {
        const outDir = `${outputBase}\\${sub}`;
        // Use wildcard search: for /r finds *FILENAME* regardless of prefix _ or extension
        let bat = `@echo off\r\nchcp 65001 > nul\r\necho ============================================\r\necho  SapaTamu Sortir - Script Penyalinan Foto\r\necho  Mode: Wildcard (prefix _ dan ekstensi otomatis)\r\necho ============================================\r\necho.\r\n\r\nset "SOURCE=${src}"\r\nset "DEST=${outDir}"\r\nset COPIED=0\r\nset SKIPPED=0\r\n\r\nif not exist "%DEST%" (\r\n    mkdir "%DEST%"\r\n    echo [OK] Folder output dibuat: %DEST%\r\n) else (\r\n    echo [INFO] Folder output sudah ada.\r\n)\r\necho.\r\necho Mencari dan menyalin ${fileList.length} indeks file...\r\necho.\r\n\r\n`;

        fileList.forEach(f => {
            // for /r loops through all matching files (catches _GSC8846.NEF, _GSC8846.JPG, etc.)
            bat += `set "FOUND_${f}=0"\r\n`;
            bat += `for /r "%SOURCE%" %%F in (*${f}*) do (\r\n`;
            bat += `    copy /Y "%%F" "%DEST%\\%%~nxF" > nul\r\n`;
            bat += `    echo [COPIED] %%~nxF\r\n`;
            bat += `    set "FOUND_${f}=1"\r\n`;
            bat += `    set /a COPIED+=1\r\n`;
            bat += `)\r\n`;
            bat += `if "%FOUND_${f}%"=="0" (\r\n    echo [SKIP]   *${f}* tidak ditemukan\r\n    set /a SKIPPED+=1\r\n)\r\n\r\n`;
        });

        bat += `\r\necho.\r\necho ============================================\r\necho  Selesai! Disalin: %COPIED% file, Tidak ditemukan: %SKIPPED%\r\necho  Output: %DEST%\r\necho ============================================\r\npause\r\n`;

        const blob = new Blob([bat], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `sortir_manual_${sub}.bat`;
        a.click();

    } else {
        const outDir = `${outputBase}/${sub}`;
        // macOS: use find -name "*FILENAME*" to catch _GSC8846.NEF etc.
        let cmd = `#!/bin/bash\n# SapaTamu Sortir - Script Penyalinan Foto (macOS)\n# Mode: Wildcard (*FILENAME*) — menangkap prefix _ dan semua ekstensi\n\nSOURCE="${src}"\nDEST="${outDir}"\nCOPIED=0\nSKIPPED=0\n\nmkdir -p "$DEST"\necho "✅ Folder output: $DEST"\necho ""\necho "Mencari dan menyalin ${fileList.length} indeks file..."\necho ""\n\n`;

        fileList.forEach(f => {
            cmd += `# --- ${f} ---\n`;
            cmd += `MATCHES=$(find "$SOURCE" -maxdepth 1 -name "*${f}*" 2>/dev/null)\n`;
            cmd += `if [ -n "$MATCHES" ]; then\n`;
            cmd += `  while IFS= read -r FILE; do\n`;
            cmd += `    FNAME=$(basename "$FILE")\n`;
            cmd += `    cp -n "$FILE" "$DEST/$FNAME" && echo "✅ $FNAME" || echo "❌ Gagal: $FNAME"\n`;
            cmd += `    COPIED=$((COPIED+1))\n`;
            cmd += `  done <<< "$MATCHES"\n`;
            cmd += `else\n`;
            cmd += `  echo "⚠️  Tidak ditemukan: *${f}*"\n`;
            cmd += `  SKIPPED=$((SKIPPED+1))\n`;
            cmd += `fi\n\n`;
        });

        cmd += `\necho ""\necho "============================================"\necho "Selesai! Disalin: $COPIED file, Tidak ditemukan: $SKIPPED"\necho "Output: $DEST"\necho "============================================"\n`;

        const blob = new Blob([cmd], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `sortir_manual_${sub}.command`;
        a.click();
    }
};
```

---

## Contoh Output `.bat` (Windows)

```batch
@echo off
chcp 65001 > nul
echo ============================================
echo  SapaTamu Sortir - Script Penyalinan Foto
echo  Mode: Wildcard (prefix _ dan ekstensi otomatis)
echo ============================================
echo.

set "SOURCE=D:\Foto\2026\Rian-Andini-Wedding"
set "DEST=D:\Foto\2026\Rian-Andini-Wedding\Selected_by_Client"
set COPIED=0
set SKIPPED=0

if not exist "%DEST%" (
    mkdir "%DEST%"
    echo [OK] Folder output dibuat: %DEST%
) else (
    echo [INFO] Folder output sudah ada.
)
echo.
echo Mencari dan menyalin 4 indeks file...
echo.

set "FOUND__GSC2373=0"
for /r "%SOURCE%" %%F in (*_GSC2373*) do (
    copy /Y "%%F" "%DEST%\%%~nxF" > nul
    echo [COPIED] %%~nxF
    set "FOUND__GSC2373=1"
    set /a COPIED+=1
)
if "%FOUND__GSC2373%"=="0" (
    echo [SKIP]   *_GSC2373* tidak ditemukan
    set /a SKIPPED+=1
)

set "FOUND__GSC2391=0"
for /r "%SOURCE%" %%F in (*_GSC2391*) do (
    copy /Y "%%F" "%DEST%\%%~nxF" > nul
    echo [COPIED] %%~nxF
    set "FOUND__GSC2391=1"
    set /a COPIED+=1
)
if "%FOUND__GSC2391%"=="0" (
    echo [SKIP]   *_GSC2391* tidak ditemukan
    set /a SKIPPED+=1
)

echo.
echo ============================================
echo  Selesai! Disalin: %COPIED% file, Tidak ditemukan: %SKIPPED%
echo  Output: %DEST%
echo ============================================
pause
```

## Contoh Output `.command` (macOS)

```bash
#!/bin/bash
# SapaTamu Sortir - Script Penyalinan Foto (macOS)
# Mode: Wildcard (*FILENAME*) — menangkap prefix _ dan semua ekstensi

SOURCE="/Users/nama/Foto/2026/Rian-Andini-Wedding"
DEST="/Users/nama/Foto/2026/Rian-Andini-Wedding/Selected_by_Client"
COPIED=0
SKIPPED=0

mkdir -p "$DEST"
echo "✅ Folder output: $DEST"
echo ""
echo "Mencari dan menyalin 4 indeks file..."
echo ""

# --- _GSC2373 ---
MATCHES=$(find "$SOURCE" -maxdepth 1 -name "*_GSC2373*" 2>/dev/null)
if [ -n "$MATCHES" ]; then
  while IFS= read -r FILE; do
    FNAME=$(basename "$FILE")
    cp -n "$FILE" "$DEST/$FNAME" && echo "✅ $FNAME" || echo "❌ Gagal: $FNAME"
    COPIED=$((COPIED+1))
  done <<< "$MATCHES"
else
  echo "⚠️  Tidak ditemukan: *_GSC2373*"
  SKIPPED=$((SKIPPED+1))
fi

# --- _GSC2391 ---
MATCHES=$(find "$SOURCE" -maxdepth 1 -name "*_GSC2391*" 2>/dev/null)
if [ -n "$MATCHES" ]; then
  while IFS= read -r FILE; do
    FNAME=$(basename "$FILE")
    cp -n "$FILE" "$DEST/$FNAME" && echo "✅ $FNAME" || echo "❌ Gagal: $FNAME"
    COPIED=$((COPIED+1))
  done <<< "$MATCHES"
else
  echo "⚠️  Tidak ditemukan: *_GSC2391*"
  SKIPPED=$((SKIPPED+1))
fi

echo ""
echo "============================================"
echo "Selesai! Disalin: $COPIED file, Tidak ditemukan: $SKIPPED"
echo "Output: $DEST"
echo "============================================"
```

---

## Perbandingan dengan PnP Copy Script

| Aspek | Manual Script | PnP Copy Script |
|-------|--------------|-----------------|
| Sumber data | `wizard.files` (dari parsing teks) | `store.activeSelections` (dari Supabase) |
| Loop Windows | `for /r` + `copy /Y` per-file | `for %%F in (%FILES%)` + `xcopy /Y` |
| Loop macOS | `find -name` + `while read` | `for FILE in glob` + `cp -n` |
| Tracking | COPIED / SKIPPED per-file | Tanpa counter |
| Output path | `set "DEST=${outDir}"` (hardcoded) | `set "TARGET_DIR=%SOURCE_DIR%\..."` (referensi variabel) |
| Subfolder | Configurable (input user) | Fixed `Selected_by_Client` |

---

## Catatan

- Kode ini dikembalikan ke versi asli dan **tidak diubah** pada sesi 20 Juli 2026.
- PnP Copy Script-lah yang diubah supaya menggunakan pola `xcopy` baru.
