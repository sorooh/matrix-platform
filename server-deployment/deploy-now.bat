@echo off
REM Auto Deployment Script - Matrix Platform v11.0.0
REM Windows Batch Script for Server Deployment

echo ============================================
echo Matrix Platform v11.0.0 - Auto Deployment
echo ============================================
echo.
echo Server: 46.224.42.221
echo Domain: senorbit.ai
echo.
echo Starting deployment...
echo.

REM Check if SSH is available
where ssh >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: SSH not found. Please install OpenSSH or use Git Bash.
    echo.
    echo To install OpenSSH:
    echo   1. Open Settings
    echo   2. Go to Apps ^> Optional Features
    echo   3. Add OpenSSH Client
    echo.
    pause
    exit /b 1
)

REM Deploy using SSH
echo Connecting to server...
echo.
ssh -o StrictHostKeyChecking=no root@46.224.42.221 "bash -s" < deploy-remote.sh

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================
    echo Deployment completed successfully!
    echo ============================================
    echo.
    echo Verify deployment:
    echo   curl https://senorbit.ai/health
    echo.
) else (
    echo.
    echo ============================================
    echo Deployment failed!
    echo ============================================
    echo.
    echo Please check the error messages above.
    echo.
)

pause

