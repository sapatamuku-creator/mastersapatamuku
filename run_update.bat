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
call clasp push
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Gagal melakukan clasp push.
    cd ..
    pause
    exit /b %ERRORLEVEL%
)
echo OK: Kode backend terkirim.
echo.

:: 3. New Deployment (Optional but recommended for Web Apps)
echo [STEP 3] Membuat Versi Deployment Baru di Google...
call clasp deploy --description "Update via Auto-Sync %date% %time%"
cd ..

echo.
echo ==================================================
echo    SUKSES! Ekosistem SapaTamu.Ku Telah Terupdate.
echo ==================================================
echo.
pause
