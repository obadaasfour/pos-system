@echo off
title POS System - All-in-One Launcher
setlocal enabledelayedexpansion

echo =========================================================
echo    🚀 Starting POS System (Laravel + React + Reverb)
echo =========================================================
echo.

:: 1. Start Laravel Backend
echo [1/3] Launching Laravel Backend (Port 8000)...
start "POS-Backend" cmd /c "cd /d backend && php artisan serve"

:: 2. Start Laravel Reverb
echo [2/3] Launching Laravel Reverb (WebSockets)...
start "POS-Reverb" cmd /c "cd /d backend && php artisan reverb:start"

:: 3. Start Frontend
echo [3/3] Launching React Frontend (Vite)...
start "POS-Frontend" cmd /c "cd /d frontend && npm run dev"

echo.
echo =========================================================
echo    ✅ All services are starting...
echo    - Backend: http://127.0.0.1:8000
echo    - Frontend: http://localhost:5173
echo    - Reverb: Running in background
echo =========================================================
echo.
echo Press any key to exit this launcher window (Servers will stay running).
pause > nul
