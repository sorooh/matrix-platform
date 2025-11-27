# ============================================
# إصلاح تلقائي - كل السيرفرات
# Auto Fix - All Servers
# ============================================

$servers = @(
    @{IP="46.224.42.221"; User="root"; Password="aiadsham"}
    # أضف باقي السيرفرات هنا
    # @{IP="xxx.xxx.xxx.xxx"; User="root"; Password="password"}
)

$fixCommand = @"
bash << 'EOF'
set -e
cd /opt/matrix-platform || (cd /opt && git clone https://github.com/sorooh/matrix-platform.git matrix-platform && cd matrix-platform)
git stash && git pull origin master
cd matrix-scaffold/backend
head -n 1495 prisma/schema.prisma > prisma/schema.prisma.fixed && mv prisma/schema.prisma.fixed prisma/schema.prisma
systemctl start postgresql redis-server nginx 2>/dev/null || true
sudo -u postgres psql << PSQLEOF 2>/dev/null || true
CREATE DATABASE matrix; CREATE USER matrix WITH ENCRYPTED PASSWORD 'matrix_password_2025'; GRANT ALL PRIVILEGES ON DATABASE matrix TO matrix; \c matrix; GRANT ALL ON SCHEMA public TO matrix; CREATE EXTENSION IF NOT EXISTS vector; \q
PSQLEOF
rm -f package-lock.json && rm -rf node_modules
npm install --production --legacy-peer-deps 2>&1 | grep -v "npm WARN" || true
export DATABASE_URL="postgresql://matrix:matrix_password_2025@localhost:5432/matrix" REDIS_URL="redis://localhost:6379" NODE_ENV="production" PORT="3000"
npx prisma generate && npx prisma migrate deploy || true && npm run build
cd /opt/matrix-platform
command -v pm2 || npm install -g pm2
cat > pm2.ecosystem.config.js << 'PM2EOF'
module.exports = { apps: [{ name: 'matrix-platform', script: './matrix-scaffold/backend/dist/main.js', cwd: '/opt/matrix-platform', instances: 2, exec_mode: 'cluster', env: { NODE_ENV: 'production', PORT: 3000, DATABASE_URL: 'postgresql://matrix:matrix_password_2025@localhost:5432/matrix', REDIS_URL: 'redis://localhost:6379', CORS_ORIGIN: 'https://senorbit.ai,https://www.senorbit.ai' }, autorestart: true, max_memory_restart: '2G' }] }
PM2EOF
mkdir -p /var/log/matrix-platform
pm2 delete matrix-platform 2>/dev/null || true
pm2 start pm2.ecosystem.config.js && pm2 save
cat > /etc/nginx/sites-available/senorbit.ai << 'NGINXEOF'
server { listen 80; server_name senorbit.ai www.senorbit.ai; return 301 https://`$server_name`$request_uri; }
server { listen 443 ssl http2; server_name senorbit.ai www.senorbit.ai; ssl_certificate /etc/letsencrypt/live/senorbit.ai/fullchain.pem; ssl_certificate_key /etc/letsencrypt/live/senorbit.ai/privkey.pem; location / { proxy_pass http://localhost:3000; proxy_set_header Host `$host; proxy_set_header X-Real-IP `$remote_addr; } }
NGINXEOF
ln -sf /etc/nginx/sites-available/senorbit.ai /etc/nginx/sites-enabled/ && rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
sleep 5 && curl http://localhost:3000/health && echo "✅ Done!"
EOF
"@

Write-Host "`n🔧 إصلاح تلقائي - كل السيرفرات" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""

foreach ($server in $servers) {
    Write-Host "📡 الاتصال بـ $($server.IP)..." -ForegroundColor Cyan

    # Check if plink (PuTTY) is available
    if (Get-Command plink -ErrorAction SilentlyContinue) {
        Write-Host "   Using PuTTY (plink)..." -ForegroundColor White

        # Create temporary script file
        $tempScript = [System.IO.Path]::GetTempFileName()
        $fixCommand | Out-File -FilePath $tempScript -Encoding UTF8

        # Upload and execute
        $commands = @(
            "cat > /tmp/fix-server.sh",
            "chmod +x /tmp/fix-server.sh",
            "bash /tmp/fix-server.sh"
        )

        foreach ($cmd in $commands) {
            if ($cmd -eq "cat > /tmp/fix-server.sh") {
                Get-Content $tempScript | & plink -ssh -pw $server.Password $server.User@$server.IP $cmd
            } else {
                echo y | plink -ssh -pw $server.Password $server.User@$server.IP $cmd
            }
        }

        Remove-Item $tempScript -Force
        Write-Host "   ✅ تم إصلاح $($server.IP)" -ForegroundColor Green
    }
    else {
        Write-Host "   ⚠️ PuTTY (plink) غير مثبت" -ForegroundColor Yellow
        Write-Host "   📋 استخدم هذا الأمر يدوياً:" -ForegroundColor White
        Write-Host ""
        Write-Host "   ssh $($server.User)@$($server.IP)" -ForegroundColor Green
        Write-Host ""
        Write-Host "   ثم انسخ الأمر من ملف ONE_COMMAND_FIX.txt" -ForegroundColor White
    }

    Write-Host ""
}

Write-Host "✅ تم!" -ForegroundColor Green
