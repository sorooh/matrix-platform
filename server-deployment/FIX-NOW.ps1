# Matrix Platform - Auto Fix Script
# This script will automatically fix the server

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Matrix Platform - Auto Fix" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if SSH is available
$sshAvailable = Get-Command ssh -ErrorAction SilentlyContinue
if (-not $sshAvailable) {
    Write-Host "❌ SSH is not available. Please install OpenSSH or Git Bash." -ForegroundColor Red
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host "🔍 Connecting to server..." -ForegroundColor Yellow
Write-Host ""

# Server information
$serverIP = "46.224.42.221"
$serverUser = "root"
$serverPassword = "aiadsham"

# Create SSH command script
$sshCommands = @"
cd /opt/matrix-platform
if [ ! -d "server-deployment" ]; then
    echo "📁 Checking project structure..."
    ls -la
    echo ""
    echo "🔍 Checking branches..."
    git branch -a
    echo ""
    echo "📥 Checking out v11.0.0 branch..."
    git checkout v11.0.0 2>/dev/null || git checkout master
    echo ""
    echo "📁 Checking server-deployment..."
    ls -la server-deployment 2>/dev/null || echo "⚠️ server-deployment not found"
fi

cd /opt/matrix-platform
if [ -d "server-deployment" ]; then
    echo "✅ server-deployment found!"
    cd server-deployment
    chmod +x *.sh
    echo "🚀 Running deployment..."
    ./deploy-simple.sh
else
    echo "⚠️ server-deployment not found, creating manual deployment..."
    echo ""
    echo "📦 Installing requirements..."
    apt-get update -qq
    apt-get install -y -qq nodejs npm nginx postgresql redis-server certbot python3-certbot-nginx
    npm install -g pm2
    
    echo "🔨 Building application..."
    cd /opt/matrix-platform/matrix-scaffold/backend
    npm ci --production
    export DATABASE_URL="postgresql://matrix:matrix_password_2025@localhost:5432/matrix"
    npx prisma migrate deploy
    npx prisma generate
    npm run build
    
    echo "🗄️ Setting up database..."
    sudo -u postgres psql << 'EOSQL'
CREATE DATABASE matrix;
CREATE USER matrix WITH ENCRYPTED PASSWORD 'matrix_password_2025';
GRANT ALL PRIVILEGES ON DATABASE matrix TO matrix;
\c matrix
CREATE EXTENSION IF NOT EXISTS vector;
EOSQL
    
    echo "🌐 Setting up Nginx..."
    cat > /etc/nginx/sites-available/senorbit.ai << 'EOF'
server {
    listen 80;
    server_name senorbit.ai www.senorbit.ai;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
    }
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
}
EOF
    ln -sf /etc/nginx/sites-available/senorbit.ai /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    nginx -t
    systemctl restart nginx
    
    echo "🚀 Starting PM2..."
    cd /opt/matrix-platform
    cat > pm2.ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'matrix-platform',
    script: './matrix-scaffold/backend/dist/main.js',
    cwd: '/opt/matrix-platform',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATABASE_URL: 'postgresql://matrix:matrix_password_2025@localhost:5432/matrix',
      REDIS_URL: 'redis://localhost:6379'
    }
  }]
}
EOF
    mkdir -p /var/log/matrix-platform
    pm2 start pm2.ecosystem.config.js
    pm2 save
    pm2 startup systemd -u root --hp /root
    
    echo "🔒 Setting up SSL..."
    certbot --nginx -d senorbit.ai -d www.senorbit.ai --non-interactive --agree-tos --email admin@senorbit.ai --redirect || echo "SSL will be set up later"
    
    echo "✅ Deployment complete!"
fi

echo ""
echo "🏥 Checking health..."
sleep 5
curl -s -o /dev/null -w "Health Status: %{http_code}\n" http://localhost:3000/health || echo "Health check failed"
echo ""
echo "✅ Done!"
"@

# Try to use sshpass if available, otherwise use expect or manual method
$sshpassAvailable = Get-Command sshpass -ErrorAction SilentlyContinue

if ($sshpassAvailable) {
    Write-Host "✅ Using sshpass for automatic password entry" -ForegroundColor Green
    $sshCommands | sshpass -p $serverPassword ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $serverUser@$serverIP
} else {
    Write-Host "⚠️ sshpass not available. Using manual method." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "You will need to enter the password manually: aiadsham" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press any key to continue and enter password when prompted..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    Write-Host ""
    
    # Save commands to temp file
    $tempFile = [System.IO.Path]::GetTempFileName()
    $sshCommands | Out-File -FilePath $tempFile -Encoding UTF8
    
    # Execute SSH
    ssh -o StrictHostKeyChecking=no $serverUser@$serverIP "bash -s" < $tempFile
    
    # Clean up
    Remove-Item $tempFile -Force
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fix Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌍 Test the website: https://senorbit.ai/health" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")


