@echo off
title SapaTamu Local Culling Bridge (100% LAN)
color 0A
cls
echo =========================================================
echo       SAPATAMU LOCAL CULLING BRIDGE (100% PURE LAN)
echo =========================================================
echo  PC = Gudang File Lokal  ^|  HP = Remote Pinterest Selector
echo =========================================================
echo.

:: 1. Deteksi Command Python (python atau py)
set "PY_CMD=python"
python --version >nul 2>&1
if %errorlevel% neq 0 (
    py --version >nul 2>&1
    if %errorlevel% equ 0 (
        set "PY_CMD=py"
    ) else (
        color 0C
        echo [ERROR] Python tidak ditemukan di komputer ini!
        echo.
        echo Solusi:
        echo 1. Unduh dan instal Python dari: https://www.python.org/downloads/
        echo 2. PENTING: Saat instal, centang "Add Python to PATH" di bagian bawah.
        echo.
        pause
        exit /b 1
    )
)

echo [1/3] Python terdeteksi: %PY_CMD%
%PY_CMD% --version
echo.

:: 2. Cek & Pasang Modul (FastAPI, Uvicorn, Pillow)
echo [2/3] Memeriksa modul FastAPI & Uvicorn...
%PY_CMD% -c "import fastapi, uvicorn, PIL" >nul 2>&1
if %errorlevel% neq 0 (
    echo       Memasang dependensi yang dibutuhkan...
    %PY_CMD% -m pip install fastapi uvicorn pillow
    if %errorlevel% neq 0 (
        color 0C
        echo [ERROR] Gagal memasang dependensi pip.
        pause
        exit /b 1
    )
)

:: 3. Jalankan Server Local Bridge
echo.
echo [3/3] Menjalankan SapaTamu Local Bridge di port 8787...
echo       Browser PC akan terbuka secara otomatis di http://localhost:8787
echo       (JANGAN TUTUP JENDELA INI SELAMA CULLING BERJALAN)
echo.
echo =========================================================

%PY_CMD% sortir_bridge.py

:: Jika server berhenti, jangan langsung tutup jendela
echo.
echo =========================================================
echo Server SapaTamu Bridge telah berhenti.
echo.
pause
