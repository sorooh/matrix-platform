#!/bin/bash
# ============================================
# إصلاح شامل - Matrix Platform (محدث)
# Complete Fix - Matrix Platform (Updated)
# ============================================

set -e

echo "🔧 إصلاح شامل - Matrix Platform"
echo "=================================="
echo ""

# Step 1: Ensure project exists and is up to date
echo "📥 Step 1: Ensuring project is up to date..."
if [ ! -d "/opt/matrix-platform" ]; then
    echo "   Cloning from GitHub..."
    cd /opt
    git clone https://github.com/sorooh/matrix-platform.git matrix-platform
    cd matrix-platform
else
    cd /opt/matrix-platform
    git config pull.rebase false
    git fetch origin
    git reset --hard origin/master 2>/dev/null || git reset --hard origin/main 2>/dev/null || {
        echo "⚠️ Git reset failed, trying pull..."
        git pull origin master 2>/dev/null || git pull origin main 2>/dev/null || true
    }
fi

# Verify Prisma schema exists
if [ ! -f "matrix-scaffold/backend/prisma/schema.prisma" ]; then
    echo "❌ Prisma schema missing! Restoring..."
    git checkout HEAD -- matrix-scaffold/backend/prisma/schema.prisma 2>/dev/null || {
        echo "❌ Cannot restore Prisma schema from git!"
        exit 1
    }
fi
echo "✅ Project updated"

# Step 2: Start system services
echo ""
echo "📊 Step 2: Starting system services..."
systemctl start postgresql redis-server nginx 2>/dev/null || true
systemctl enable postgresql redis-server nginx 2>/dev/null || true
echo "✅ System services started"

# Step 3: Setup database
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

# Step 4: Build application
echo ""
echo "📊 Step 4: Building application..."
cd matrix-scaffold/backend

export DATABASE_URL="postgresql://matrix:matrix_password_2025@localhost:5432/matrix"
export REDIS_URL="redis://localhost:6379"
export NODE_ENV="production"
export PORT="3000"
export CORS_ORIGIN="https://senorbit.ai,https://www.senorbit.ai"

# Verify Prisma schema
if [ ! -f "prisma/schema.prisma" ]; then
    echo "❌ Prisma schema not found in backend!"
    exit 1
fi

# Install dependencies - use npm install if package-lock.json missing
echo "   Installing dependencies..."
if [ -f "package-lock.json" ]; then
    npm ci --production 2>&1 | grep -v "npm WARN" || true
else
    echo "   ⚠️ package-lock.json not found, using npm install..."
    npm install --production 2>&1 | grep -v "npm WARN" || true
fi

echo "   Generating Prisma client..."
npx prisma generate

echo "   Running migrations..."
npx prisma migrate deploy || echo "⚠️ Migration warning (may be normal)"

echo "   Building TypeScript..."
npm run build

if [ ! -f "dist/main.js" ]; then
    echo "❌ Build failed! dist/main.js not found"
    echo "   Checking build errors..."
    npm run build 2>&1 | tail -20
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
    return 301 https://$server_name$request_uri;
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
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    location /health {
        proxy_pass http://localhost:3000/health;
        proxy_set_header Host $host;
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
    echo "   Obtaining SSL certificate..."
    certbot --nginx -d senorbit.ai -d www.senorbit.ai \
        --non-interactive \
        --agree-tos \
        --email admin@senorbit.ai \
        --redirect \
        --quiet 2>/dev/null || echo "⚠️ SSL setup failed (may need manual setup)"
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
echo "🌐 Test your site:"
echo "   curl https://senorbit.ai/health"
echo ""
echo "📊 Monitor:"
echo "   pm2 logs matrix-platform"
echo "   pm2 monit"
echo ""
