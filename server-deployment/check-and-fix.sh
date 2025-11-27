#!/bin/bash
# Check and Fix Server Status - Matrix Platform v11.0.0
# This script checks server status and fixes issues

set -e

echo "🔍 Checking server status..."
echo ""

# Check if we're on the server
if [ ! -d "/opt/matrix-platform" ]; then
    echo "❌ Error: This script must be run on the server!"
    echo "   Please SSH to the server first:"
    echo "   ssh root@46.224.42.221"
    exit 1
fi

# Check Nginx
echo "📊 Checking Nginx..."
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
else
    echo "❌ Nginx is not running, starting..."
    systemctl start nginx
    systemctl enable nginx
    echo "✅ Nginx started"
fi

# Check PostgreSQL
echo "📊 Checking PostgreSQL..."
if systemctl is-active --quiet postgresql; then
    echo "✅ PostgreSQL is running"
else
    echo "❌ PostgreSQL is not running, starting..."
    systemctl start postgresql
    systemctl enable postgresql
    echo "✅ PostgreSQL started"
fi

# Check Redis
echo "📊 Checking Redis..."
if systemctl is-active --quiet redis-server; then
    echo "✅ Redis is running"
else
    echo "❌ Redis is not running, starting..."
    systemctl start redis-server
    systemctl enable redis-server
    echo "✅ Redis started"
fi

# Check PM2
echo "📊 Checking PM2..."
if command -v pm2 &> /dev/null; then
    PM2_STATUS=$(pm2 jlist | jq -r '.[0].pm2_env.status' 2>/dev/null || echo "not_running")
    if [ "$PM2_STATUS" == "online" ]; then
        echo "✅ PM2 application is running"
    else
        echo "❌ PM2 application is not running, starting..."
        cd /opt/matrix-platform
        
        # Check if application exists
        if [ ! -f "./matrix-scaffold/backend/dist/main.js" ]; then
            echo "⚠️ Application not built, building..."
            cd matrix-scaffold/backend
            export DATABASE_URL="postgresql://matrix:matrix_password_2025@localhost:5432/matrix"
            npm ci --production --quiet
            npx prisma migrate deploy --quiet
            npx prisma generate --quiet
            npm run build --quiet
            cd /opt/matrix-platform
        fi
        
        # Start PM2
        pm2 start pm2.ecosystem.config.js || {
            echo "⚠️ PM2 start failed, checking logs..."
            pm2 logs matrix-platform --lines 50 --nostream
            exit 1
        }
        pm2 save
        echo "✅ PM2 application started"
    fi
else
    echo "❌ PM2 is not installed!"
    echo "   Installing PM2..."
    npm install -g pm2
    echo "✅ PM2 installed"
fi

# Check application health
echo ""
echo "🏥 Checking application health..."
sleep 3
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null || echo "000")
if [ "$HEALTH_CHECK" == "200" ]; then
    echo "✅ Application health check passed (HTTP $HEALTH_CHECK)"
else
    echo "❌ Application health check failed (HTTP $HEALTH_CHECK)"
    echo "   Checking PM2 logs..."
    pm2 logs matrix-platform --lines 50 --nostream
fi

# Check Nginx configuration
echo ""
echo "🌐 Checking Nginx configuration..."
if nginx -t 2>&1 | grep -q "successful"; then
    echo "✅ Nginx configuration is valid"
    systemctl reload nginx
else
    echo "❌ Nginx configuration has errors:"
    nginx -t
fi

# Check SSL
echo ""
echo "🔒 Checking SSL certificate..."
if [ -f "/etc/letsencrypt/live/senorbit.ai/fullchain.pem" ]; then
    echo "✅ SSL certificate exists"
    # Check if certificate is valid
    CERT_EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/senorbit.ai/fullchain.pem 2>/dev/null | cut -d= -f2)
    if [ -n "$CERT_EXPIRY" ]; then
        echo "   Certificate expires: $CERT_EXPIRY"
    fi
else
    echo "⚠️ SSL certificate not found"
    echo "   Setting up SSL..."
    certbot --nginx -d senorbit.ai -d www.senorbit.ai \
        --non-interactive \
        --agree-tos \
        --email admin@senorbit.ai \
        --redirect \
        --quiet || echo "⚠️ SSL setup failed, will retry later"
fi

# Final status
echo ""
echo "📊 Final Status:"
echo "  - Nginx: $(systemctl is-active nginx)"
echo "  - PostgreSQL: $(systemctl is-active postgresql)"
echo "  - Redis: $(systemctl is-active redis-server)"
echo "  - PM2: $(pm2 jlist | jq -r '.[0].pm2_env.status' 2>/dev/null || echo 'not_running')"
echo "  - Health: HTTP $HEALTH_CHECK"
echo ""
echo "🔗 URLs:"
echo "  - Production: https://senorbit.ai"
echo "  - Health: https://senorbit.ai/health"
echo "  - Ready: https://senorbit.ai/ready"
echo "  - Live: https://senorbit.ai/live"
echo ""
echo "✅ Check complete!"


