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

:: 3. Update Existing Deployment (URL stays the same)
echo [STEP 3] Memperbarui Deployment di Google (URL TETAP)...
call clasp deploy -i AKfycby6NbBUliD3si7LcGOuOe3kQF7etddQzocQO-oh_ZkOXw7GC9hEs5yWFqkqxxJxo7vd0A -d "SapaTamu Master Unified Update %date% %time%"
cd ..

echo.
echo ==================================================
echo    SUKSES! Ekosistem SapaTamu.Ku Telah Terupdate.
echo    URL: https://script.google.com/macros/s/AKfycby6NbBUliD3si7LcGOuOe3kQF7etddQzocQO-oh_ZkOXw7GC9hEs5yWFqkqxxJxo7vd0A/exec
echo ==================================================
echo.
pause
