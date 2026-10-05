@echo off
title Intranet Mailing System - Quick Start
color 0A

echo ============================================================
echo   INTRANET MAILING SYSTEM - Quick Start (no rebuild)
echo   Using previously built frontend from client\dist\
echo ============================================================
echo.

cd /d "%~dp0"

echo Starting server on 0.0.0.0:5000...
echo.
echo   - This Computer  : http://localhost:5000
echo   - LAN (Other PCs): http://10.60.7.97:5000
echo.
echo Press Ctrl+C to stop.
echo.

cd server
node server.js
