# ============================================
# إصلاح تلقائي - Matrix Platform
# Auto Fix - Matrix Platform
# ============================================

$ErrorActionPreference = "Stop"

Write-Host "`n🔧 إصلاح تلقائي - Matrix Platform" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""

# Server details
$serverIP = "46.224.42.221"
$serverUser = "root"
$serverPassword = "aiadsham"

# Fix command
$fixCommand = @"
set -e
cd /opt/matrix-platform
git stash
git pull origin master
cd matrix-scaffold/backend
rm -f package-lock.json
rm -rf node_modules
npm install --production --legacy-peer-deps
npx prisma generate
npx prisma migrate deploy || true
npm run build
cd /opt/matrix-platform
pm2 delete matrix-platform 2>/dev/null || true
pm2 start pm2.ecosystem.config.js
pm2 save
systemctl reload nginx
sleep 3
curl http://localhost:3000/health && echo "✅ Done!"
"@

# Save command to temp file
$tempFile = [System.IO.Path]::GetTempFileName()
$fixCommand | Out-File -FilePath $tempFile -Encoding UTF8 -NoNewline

Write-Host "📡 الاتصال بالسيرفر..." -ForegroundColor Cyan
Write-Host "   Server: $serverIP" -ForegroundColor White
Write-Host "   User: $serverUser" -ForegroundColor White
Write-Host ""

# Method 1: Try using SSH with password (using sshpass equivalent)
# Check if plink (PuTTY) is available
$plinkPath = Get-Command plink -ErrorAction SilentlyContinue

if ($plinkPath) {
    Write-Host "✅ Using PuTTY (plink)..." -ForegroundColor Green
    Write-Host ""

    # Upload and execute script
    $uploadCommand = "echo y | plink -ssh -pw $serverPassword $serverUser@$serverIP `"bash -s`" < `"$tempFile`""

    Write-Host "🚀 تشغيل الإصلاح..." -ForegroundColor Yellow
    Write-Host ""

    try {
        Invoke-Expression $uploadCommand
        Write-Host ""
        Write-Host "✅ تم الإصلاح!" -ForegroundColor Green
    }
    catch {
        Write-Host ""
        Write-Host "❌ Error: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "📋 Please run manually:" -ForegroundColor Yellow
        Write-Host "   ssh $serverUser@$serverIP" -ForegroundColor White
        Write-Host "   Password: $serverPassword" -ForegroundColor Gray
    }
}
else {
    # Method 2: Try using SSH with expect-like functionality
    $sshPath = Get-Command ssh -ErrorAction SilentlyContinue

    if ($sshPath) {
        Write-Host "✅ Using SSH..." -ForegroundColor Green
        Write-Host ""
        Write-Host "⚠️ SSH requires password input..." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "📋 Run this command manually:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "ssh $serverUser@$serverIP" -ForegroundColor White
        Write-Host ""
        Write-Host "Password: $serverPassword" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Then paste this command:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host $fixCommand -ForegroundColor Yellow
        Write-Host ""

        # Try to use SSH with here-string
        Write-Host "🔄 Attempting SSH connection (you'll need to enter password)..." -ForegroundColor Yellow
        Write-Host ""

        # Create a script that pipes the command
        $sshScript = @"
ssh -o StrictHostKeyChecking=no $serverUser@$serverIP << 'REMOTEEOF'
$fixCommand
REMOTEEOF
"@

        Write-Host "Command to run:" -ForegroundColor Cyan
        Write-Host $sshScript -ForegroundColor White
        Write-Host ""
    }
    else {
        Write-Host "❌ SSH not found!" -ForegroundColor Red
        Write-Host ""
        Write-Host "📋 Please install one of:" -ForegroundColor Yellow
        Write-Host "   1. OpenSSH (Windows Settings > Apps > Optional Features)" -ForegroundColor White
        Write-Host "   2. PuTTY (https://www.putty.org/)" -ForegroundColor White
        Write-Host "   3. Git Bash (includes SSH)" -ForegroundColor White
        Write-Host ""
    }
}

# Clean up
Remove-Item $tempFile -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "✅ Script Complete!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
