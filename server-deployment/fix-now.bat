@echo off
REM Matrix Platform - Auto Fix Script (Double Click to Run)
REM This script will automatically fix the server

echo ========================================
echo Matrix Platform - Auto Fix
echo ========================================
echo.
echo This will automatically fix your server
echo.
echo Press any key to start...
pause >nul

echo.
echo Running PowerShell script...
echo.

powershell.exe -ExecutionPolicy Bypass -File "%~dp0FIX-NOW.ps1"

echo.
echo ========================================
echo Done!
echo ========================================
echo.
pause

