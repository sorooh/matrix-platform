#!/bin/bash
# Complete Deployment Script - Matrix Platform v11.0.0
# Hetzner Cloud - senorbit-core
# Domain: senorbit.ai

set -e

echo "🚀 Deploying Matrix Platform v11.0.0..."
echo "📦 Server: senorbit-core"
echo "🌍 Domain: senorbit.ai"
echo ""

# Step 1: Install system environment
echo "📦 Step 1: Installing system environment..."
./install-server.sh

# Step 2: Setup database
echo "🗄️ Step 2: Setting up database..."
./setup-database.sh

# Step 3: Setup SSL
echo "🔒 Step 3: Setting up SSL..."
./setup-ssl.sh

# Step 4: Start services
echo "🚀 Step 4: Starting services..."
cd /opt/matrix-platform
pm2 restart all
pm2 save

# Step 5: Verify deployment
echo "✅ Step 5: Verifying deployment..."
sleep 5

# Health check
echo "🏥 Running health check..."
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" https://senorbit.ai/health)
if [ "$HEALTH_CHECK" == "200" ]; then
    echo "✅ Health check passed!"
else
    echo "⚠️ Health check returned status code: $HEALTH_CHECK"
fi

# Service status
echo ""
echo "📊 Service Status:"
echo "  - Nginx: $(systemctl is-active nginx)"
echo "  - PostgreSQL: $(systemctl is-active postgresql)"
echo "  - Redis: $(systemctl is-active redis-server)"
echo "  - PM2: $(pm2 jlist | jq -r '.[0].pm2_env.status')"
echo ""
echo "🔗 URLs:"
echo "  - Production: https://senorbit.ai"
echo "  - Health: https://senorbit.ai/health"
echo "  - Metrics: https://senorbit.ai/metrics"
echo "  - Ready: https://senorbit.ai/ready"
echo "  - Live: https://senorbit.ai/live"
echo ""
echo "✅ Deployment complete!"
echo "🌍 Matrix Platform v11.0.0 is now running on https://senorbit.ai"

