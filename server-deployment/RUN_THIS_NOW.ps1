# Run This Now - Quick Deploy Matrix Platform
# انسخ هذا الأمر والصقه في PowerShell

Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚀 نشر Matrix Platform على السيرفر" -ForegroundColor Green
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 الأمر الكامل:" -ForegroundColor Yellow
Write-Host ""
Write-Host "ssh root@46.224.42.221 'cd /opt/matrix-platform/matrix-scaffold/backend && git pull origin master && npm install --legacy-peer-deps && npx prisma generate && npm run build && pm2 restart matrix-platform && sleep 5 && pm2 list && curl http://localhost:3000/health'" -ForegroundColor White
Write-Host ""
Write-Host "🔐 كلمة المرور: aiadsham" -ForegroundColor Red
Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Ask user if they want to run it
$response = Read-Host "هل تريد تشغيل الأمر الآن؟ (y/n)"
if ($response -eq "y" -or $response -eq "Y") {
    Write-Host ""
    Write-Host "🚀 جاري التنفيذ..." -ForegroundColor Green
    Write-Host ""

    ssh root@46.224.42.221 'cd /opt/matrix-platform/matrix-scaffold/backend && git pull origin master && npm install --legacy-peer-deps && npx prisma generate && npm run build && pm2 restart matrix-platform && sleep 5 && pm2 list && curl http://localhost:3000/health'

    Write-Host ""
    Write-Host "✅ انتهى!" -ForegroundColor Green
    Write-Host "🔗 تحقق من: http://46.224.42.221:3000/health" -ForegroundColor Cyan
    Write-Host "🔗 أو: https://senorbit.ai/health" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "📋 انسخ الأمر أعلاه والصقه في PowerShell أو Git Bash" -ForegroundColor Yellow
}
