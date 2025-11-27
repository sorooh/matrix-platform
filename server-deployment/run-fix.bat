@echo off
echo ========================================
echo Matrix Platform - Fix 404 Error
echo ========================================
echo.
echo Connecting to server...
echo Password: aiadsham
echo.
ssh root@46.224.42.221 "cd /opt/matrix-platform/server-deployment && chmod +x fix-404.sh && ./fix-404.sh"
echo.
echo ========================================
echo Done! Check the output above.
echo ========================================
pause

