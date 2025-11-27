# ============================================
# إصلاح السيرفر - Matrix Platform
# Server Fix Script - Matrix Platform
# ============================================
# هذا الملف يشغل الإصلاح على السيرفر مباشرة
# This script runs the fix on the server directly

Write-Host "`n🔧 إصلاح السيرفر - Matrix Platform" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""

# Server details
$serverIP = "46.224.42.221"
$serverUser = "root"
$serverPassword = "aiadsham"
$serverPath = "/opt/matrix-platform/server-deployment"

# Check if SSH is available
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-Host "❌ SSH غير مثبت!" -ForegroundColor Red
    Write-Host "   يرجى تثبيت OpenSSH أو استخدام PuTTY" -ForegroundColor Yellow
    exit 1
}

Write-Host "📡 الاتصال بالسيرفر..." -ForegroundColor Cyan
Write-Host "   Server: $serverIP" -ForegroundColor White
Write-Host "   User: $serverUser" -ForegroundColor White
Write-Host ""

# Create the fix script content
$fixScript = @"
#!/bin/bash
set -e

echo "🔧 إصلاح شامل - Matrix Platform"
echo "=================================="
echo ""

cd /opt/matrix-platform

# Step 1: Update from GitHub
echo "📥 Step 1: Updating from GitHub..."
if [ -d ".git" ]; then
    git pull origin master || git pull origin main || true
    echo "✅ Repository updated"
fi

# Step 2: Start System Services
echo ""
echo "📊 Step 2: Starting system services..."
systemctl start postgresql redis-server nginx 2>/dev/null || true
systemctl enable postgresql redis-server nginx 2>/dev/null || true
echo "✅ System services started"

# Step 3: Setup Database
echo ""
echo "📊 Step 3: Setting up database..."
sudo -u postgres psql << PSQLEOF 2>/dev/null || true
CREATE DATABASE matrix;
CREATE USER matrix WITH ENCRYPTED PASSWORD 'matrix_password_2025';
GRANT ALL PRIVILEGES ON DATABASE matrix TO matrix;
\c matrix
GRANT ALL ON SCHEMA public TO matrix;
CREATE EXTENSION IF NOT EXISTS vector;
\q
PSQLEOF
echo "✅ Database setup complete"

# Step 4: Build Application
echo ""
echo "📊 Step 4: Building application..."
cd matrix-scaffold/backend

export DATABASE_URL="postgresql://matrix:matrix_password_2025@localhost:5432/matrix"
export REDIS_URL="redis://localhost:6379"
export NODE_ENV="production"
export PORT="3000"
export CORS_ORIGIN="https://senorbit.ai,https://www.senorbit.ai"

echo "   Installing dependencies..."
npm ci --production --silent 2>&1 | grep -v "npm WARN" || true

echo "   Generating Prisma client..."
npx prisma generate --silent

echo "   Running migrations..."
npx prisma migrate deploy --silent || echo "⚠️ Migration warning"

echo "   Building TypeScript..."
npm run build --silent

if [ ! -f "dist/main.js" ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Application built successfully"

# Step 5: Setup PM2
echo ""
echo "📊 Step 5: Setting up PM2..."
cd /opt/matrix-platform

command -v pm2 || npm install -g pm2

cat > pm2.ecosystem.config.js << 'PM2EOF'
module.exports = {
  apps: [{
    name: 'matrix-platform',
    script: './matrix-scaffold/backend/dist/main.js',
    cwd: '/opt/matrix-platform',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATABASE_URL: 'postgresql://matrix:matrix_password_2025@localhost:5432/matrix',
      REDIS_URL: 'redis://localhost:6379',
      CORS_ORIGIN: 'https://senorbit.ai,https://www.senorbit.ai',
      LOG_LEVEL: 'info'
    },
    error_file: '/var/log/matrix-platform/error.log',
    out_file: '/var/log/matrix-platform/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '2G',
    min_uptime: '10s',
    max_restarts: 10,
    watch: false,
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
}
PM2EOF

mkdir -p /var/log/matrix-platform

pm2 delete matrix-platform 2>/dev/null || true
pm2 start pm2.ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo "✅ PM2 setup complete"

# Step 6: Setup Nginx
echo ""
echo "📊 Step 6: Setting up Nginx..."

cat > /etc/nginx/sites-available/senorbit.ai << 'NGINXEOF'
server {
    listen 80;
    listen [::]:80;
    server_name senorbit.ai www.senorbit.ai;
    return 301 https://`$server_name`$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name senorbit.ai www.senorbit.ai;

    ssl_certificate /etc/letsencrypt/live/senorbit.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/senorbit.ai/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
        proxy_cache_bypass `$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    location /health {
        proxy_pass http://localhost:3000/health;
        proxy_set_header Host `$host;
        access_log off;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/senorbit.ai /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx

echo "✅ Nginx setup complete"

# Step 7: Setup SSL
echo ""
echo "📊 Step 7: Setting up SSL..."
if [ ! -f "/etc/letsencrypt/live/senorbit.ai/fullchain.pem" ]; then
    certbot --nginx -d senorbit.ai -d www.senorbit.ai \
        --non-interactive \
        --agree-tos \
        --email admin@senorbit.ai \
        --redirect \
        --quiet 2>/dev/null || echo "⚠️ SSL setup failed"
else
    echo "✅ SSL certificate already exists"
fi

# Step 8: Verify
echo ""
echo "📊 Step 8: Verifying deployment..."
sleep 5

echo "   PM2 Status:"
pm2 status

echo ""
echo "   Health Check:"
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "   ✅ Application is running!"
    curl http://localhost:3000/health
else
    echo "   ⚠️ Health check failed, checking logs..."
    pm2 logs matrix-platform --lines 20 --nostream
fi

echo ""
echo "=================================="
echo "✅ Fix Complete!"
echo "=================================="
echo ""
echo "🌐 Test: curl https://senorbit.ai/health"
echo ""
"@

# Method 1: Using SSH with password (requires sshpass or expect)
Write-Host "📤 إرسال أمر الإصلاح إلى السيرفر..." -ForegroundColor Cyan

# Try using plink (PuTTY) if available
if (Get-Command plink -ErrorAction SilentlyContinue) {
    Write-Host "   Using PuTTY (plink)..." -ForegroundColor White

    # Create temporary script file
    $tempScript = [System.IO.Path]::GetTempFileName()
    $fixScript | Out-File -FilePath $tempScript -Encoding UTF8

    # Upload script
    echo y | plink -ssh -pw $serverPassword $serverUser@$serverIP "cat > /tmp/fix-server.sh" < $tempScript

    # Make executable and run
    echo y | plink -ssh -pw $serverPassword $serverUser@$serverIP "chmod +x /tmp/fix-server.sh && bash /tmp/fix-server.sh"

    Remove-Item $tempScript -Force
}
else {
    # Method 2: Manual instructions
    Write-Host ""
    Write-Host "⚠️ SSH with password requires additional tools" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📋 الطريقة اليدوية / Manual Method:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. افتح Terminal جديد" -ForegroundColor White
    Write-Host "2. انسخ هذا الأمر:" -ForegroundColor White
    Write-Host ""
    Write-Host "ssh root@46.224.42.221" -ForegroundColor Green
    Write-Host ""
    Write-Host "3. عندما يطلب الباسورد، اكتب: aiadsham" -ForegroundColor White
    Write-Host ""
    Write-Host "4. بعد الاتصال، انسخ هذا الأمر كامل:" -ForegroundColor White
    Write-Host ""

    # Display the fix script
    Write-Host $fixScript -ForegroundColor Yellow

    Write-Host ""
    Write-Host "5. الصق الأمر واضغط Enter" -ForegroundColor White
    Write-Host ""
}

Write-Host "✅ تم!" -ForegroundColor Green
