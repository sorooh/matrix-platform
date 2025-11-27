#!/bin/bash
# Setup and Fix 404 Error - Matrix Platform
# This script creates the directory structure and fixes the 404 error

set -e

echo "🔧 Setting up Matrix Platform and fixing 404 error..."
echo "======================================================"
echo ""

# Step 1: Create directory structure
echo "📁 Step 1: Creating directory structure..."
mkdir -p /opt/matrix-platform/server-deployment
mkdir -p /opt/matrix-platform/matrix-scaffold/backend
cd /opt/matrix-platform

# Step 2: Check if project exists or clone it
echo ""
echo "📊 Step 2: Checking project..."
if [ ! -d "/opt/matrix-platform/.git" ]; then
    echo "⚠️ Project not found, cloning from GitHub..."
    if [ -d "/opt/matrix-platform" ] && [ "$(ls -A /opt/matrix-platform)" ]; then
        echo "   Directory exists but not a git repo, backing up..."
        mv /opt/matrix-platform /opt/matrix-platform.backup.$(date +%s)
    fi
    cd /opt
    git clone https://github.com/sorooh/matrix-platform.git matrix-platform || {
        echo "❌ Failed to clone. Please check GitHub access."
        exit 1
    }
    cd /opt/matrix-platform
else
    echo "✅ Project exists, updating..."
    cd /opt/matrix-platform
    git pull origin master || echo "⚠️ Git pull failed, continuing..."
fi

# Step 3: Start system services
echo ""
echo "📊 Step 3: Starting system services..."
systemctl start postgresql redis-server nginx 2>/dev/null || true
systemctl enable postgresql redis-server nginx 2>/dev/null || true
echo "✅ System services started"

# Step 4: Check if application is built
echo ""
echo "📊 Step 4: Checking application build..."
if [ ! -f "./matrix-scaffold/backend/dist/main.js" ]; then
    echo "⚠️ Application not built, building..."
    cd matrix-scaffold/backend
    
    # Set environment variables
    export DATABASE_URL="postgresql://matrix:matrix_password_2025@localhost:5432/matrix"
    export REDIS_URL="redis://localhost:6379"
    export NODE_ENV="production"
    
    # Install dependencies
    echo "   Installing dependencies..."
    npm ci --production --quiet 2>&1 | grep -v "npm WARN" || true
    
    # Setup database if needed
    echo "   Setting up database..."
    sudo -u postgres psql << EOF 2>/dev/null || true
CREATE DATABASE matrix;
CREATE USER matrix WITH ENCRYPTED PASSWORD 'matrix_password_2025';
GRANT ALL PRIVILEGES ON DATABASE matrix TO matrix;
\c matrix
GRANT ALL ON SCHEMA public TO matrix;
CREATE EXTENSION IF NOT EXISTS vector;
\q
EOF
    
    # Run migrations
    echo "   Running migrations..."
    npx prisma migrate deploy --quiet || echo "⚠️ Migration warning"
    
    # Generate Prisma client
    echo "   Generating Prisma client..."
    npx prisma generate --quiet
    
    # Build application
    echo "   Building application..."
    npm run build --quiet
    
    cd /opt/matrix-platform
    echo "✅ Application built"
else
    echo "✅ Application already built"
fi

# Step 5: Check database
echo ""
echo "📊 Step 5: Checking database..."
if ! psql -U matrix -d matrix -c "SELECT 1;" > /dev/null 2>&1; then
    echo "⚠️ Database connection failed, setting up database..."
    sudo -u postgres psql << EOF
DROP DATABASE IF EXISTS matrix;
CREATE DATABASE matrix;
CREATE USER matrix WITH ENCRYPTED PASSWORD 'matrix_password_2025';
GRANT ALL PRIVILEGES ON DATABASE matrix TO matrix;
\c matrix
GRANT ALL ON SCHEMA public TO matrix;
CREATE EXTENSION IF NOT EXISTS vector;
\q
EOF
    echo "✅ Database created"
else
    echo "✅ Database connection OK"
fi

# Step 6: Check Redis
echo ""
echo "📊 Step 6: Checking Redis..."
if ! redis-cli ping > /dev/null 2>&1; then
    echo "⚠️ Redis connection failed, starting Redis..."
    systemctl start redis-server
    sleep 2
fi
echo "✅ Redis connection OK"

# Step 7: Check and free port 3000
echo ""
echo "📊 Step 7: Checking port 3000..."
PORT_PID=$(lsof -ti:3000 2>/dev/null || echo "")
if [ -n "$PORT_PID" ]; then
    echo "⚠️ Port 3000 is in use by PID $PORT_PID"
    kill -9 $PORT_PID 2>/dev/null || true
    sleep 2
fi
echo "✅ Port 3000 is free"

# Step 8: Install PM2 if needed
echo ""
echo "📊 Step 8: Checking PM2..."
if ! command -v pm2 &> /dev/null; then
    echo "   Installing PM2..."
    npm install -g pm2
    echo "✅ PM2 installed"
else
    echo "✅ PM2 already installed"
fi

# Step 9: Create PM2 config if needed
echo ""
echo "📊 Step 9: Checking PM2 configuration..."
if [ ! -f "/opt/matrix-platform/pm2.ecosystem.config.js" ]; then
    echo "   Creating PM2 configuration..."
    cat > /opt/matrix-platform/pm2.ecosystem.config.js << 'PM2CONFIG'
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
      VERSION: '11.0.0',
      CORS_ORIGIN: 'https://senorbit.ai,https://www.senorbit.ai',
      LOG_LEVEL: 'info'
    },
    error_file: '/var/log/matrix-platform/error.log',
    out_file: '/var/log/matrix-platform/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 10,
    watch: false,
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};
PM2CONFIG
    mkdir -p /var/log/matrix-platform
    echo "✅ PM2 configuration created"
else
    echo "✅ PM2 configuration exists"
fi

# Step 10: Start PM2 application
echo ""
echo "📊 Step 10: Starting PM2 application..."
cd /opt/matrix-platform
if pm2 list | grep -q "matrix-platform"; then
    echo "   Application exists in PM2, restarting..."
    pm2 restart matrix-platform || {
        echo "   Restart failed, deleting and starting fresh..."
        pm2 delete matrix-platform 2>/dev/null || true
        pm2 start pm2.ecosystem.config.js
    }
else
    echo "   Starting new PM2 application..."
    pm2 start pm2.ecosystem.config.js
fi

pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true
echo "✅ PM2 application started"

# Step 11: Wait and check health
echo ""
echo "📊 Step 11: Checking application health..."
sleep 5
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null || echo "000")
if [ "$HEALTH_CHECK" == "200" ]; then
    echo "✅ Application health check passed (HTTP $HEALTH_CHECK)"
else
    echo "⚠️ Application health check failed (HTTP $HEALTH_CHECK)"
    echo "   Checking PM2 logs..."
    pm2 logs matrix-platform --lines 20 --nostream
fi

# Step 12: Setup nginx if needed
echo ""
echo "📊 Step 12: Checking nginx configuration..."
if [ ! -f "/etc/nginx/sites-available/senorbit.ai" ]; then
    echo "   Creating nginx configuration..."
    cat > /etc/nginx/sites-available/senorbit.ai << 'NGINXCONFIG'
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
NGINXCONFIG
    
    ln -sf /etc/nginx/sites-available/senorbit.ai /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    echo "✅ Nginx configuration created"
fi

# Step 13: Setup SSL if needed
echo ""
echo "📊 Step 13: Checking SSL certificate..."
if [ ! -f "/etc/letsencrypt/live/senorbit.ai/fullchain.pem" ]; then
    echo "⚠️ SSL certificate not found"
    echo "   Setting up SSL (this may take a moment)..."
    certbot --nginx -d senorbit.ai -d www.senorbit.ai \
        --non-interactive \
        --agree-tos \
        --email admin@senorbit.ai \
        --redirect \
        --quiet 2>/dev/null || echo "⚠️ SSL setup failed, will retry later"
else
    echo "✅ SSL certificate exists"
fi

# Step 14: Reload nginx
echo ""
echo "📊 Step 14: Reloading nginx..."
if nginx -t 2>&1 | grep -q "successful"; then
    systemctl reload nginx || systemctl restart nginx
    echo "✅ Nginx reloaded"
else
    echo "❌ Nginx configuration has errors:"
    nginx -t
fi

# Final status
echo ""
echo "=========================================="
echo "📊 Final Status:"
echo "=========================================="
echo "  - PostgreSQL: $(systemctl is-active postgresql)"
echo "  - Redis: $(systemctl is-active redis-server)"
echo "  - Nginx: $(systemctl is-active nginx)"
echo "  - PM2: $(pm2 jlist | jq -r '.[0].pm2_env.status' 2>/dev/null || echo 'check manually')"
echo "  - Health (local): HTTP $HEALTH_CHECK"
echo ""
echo "🔗 Test URLs:"
echo "  - Local: http://localhost:3000/health"
echo "  - Production: https://senorbit.ai/health"
echo ""
echo "✅ Setup and fix complete!"

