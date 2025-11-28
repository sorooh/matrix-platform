@echo off
chcp 65001 >nul
echo.
echo ═══════════════════════════════════════════════════════
echo 🚀 نشر Matrix Platform على السيرفر
echo ═══════════════════════════════════════════════════════
echo.
echo 📋 الأمر الكامل:
echo.
echo ssh root@46.224.42.221 "cd /opt/matrix-platform/matrix-scaffold/backend && git pull origin master && npm install --legacy-peer-deps && npx prisma generate && npm run build && pm2 restart matrix-platform && sleep 5 && pm2 list && curl http://localhost:3000/health"
echo.
echo 🔐 كلمة المرور: aiadsham
echo.
echo ═══════════════════════════════════════════════════════
echo.
pause
