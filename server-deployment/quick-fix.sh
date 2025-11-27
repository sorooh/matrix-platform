#!/bin/bash
# Quick Fix Script - Matrix Platform v11.0.0
# Run this on the server to fix issues quickly

set -e

echo "🔧 Quick Fix Script - Matrix Platform v11.0.0"
echo "=============================================="
echo ""

# Navigate to application directory
cd /opt/matrix-platform || {
    echo "❌ Error: /opt/matrix-platform not found!"
    echo "   Please run the deployment script first"
    exit 1
}

# Start services
echo "🔄 Starting services..."
systemctl start nginx postgresql redis-server 2>/dev/null || true
systemctl enable nginx postgresql redis-server 2>/dev/null || true

# Check PM2
echo "🔄 Checking PM2..."
if command -v pm2 &> /dev/null; then
    # Check if app is running
    if pm2 list | grep -q "matrix-platform"; then
        echo "   Restarting PM2 application..."
        pm2 restart matrix-platform || pm2 start pm2.ecosystem.config.js
    else
        echo "   Starting PM2 application..."
        pm2 start pm2.ecosystem.config.js
    fi
    pm2 save
else
    echo "⚠️ PM2 not installed, installing..."
    npm install -g pm2
    pm2 start pm2.ecosystem.config.js
    pm2 save
    pm2 startup systemd -u root --hp /root
fi

# Reload Nginx
echo "🔄 Reloading Nginx..."
systemctl reload nginx || systemctl restart nginx

# Wait a bit
echo "⏳ Waiting 5 seconds..."
sleep 5

# Check health
echo "🏥 Checking health..."
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null || echo "000")
if [ "$HEALTH" == "200" ]; then
    echo "✅ Health check passed!"
else
    echo "⚠️ Health check failed (HTTP $HEALTH)"
    echo "   Checking PM2 logs..."
    pm2 logs matrix-platform --lines 20 --nostream
fi

echo ""
echo "✅ Quick fix complete!"
echo ""
echo "📊 Status:"
echo "  - Nginx: $(systemctl is-active nginx)"
echo "  - PostgreSQL: $(systemctl is-active postgresql)"
echo "  - Redis: $(systemctl is-active redis-server)"
echo "  - PM2: $(pm2 jlist | jq -r '.[0].pm2_env.status' 2>/dev/null || echo 'check manually')"
echo ""
echo "🔗 Test: https://senorbit.ai/health"


