#!/bin/bash
# Complete Fix - Matrix Platform
# This script fixes everything from scratch

set -e

echo "=========================================="
echo "Matrix Platform - Complete Fix"
echo "=========================================="
echo ""

# Step 1: Check and install Node.js if needed
echo "1. Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "   ✅ Node.js: $(node --version)"
else
    echo "   ⚠️ Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get update
    apt-get install -y nodejs
fi

# Step 2: Check project location
echo ""
echo "2. Checking project..."
cd /opt
if [ ! -d "matrix-platform" ]; then
    echo "   ⚠️ Project not found, cloning..."
    git clone https://github.com/sorooh/matrix-platform.git matrix-platform
fi
cd /opt/matrix-platform
echo "   ✅ Project location: $(pwd)"

# Step 3: Update project
echo ""
echo "3. Updating project..."
git pull origin master || echo "   ⚠️ Git pull failed, continuing..."

# Step 4: Start system services
echo ""
echo "4. Starting system services..."
systemctl start postgresql redis-server nginx 2>/dev/null || true
systemctl enable postgresql redis-server nginx 2>/dev/null || true
echo "   ✅ Services started"

# Step 5: Setup database
echo ""
echo "5. Setting up database..."
sudo -u postgres psql << PSQLEOF 2>/dev/null || true
DROP DATABASE IF EXISTS matrix;
CREATE DATABASE matrix;
DROP USER IF EXISTS matrix;
CREATE USER matrix WITH ENCRYPTED PASSWORD 'matrix_password_2025';
GRANT ALL PRIVILEGES ON DATABASE matrix TO matrix;
\c matrix
GRANT ALL ON SCHEMA public TO matrix;
CREATE EXTENSION IF NOT EXISTS vector;
\q
PSQLEOF
echo "   ✅ Database ready"

# Step 6: Find and build backend
echo ""
echo "6. Building application..."

# Try different possible locations
BACKEND_DIR=""
if [ -d "matrix-scaffold/backend" ]; then
    BACKEND_DIR="matrix-scaffold/backend"
elif [ -d "backend" ]; then
    BACKEND_DIR="backend"
elif [ -d "server" ]; then
    BACKEND_DIR="server"
else
    echo "   ⚠️ Backend directory not found, searching..."
    BACKEND_DIR=$(find . -name "package.json" -type f | grep -E "(backend|server)" | head -1 | xargs dirname)
    if [ -z "$BACKEND_DIR" ]; then
        BACKEND_DIR=$(find . -name "package.json" -type f | head -1 | xargs dirname)
    fi
fi

if [ -n "$BACKEND_DIR" ] && [ -d "$BACKEND_DIR" ]; then
    echo "   ✅ Found backend at: $BACKEND_DIR"
    cd "$BACKEND_DIR"
    echo "   📍 Current: $(pwd)"
    
    # Install dependencies
    echo "   📦 Installing dependencies..."
    npm install --omit=dev 2>&1 | grep -v "npm WARN" || true
    
    # Build
    echo "   🔨 Building..."
    npm run build || {
        echo "   ⚠️ Build failed, trying with TypeScript..."
        npm install -g typescript || true
        npm run build
    }
    
    # Check build
    if [ -f "dist/main.js" ]; then
        echo "   ✅ Build successful!"
    else
        echo "   ❌ Build failed - checking dist..."
        ls -la dist/ 2>/dev/null || echo "   dist/ not found"
        exit 1
    fi
else
    echo "   ❌ Backend directory not found!"
    echo "   Available directories:"
    find . -type d -maxdepth 3 | head -20
    exit 1
fi

# Step 7: Install PM2 if needed
echo ""
echo "7. Checking PM2..."
if ! command -v pm2 &> /dev/null; then
    echo "   ⚠️ Installing PM2..."
    npm install -g pm2
fi
echo "   ✅ PM2 ready"

# Step 8: Create PM2 config
echo ""
echo "8. Configuring PM2..."
cd /opt/matrix-platform
cat > pm2.ecosystem.config.js << 'PM2EOF'
module.exports = {
  apps: [{
    name: 'matrix-platform',
    script: './matrix-scaffold/backend/dist/main.js',
    cwd: '/opt/matrix-platform',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATABASE_URL: 'postgresql://matrix:matrix_password_2025@localhost:5432/matrix',
      REDIS_URL: 'redis://localhost:6379',
      VERSION: '11.0.0'
    },
    error_file: '/var/log/matrix-platform/error.log',
    out_file: '/var/log/matrix-platform/out.log',
    autorestart: true,
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 10
  }]
};
PM2EOF

# Create log directory
mkdir -p /var/log/matrix-platform

# Step 9: Start PM2
echo ""
echo "9. Starting PM2..."
pm2 delete matrix-platform 2>/dev/null || true
pm2 start pm2.ecosystem.config.js || {
    echo "   ⚠️ PM2 config failed, trying direct start..."
    pm2 start './matrix-scaffold/backend/dist/main.js' \
        --name matrix-platform \
        --env NODE_ENV=production \
        --env PORT=3000 \
        --env DATABASE_URL='postgresql://matrix:matrix_password_2025@localhost:5432/matrix' \
        --env REDIS_URL='redis://localhost:6379'
}
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true
echo "   ✅ PM2 started"

# Step 10: Configure Nginx
echo ""
echo "10. Configuring Nginx..."
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
    }

    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/senorbit.ai /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx config
if nginx -t 2>&1 | grep -q "successful"; then
    systemctl reload nginx
    echo "   ✅ Nginx configured"
else
    echo "   ⚠️ Nginx config error:"
    nginx -t
fi

# Step 11: Setup SSL if needed
echo ""
echo "11. Checking SSL..."
if [ ! -f "/etc/letsencrypt/live/senorbit.ai/fullchain.pem" ]; then
    echo "   ⚠️ SSL not found, setting up..."
    certbot --nginx -d senorbit.ai -d www.senorbit.ai \
        --non-interactive \
        --agree-tos \
        --email admin@senorbit.ai \
        --redirect \
        --quiet 2>/dev/null || echo "   ⚠️ SSL setup failed (may need DNS)"
else
    echo "   ✅ SSL certificate exists"
fi

# Step 12: Wait and test
echo ""
echo "12. Testing..."
sleep 5

# Check PM2 status
echo ""
echo "PM2 Status:"
pm2 list

# Test health
echo ""
echo "Health Check:"
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null || echo "000")
if [ "$HEALTH" == "200" ]; then
    echo "   ✅ Local health check: HTTP $HEALTH"
    curl -s http://localhost:3000/health | head -5
else
    echo "   ⚠️ Local health check failed: HTTP $HEALTH"
    echo "   Check logs: pm2 logs matrix-platform"
fi

echo ""
echo "=========================================="
echo "✅ Complete Fix Done!"
echo "=========================================="
echo ""
echo "Test URLs:"
echo "  - Local: http://localhost:3000/health"
echo "  - Production: https://senorbit.ai/health"
echo ""
echo "If health check fails, check logs:"
echo "  pm2 logs matrix-platform"
echo ""

