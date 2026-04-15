@echo off
title Master POS Launcher - 192.168.0.105
echo =========================================================
echo    POS System Master Launcher (New IP: 192.168.0.105)
echo =========================================================
echo.

:: 1. Start Laravel Backend in a new window
echo [1/3] Starting Backend Server (Laravel)...
start "POS-Backend" cmd /c "cd /d backend && php artisan serve --host=0.0.0.0 --port=8000"

:: 2. Start Vite Frontend in a new window
echo [2/3] Starting Frontend Server (Vite)...
start "POS-Frontend" cmd /c "cd /d frontend && npm run dev -- --host"

:: 3. Wait for servers to initialize
echo [3/3] Waiting for servers to initialize...
timeout /t 5 /nobreak > nul

:: 4. Open the browser to the new IP
echo Opening browser: http://192.168.0.105:5173
start http://192.168.0.105:5173

echo.
echo =========================================================
echo    SUCCESS: System is running on http://192.168.0.105:5173
echo    You can now scan the QR Code from Dashboard.
echo =========================================================
echo.
pause
