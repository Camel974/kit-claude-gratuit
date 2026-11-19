@echo off
rem Kit Claude Gratuit (Brennan SONNET) : double-clique sur ce fichier pour tout installer.
chcp 65001 >nul
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\installer-windows.ps1" %*
echo.
pause
