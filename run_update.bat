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

echo [STEP 3] Memperbarui Deployment (URL) agar menggunakan kode terbaru...
call clasp deploy --deploymentId AKfycbw2P-eJYni_mvNFqsa6_rDjvCBoIiv3qli10MWmsTtZAYwUcduSrSAbxv4hJ5kY6ICz --description "Auto Updated by Antigravity"
cd ..
if %errorlevel% neq 0 (
    echo [WARNING] Gagal update deployment otomatis.
)

echo OK: Kode backend terkirim.
echo.

:: 3. Update Existing Deployment (URL stays the same)
echo [STEP 3] Memperbarui Deployment di Google (URL TETAP)...
call clasp deploy -i AKfycbw2P-eJYni_mvNFqsa6_rDjvCBoIiv3qli10MWmsTtZAYwUcduSrSAbxv4hJ5kY6ICz -d "SapaTamu Master Unified Update %date% %time%"
cd ..

echo.
echo ==================================================
echo    SUKSES! Ekosistem SapaTamu.Ku Telah Terupdate.
echo    URL: https://script.google.com/macros/s/AKfycbw2P-eJYni_mvNFqsa6_rDjvCBoIiv3qli10MWmsTtZAYwUcduSrSAbxv4hJ5kY6ICz/exec
echo ==================================================
echo.
pause
