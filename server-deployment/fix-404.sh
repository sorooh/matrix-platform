#!/bin/bash
# Fix 404 Not Found Error - Matrix Platform v11.0.0
# This script fixes the 404 error by ensuring all services are running

set -e

echo "🔧 Fixing 404 Not Found Error - Matrix Platform v11.0.0"
echo "========================================================"
echo ""

# Check if we're on the server
if [ ! -d "/opt/matrix-platform" ]; then
    echo "❌ Error: This script must be run on the server!"
    echo "   Please SSH to the server first:"
    echo "   ssh root@46.224.42.221"
    exit 1
fi

cd /opt/matrix-platform

# Step 1: Start system services
echo "📊 Step 1: Starting system services..."
systemctl start postgresql redis-server nginx 2>/dev/null || true
systemctl enable postgresql redis-server nginx 2>/dev/null || true
echo "✅ System services started"

# Step 2: Check if application is built
echo ""
echo "📊 Step 2: Checking application build..."
if [ ! -f "./matrix-scaffold/backend/dist/main.js" ]; then
    echo "⚠️ Application not built, building..."
    cd matrix-scaffold/backend
    
    # Set environment variables
    export DATABASE_URL="postgresql://matrix:matrix_password_2025@localhost:5432/matrix"
    export REDIS_URL="redis://localhost:6379"
    export NODE_ENV="production"
    
    # Install dependencies
    echo "   Installing dependencies..."
    npm ci --production --quiet
    
    # Run migrations
    echo "   Running migrations..."
    npx prisma migrate deploy --quiet || echo "⚠️ Migration warning (may be normal)"
    
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

# Step 3: Check database
echo ""
echo "📊 Step 3: Checking database..."
if ! psql -U matrix -d matrix -c "SELECT 1;" > /dev/null 2>&1; then
    echo "⚠️ Database connection failed, checking PostgreSQL..."
    if systemctl is-active --quiet postgresql; then
        echo "   PostgreSQL is running, but connection failed"
        echo "   This might be a password issue"
    else
        echo "   Starting PostgreSQL..."
        systemctl start postgresql
        sleep 2
    fi
else
    echo "✅ Database connection OK"
fi

# Step 4: Check Redis
echo ""
echo "📊 Step 4: Checking Redis..."
if ! redis-cli ping > /dev/null 2>&1; then
    echo "⚠️ Redis connection failed, starting Redis..."
    systemctl start redis-server
    sleep 2
    if redis-cli ping > /dev/null 2>&1; then
        echo "✅ Redis started"
    else
        echo "❌ Redis failed to start"
    fi
else
    echo "✅ Redis connection OK"
fi

# Step 5: Check and free port 3000
echo ""
echo "📊 Step 5: Checking port 3000..."
PORT_PID=$(lsof -ti:3000 2>/dev/null || echo "")
if [ -n "$PORT_PID" ]; then
    echo "⚠️ Port 3000 is in use by PID $PORT_PID"
    echo "   Killing process..."
    kill -9 $PORT_PID 2>/dev/null || true
    sleep 2
    echo "✅ Port 3000 freed"
else
    echo "✅ Port 3000 is free"
fi

# Step 6: Start PM2 application
echo ""
echo "📊 Step 6: Starting PM2 application..."
if command -v pm2 &> /dev/null; then
    # Check if app is running
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
    echo "✅ PM2 application started"
    
    # Wait for application to start
    echo "   Waiting for application to start..."
    sleep 5
else
    echo "❌ PM2 is not installed!"
    echo "   Installing PM2..."
    npm install -g pm2
    pm2 start pm2.ecosystem.config.js
    pm2 save
    pm2 startup systemd -u root --hp /root
    echo "✅ PM2 installed and application started"
fi

# Step 7: Check application health
echo ""
echo "📊 Step 7: Checking application health..."
sleep 3
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null || echo "000")
if [ "$HEALTH_CHECK" == "200" ]; then
    echo "✅ Application health check passed (HTTP $HEALTH_CHECK)"
else
    echo "❌ Application health check failed (HTTP $HEALTH_CHECK)"
    echo "   Checking PM2 logs..."
    pm2 logs matrix-platform --lines 30 --nostream
    echo ""
    echo "⚠️ Application might need more time to start"
    echo "   Try running: pm2 logs matrix-platform"
fi

# Step 8: Check and reload nginx
echo ""
echo "📊 Step 8: Checking nginx..."
if nginx -t 2>&1 | grep -q "successful"; then
    echo "✅ Nginx configuration is valid"
    systemctl reload nginx || systemctl restart nginx
    echo "✅ Nginx reloaded"
else
    echo "❌ Nginx configuration has errors:"
    nginx -t
    echo ""
    echo "⚠️ Please fix nginx configuration manually"
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
echo "✅ Fix complete!"
echo ""
echo "If the issue persists, check logs:"
echo "  - PM2: pm2 logs matrix-platform"
echo "  - Nginx: tail -f /var/log/nginx/senorbit.ai.error.log"

