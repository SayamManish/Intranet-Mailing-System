@echo off
echo ============================================================
echo   INTRANET MAILING SYSTEM - Windows Firewall Setup
echo   Run this file as Administrator (right-click -> Run as admin)
echo ============================================================
echo.

netsh advfirewall firewall delete rule name="Intranet Mailing System Port 5000" >nul 2>&1

netsh advfirewall firewall add rule name="Intranet Mailing System Port 5000" ^
  dir=in action=allow protocol=TCP localport=5000 profile=private,domain

if %errorlevel% == 0 (
  echo [OK] Firewall rule added: TCP port 5000 is now open on LAN.
  echo.
  echo LAN users can now access the app at:
  echo   http://10.60.7.97:5000
) else (
  echo [FAIL] Could not add firewall rule. Are you running as Administrator?
)

echo.
pause
