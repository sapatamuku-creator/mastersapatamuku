@echo off
SETLOCAL EnableDelayedExpansion

echo ==================================================
echo    SAPATAMU.KU - NEW DEPLOYMENT SYSTEM
echo    (Akan membuat URL/ID baru)
echo ==================================================
echo.

:: 1. Update Frontend via Git
echo [STEP 1] Mengunggah Frontend ke GitHub...
git add --all
git commit -m "New Deployment: %date% %time%"
git push origin main
echo OK: Frontend terkirim.

:: 2. Update Backend via Clasp
echo [STEP 2] Mengunggah Kode ke Google...
cd backend
call clasp push
echo OK: Kode backend terkirim.

:: 3. Create New Deployment
echo [STEP 3] Membuat Versi Deployment BARU...
call clasp deploy --description "New Version %date% %time%"
cd ..

echo.
echo ==================================================
echo    SUKSES! Deployment Baru Berhasil Dibuat.
echo    CATATAN: Silakan cek ID Deployment baru di 
echo    Google Apps Script dan update file HTML Anda.
echo ==================================================
echo.
pause
