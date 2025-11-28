# Quick Deploy Script - Matrix Platform v11.0.0
# PowerShell Script for Windows

$SERVER_IP = "46.224.42.221"
$SERVER_USER = "root"
$APP_DIR = "/opt/matrix-platform/matrix-scaffold/backend"

Write-Host "🚀 Quick Deploy - Matrix Platform v11.0.0" -ForegroundColor Green
Write-Host "📦 Server: $SERVER_IP" -ForegroundColor Cyan
Write-Host ""

# Check if SSH is available
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-Host "❌ SSH not found. Please install OpenSSH or use Git Bash." -ForegroundColor Red
    exit 1
}

Write-Host "📡 Connecting to server..." -ForegroundColor Yellow
Write-Host ""

# Create deployment script
$deployScript = @"
set -e

echo "📡 Connected to server"
echo ""

# Navigate to app directory
cd $APP_DIR || {
    echo "❌ Directory not found: $APP_DIR"
    echo "📦 Cloning repository..."
    mkdir -p /opt/matrix-platform
    cd /opt/matrix-platform
    if [ -d "matrix-platform" ]; then
        cd matrix-platform
        git pull origin master
    else
        git clone https://github.com/sorooh/matrix-platform.git .
    fi
    cd matrix-scaffold/backend
}

echo "📥 Pulling latest changes from GitHub..."
git pull origin master || echo "⚠️ Git pull failed, continuing..."

echo ""
echo "📦 Installing/updating dependencies..."
npm install --legacy-peer-deps || {
    echo "⚠️ npm install failed, trying with --force..."
    npm install --legacy-peer-deps --force
}

echo ""
echo "🔧 Generating Prisma Client..."
npx prisma generate || echo "⚠️ Prisma generate failed, continuing..."

echo ""
echo "🔄 Restarting PM2..."
pm2 restart matrix-platform || {
    echo "⚠️ PM2 restart failed, trying to start..."
    pm2 delete matrix-platform 2>/dev/null || true
    if [ -f "ecosystem.config.js" ]; then
        pm2 start ecosystem.config.js
    else
        pm2 start npx --name matrix-platform -- tsx src/main.ts
    fi
}

echo ""
echo "💾 Saving PM2 configuration..."
pm2 save

echo ""
echo "⏳ Waiting for application to start..."
sleep 10

echo ""
echo "🏥 Checking application status..."
pm2 list

echo ""
echo "📋 Checking health endpoint..."
curl -s http://localhost:3000/health || echo "⚠️ Health check failed"

echo ""
echo "✅ Deployment complete!"
echo "🔗 Application should be available at: http://$SERVER_IP:3000"
echo "🌍 Domain: https://senorbit.ai (if configured)"
"@

# Save script to temp file
$tempScript = [System.IO.Path]::GetTempFileName() + ".sh"
$deployScript | Out-File -FilePath $tempScript -Encoding UTF8

Write-Host "📤 Uploading deployment script..." -ForegroundColor Yellow

# Copy script to server and execute
$command = "ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP 'bash -s' < `"$tempScript`""
Write-Host ""
Write-Host "🔐 Please enter password when prompted: aiadsham" -ForegroundColor Yellow
Write-Host ""

# Execute
Invoke-Expression $command

# Cleanup
Remove-Item $tempScript -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "🎉 Deployment finished!" -ForegroundColor Green
Write-Host "🔗 Check: https://senorbit.ai/health" -ForegroundColor Cyan
Write-Host "🔗 Or: http://$SERVER_IP:3000/health" -ForegroundColor Cyan
