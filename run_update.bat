@echo off
SETLOCAL EnableDelayedExpansion

echo ==================================================
echo    SAPATAMU.KU - AUTO SYNC & DEPLOY SYSTEM
echo ==================================================
echo.

:: 1. Update Frontend via Git (Triggers Vercel)
echo [STEP 1] Mengunggah Frontend ke GitHub...
git add .
git commit -m "Sync: %date% %time%"
git push origin main
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Gagal melakukan push ke GitHub.
    pause
    exit /b %ERRORLEVEL%
)
echo OK: Frontend terkirim ke GitHub (Vercel akan mulai deploy).
echo.

:: 2. Update Backend via Clasp
echo [STEP 2] Mengunggah Backend ke Google Apps Script...
cd backend
call clasp push --force
if %errorlevel% neq 0 (
    echo [ERROR] Gagal melakukan clasp push.
    cd ..
    pause
    exit /b
)

echo [STEP 3] Memperbarui Deployment di Google agar menggunakan kode terbaru...
call clasp deploy -i AKfycbwDrkYErU1cAiC8-Hq9zhLGHjOt_c7KE3AjugCX4DVsmQbgOyTQnrDR-2bZTUkG_oH_ -d "SapaTamu Master Unified Update %date% %time%"
cd ..

echo OK: Kode backend terupdate.
echo.

echo.
echo ==================================================
echo    SUKSES! Ekosistem SapaTamu.Ku Telah Terupdate.
echo    URL: https://script.google.com/macros/s/AKfycbwDrkYErU1cAiC8-Hq9zhLGHjOt_c7KE3AjugCX4DVsmQbgOyTQnrDR-2bZTUkG_oH_/exec
echo ==================================================
echo.
pause
