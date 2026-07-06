@echo off
title 🚀 POS System Master Launcher
color 0B

echo ===================================================
echo      POS SYSTEM PREMIUM - GLOBAL STARTUP
echo ===================================================
echo.

:: 1. Docker Check
echo [1/3] Checking Docker Status...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Docker is NOT running! ❌
    echo Please start Docker Desktop and try again.
    echo.
    pause
    exit /b
)
echo Docker is ready. ✅

:: 2. Launch Services
echo [2/3] Starting all services (Database, Backend, Frontend)...
docker-compose up -d
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to start Docker services! ❌
    pause
    exit /b
)
echo Services are running. ✅

:: 3. Launch UI
echo [3/3] System is ready! Opening in browser...
timeout /t 5 /nobreak > nul

:: Using the Laptop Name for access
set SYSTEM_URL=Asus-Lp.local
echo Launching POS at http://%SYSTEM_URL%:5173

start http://%SYSTEM_URL%:5173

echo.
echo ===================================================
echo   ✅ SYSTEM STATUS: ONLINE 🚀
echo   - Frontend: http://%SYSTEM_URL%:5173
echo   - Backend API: http://%SYSTEM_URL%:8000
echo   - Real-time (Reverb): Port 8090
echo ===================================================
echo.
echo [REMEMBER] Check Chrome Flags if you face login issues on IP.
echo.
pause