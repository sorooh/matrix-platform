# Matrix Platform - Stop All Services
# Professional Cleanup Script

Write-Host "🛑 Stopping Matrix Platform..." -ForegroundColor Yellow

# Stop PM2 processes
if (Get-Command pm2 -ErrorAction SilentlyContinue) {
    Write-Host "📊 Stopping PM2 processes..." -ForegroundColor Cyan
    pm2 stop all
    pm2 delete all
    Write-Host "✅ PM2 processes stopped" -ForegroundColor Green
}

# Stop Node.js processes
Write-Host "🔄 Stopping Node.js processes..." -ForegroundColor Cyan
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "✅ Node.js processes stopped" -ForegroundColor Green

# Stop Docker containers (if Docker is available)
if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "🐳 Stopping Docker containers..." -ForegroundColor Cyan
    docker-compose down 2>$null
    Write-Host "✅ Docker containers stopped" -ForegroundColor Green
}

Write-Host "`n✅ All services stopped!" -ForegroundColor Green
