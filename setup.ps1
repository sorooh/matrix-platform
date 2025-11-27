# Matrix Platform - Complete Setup Script
# Professional Production-Ready Setup

Write-Host "🔧 Matrix Platform - Complete Setup" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

# Check prerequisites
Write-Host "`n📋 Checking prerequisites..." -ForegroundColor Cyan

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js is not installed!" -ForegroundColor Red
    Write-Host "   Please install Node.js 20+ from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

$nodeVersion = node -v
Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green

# Check npm
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ npm is not installed!" -ForegroundColor Red
    exit 1
}

$npmVersion = npm -v
Write-Host "✅ npm: $npmVersion" -ForegroundColor Green

# Navigate to backend
Set-Location matrix-scaffold\backend

# Create .env from example if it doesn't exist
Write-Host "`n📝 Setting up environment variables..." -ForegroundColor Cyan
if (-not (Test-Path .env)) {
    if (Test-Path .env.example) {
        Copy-Item .env.example .env
        Write-Host "✅ Created .env from .env.example" -ForegroundColor Green
        Write-Host "⚠️  Please edit .env file with your configuration!" -ForegroundColor Yellow
    } else {
        Write-Host "⚠️  .env.example not found. Creating basic .env..." -ForegroundColor Yellow
        @"
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://matrix:matrix@localhost:5432/matrix
REDIS_URL=redis://localhost:6379
"@ | Out-File -FilePath .env -Encoding utf8
    }
} else {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
}

# Install dependencies
Write-Host "`n📦 Installing dependencies..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed" -ForegroundColor Green

# Generate Prisma client
Write-Host "`n🔧 Generating Prisma client..." -ForegroundColor Cyan
npm run generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Prisma generation failed (might be OK if database not set up yet)" -ForegroundColor Yellow
}

# Build TypeScript
Write-Host "`n🔨 Building TypeScript..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build completed" -ForegroundColor Green

# Check for PM2
Write-Host "`n📊 Checking PM2..." -ForegroundColor Cyan
if (Get-Command pm2 -ErrorAction SilentlyContinue) {
    Write-Host "✅ PM2 is installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  PM2 not installed. Installing globally..." -ForegroundColor Yellow
    npm install -g pm2
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ PM2 installed" -ForegroundColor Green
    } else {
        Write-Host "⚠️  PM2 installation failed (optional)" -ForegroundColor Yellow
    }
}

# Summary
Write-Host "`n✅ Setup Complete!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host "`n📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Edit .env file with your configuration" -ForegroundColor White
Write-Host "   2. Start PostgreSQL and Redis (or use Docker)" -ForegroundColor White
Write-Host "   3. Run migrations: npm run migrate" -ForegroundColor White
Write-Host "   4. Start the server:" -ForegroundColor White
Write-Host "      - With PM2: npm run pm2:start" -ForegroundColor White
Write-Host "      - Directly: npm start" -ForegroundColor White
Write-Host "      - Development: npm run dev" -ForegroundColor White
Write-Host "`n🚀 Or use the start script: ..\..\start.ps1" -ForegroundColor Green

Set-Location ..\..\

