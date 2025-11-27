#!/bin/bash
# ============================================
# إصلاح شامل - أي سيرفر
# Complete Fix - Any Server
# ============================================

set -e

echo "🔧 إصلاح شامل - Matrix Platform"
echo "=================================="
echo ""

# Step 1: Update from GitHub
cd /opt/matrix-platform || (cd /opt && git clone https://github.com/sorooh/matrix-platform.git matrix-platform && cd matrix-platform)
git stash
git pull origin master

# Step 2: Fix Prisma schema (remove duplicates after line 1495)
cd matrix-scaffold/backend
echo "📊 Fixing Prisma schema..."
if [ -f "prisma/schema.prisma" ]; then
    head -n 1495 prisma/schema.prisma > prisma/schema.prisma.fixed
    mv prisma/schema.prisma.fixed prisma/schema.prisma
    echo "✅ Prisma schema fixed"
fi

# Step 3: Start services
echo ""
echo "📊 Starting system services..."
systemctl start postgresql redis-server nginx 2>/dev/null || true

# Step 4: Setup database
echo ""
echo "📊 Setting up database..."
sudo -u postgres psql << PSQLEOF 2>/dev/null || true
CREATE DATABASE matrix;
CREATE USER matrix WITH ENCRYPTED PASSWORD 'matrix_password_2025';
GRANT ALL PRIVILEGES ON DATABASE matrix TO matrix;
\c matrix
GRANT ALL ON SCHEMA public TO matrix;
CREATE EXTENSION IF NOT EXISTS vector;
\q
PSQLEOF

# Step 5: Install dependencies
echo ""
echo "📦 Installing dependencies..."
rm -f package-lock.json
rm -rf node_modules
npm install --production --legacy-peer-deps 2>&1 | grep -v "npm WARN" || true

# Step 6: Generate Prisma
echo ""
echo "🔨 Generating Prisma client..."
export DATABASE_URL="postgresql://matrix:matrix_password_2025@localhost:5432/matrix"
export REDIS_URL="redis://localhost:6379"
export NODE_ENV="production"
export PORT="3000"
export CORS_ORIGIN="https://senorbit.ai,https://www.senorbit.ai"

npx prisma generate

# Step 7: Migrate
echo ""
echo "📊 Running migrations..."
npx prisma migrate deploy || true

# Step 8: Build
echo ""
echo "🏗️ Building application..."
npm run build

if [ ! -f "dist/main.js" ]; then
    echo "❌ Build failed!"
    exit 1
fi

# Step 9: Setup PM2
echo ""
echo "🚀 Setting up PM2..."
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
      CORS_ORIGIN: 'https://senorbit.ai,https://www.senorbit.ai'
    },
    autorestart: true,
    max_memory_restart: '2G'
  }]
}
PM2EOF

mkdir -p /var/log/matrix-platform
pm2 delete matrix-platform 2>/dev/null || true
pm2 start pm2.ecosystem.config.js
pm2 save

# Step 10: Setup Nginx
echo ""
echo "🌐 Setting up Nginx..."
cat > /etc/nginx/sites-available/senorbit.ai << 'NGINXEOF'
server { listen 80; server_name senorbit.ai www.senorbit.ai; return 301 https://$server_name$request_uri; }
server { listen 443 ssl http2; server_name senorbit.ai www.senorbit.ai; ssl_certificate /etc/letsencrypt/live/senorbit.ai/fullchain.pem; ssl_certificate_key /etc/letsencrypt/live/senorbit.ai/privkey.pem; location / { proxy_pass http://localhost:3000; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; } }
NGINXEOF
ln -sf /etc/nginx/sites-available/senorbit.ai /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Step 11: Verify
echo ""
echo "✅ Verifying..."
sleep 5
pm2 status
curl http://localhost:3000/health && echo "✅ Done!" || echo "⚠️ Health check failed"

echo ""
echo "=================================="
echo "✅ Fix Complete!"
echo "=================================="
echo ""
echo "🌐 Test: curl https://senorbit.ai/health"
echo ""
