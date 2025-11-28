# Check Errors and Fix - Matrix Platform
# فحص الأخطاء وإصلاحها

$SERVER_IP = "46.224.42.221"
$SERVER_USER = "root"

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "فحص الأخطاء وإصلاحها" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check errors
Write-Host "الخطوة 1: فحص الأخطاء..." -ForegroundColor Green
Write-Host ""
Write-Host "شغّل هذا الأمر:" -ForegroundColor Yellow
Write-Host "ssh $SERVER_USER@$SERVER_IP 'cd /opt/matrix-platform/matrix-scaffold/backend && tail -50 logs/pm2-error.log'" -ForegroundColor White
Write-Host ""

# Step 2: Update and restart
Write-Host "الخطوة 2: تحديث وإعادة التشغيل..." -ForegroundColor Green
Write-Host ""
Write-Host "شغّل هذا الأمر:" -ForegroundColor Yellow
Write-Host "ssh $SERVER_USER@$SERVER_IP 'cd /opt/matrix-platform/matrix-scaffold/backend && git pull origin master && pm2 delete matrix-platform && pm2 start ecosystem.config.js && sleep 20 && pm2 list && curl http://localhost:3000/health'" -ForegroundColor White
Write-Host ""

Write-Host "كلمة المرور: aiadsham" -ForegroundColor Red
Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
