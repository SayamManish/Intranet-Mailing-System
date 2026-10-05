@echo off
title Intranet Mailing System - LAN Server
color 0A

echo ============================================================
echo   INTRANET MAILING SYSTEM
echo   LAN-Based Internal Communication Platform
echo ============================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not in PATH.
  echo Download from: https://nodejs.org/
  pause
  exit /b 1
)
echo [OK] Node.js found.
echo.

echo [2/3] Building React frontend for LAN deployment...
cd client
call npm run build
if errorlevel 1 (
  echo [ERROR] Frontend build failed. Check the logs above.
  cd ..
  pause
  exit /b 1
)
cd ..
echo [OK] Frontend built successfully.
echo.

echo [3/3] Starting backend server on 0.0.0.0:5000...
echo.
echo ============================================================
echo   Application URLs:
echo   - This Computer  : http://localhost:5000
echo   - LAN (Other PCs): http://10.60.7.97:5000
echo ============================================================
echo.
echo   Default Admin Account:
echo   Email   : admin@intranet.local
echo   Password: Admin@123
echo ============================================================
echo.
echo   Press Ctrl+C to stop the server.
echo.

cd server
node server.js
