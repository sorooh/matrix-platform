# Matrix Platform - Auto Start Script
# Professional Production-Ready Startup Script

Write-Host "🚀 Starting Matrix Platform..." -ForegroundColor Green

# Check if Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js is not installed. Please install Node.js 20+ first." -ForegroundColor Red
    exit 1
}

# Check Node.js version
$nodeVersion = node -v
Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green

# Navigate to backend directory
Set-Location matrix-scaffold\backend

# Check if .env exists
if (-not (Test-Path .env)) {
    Write-Host "⚠️  .env file not found. Creating from .env.example..." -ForegroundColor Yellow
    if (Test-Path .env.example) {
        Copy-Item .env.example .env
        Write-Host "✅ Created .env file. Please edit it with your configuration." -ForegroundColor Yellow
    } else {
        Write-Host "❌ .env.example not found. Please create .env manually." -ForegroundColor Red
        exit 1
    }
}

# Install dependencies if node_modules doesn't exist
if (-not (Test-Path node_modules)) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies." -ForegroundColor Red
        exit 1
    }
}

# Generate Prisma client
Write-Host "🔧 Generating Prisma client..." -ForegroundColor Cyan
npm run generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to generate Prisma client." -ForegroundColor Red
    exit 1
}

# Build TypeScript
Write-Host "🔨 Building TypeScript..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed." -ForegroundColor Red
    exit 1
}

# Check if PM2 is installed
if (Get-Command pm2 -ErrorAction SilentlyContinue) {
    Write-Host "✅ PM2 found. Starting with PM2..." -ForegroundColor Green
    pm2 start ecosystem.config.js --env production
    pm2 save
    Write-Host "✅ Matrix Platform started with PM2!" -ForegroundColor Green
    Write-Host "📊 View logs: pm2 logs" -ForegroundColor Cyan
    Write-Host "📊 Monitor: pm2 monit" -ForegroundColor Cyan
    Write-Host "🛑 Stop: pm2 stop matrix-platform" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  PM2 not found. Starting directly..." -ForegroundColor Yellow
    Write-Host "💡 Install PM2 for auto-restart: npm install -g pm2" -ForegroundColor Yellow
    npm run start:production
}

Set-Location ..\..\

