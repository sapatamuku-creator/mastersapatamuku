@echo off
title SapaTamu Local Culling Bridge (100% LAN)
cls
echo =========================================================
echo       SAPATAMU LOCAL CULLING BRIDGE (100% PURE LAN)
echo =========================================================
echo  PC = Gudang File Lokal  ^|  HP = Remote Pinterest Selector
echo =========================================================
echo.

:: 1. Cek Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python tidak ditemukan di komputer ini!
    echo Harap instal Python terlebih dahulu dari https://www.python.org/
    echo Pastikan centang "Add Python to PATH" saat instalasi.
    echo.
    pause
    exit /b 1
)

:: 2. Cek & Pasang Modul Otomatis
echo [1/3] Memeriksa modul Python (fastapi, uvicorn, pillow)...
python -c "import fastapi, uvicorn, PIL" >nul 2>&1
if %errorlevel% neq 0 (
    echo       Memasang modul yang diperlukan secara otomatis...
    pip install fastapi uvicorn pillow -q
)

:: 3. Cek / Unduh sortir_bridge.py
echo [2/3] Memeriksa script engine sortir_bridge.py...
if not exist "sortir_bridge.py" (
    echo       Mengunduh engine sortir_bridge.py dari SapaTamu...
    python -c "import urllib.request; urllib.request.urlretrieve('https://raw.githubusercontent.com/sapatamuku-creator/mastersapatamuku/main/sortir_bridge.py', 'sortir_bridge.py')"
)

:: 4. Jalankan Server LAN
echo [3/3] Menjalankan Server Local Bridge pada port 8787...
echo       Browser PC akan terbuka secara otomatis.
echo.
python sortir_bridge.py

pause
