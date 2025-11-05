#!/bin/bash
# Deployment Script Without DNS - Matrix Platform v11.0.0
# Deploy to server first, configure DNS later
# Server IP: 46.224.42.221

set -e

echo "🚀 Deploying Matrix Platform v11.0.0 (Without DNS)..."
echo "📦 Server: senorbit-core"
echo "🌐 IP: 46.224.42.221"
echo "⚠️ Domain DNS will be configured later"
echo ""

# Step 1: Install system environment
echo "📦 Step 1: Installing system environment..."
./install-server.sh

# Step 2: Setup database
echo "🗄️ Step 2: Setting up database..."
./setup-database.sh

# Step 3: Configure Nginx for IP access
echo "🌐 Step 3: Configuring Nginx for IP access..."
cat > /etc/nginx/sites-available/matrix-platform << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    # Proxy to backend
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
        proxy_buffering off;
    }

    # Health check endpoints
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }

    location /ready {
        proxy_pass http://localhost:3000/ready;
        access_log off;
    }

    location /live {
        proxy_pass http://localhost:3000/live;
        access_log off;
    }

    # Metrics endpoint (internal only)
    location /metrics {
        proxy_pass http://localhost:3000/metrics;
        access_log off;
        allow 127.0.0.1;
        allow ::1;
        deny all;
    }

    # API routes
    location /api {
        proxy_pass http://localhost:3000/api;
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

    # Logging
    access_log /var/log/nginx/matrix-platform.access.log;
    error_log /var/log/nginx/matrix-platform.error.log;
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/matrix-platform /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Start Nginx
systemctl enable nginx
systemctl start nginx

# Step 4: Start PM2
echo "🚀 Step 4: Starting PM2..."
cd /opt/matrix-platform
cp server-deployment/pm2.config.js pm2.ecosystem.config.js
mkdir -p /var/log/matrix-platform
pm2 start pm2.ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

# Step 5: Verify deployment
echo "✅ Step 5: Verifying deployment..."
sleep 5

# Health check
echo "🏥 Running health check..."
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [ "$HEALTH_CHECK" == "200" ]; then
    echo "✅ Health check passed!"
else
    echo "⚠️ Health check returned status code: $HEALTH_CHECK"
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Service Status:"
echo "  - Nginx: $(systemctl is-active nginx)"
echo "  - PostgreSQL: $(systemctl is-active postgresql)"
echo "  - Redis: $(systemctl is-active redis-server)"
echo "  - PM2: $(pm2 jlist | jq -r '.[0].pm2_env.status')"
echo ""
echo "🔗 URLs:"
echo "  - IP Access: http://46.224.42.221"
echo "  - Health: http://46.224.42.221/health"
echo "  - Ready: http://46.224.42.221/ready"
echo "  - Live: http://46.224.42.221/live"
echo ""
echo "⚠️ IMPORTANT - Next Steps:"
echo "  1. Configure DNS records:"
echo "     - Type: A"
echo "     - Name: @"
echo "     - Content: 46.224.42.221"
echo "     - TTL: Auto"
echo ""
echo "     - Type: A"
echo "     - Name: www"
echo "     - Content: 46.224.42.221"
echo "     - TTL: Auto"
echo ""
echo "  2. Wait for DNS propagation (5-30 minutes)"
echo ""
echo "  3. Verify DNS:"
echo "     nslookup senorbit.ai"
echo "     # Should return: 46.224.42.221"
echo ""
echo "  4. Enable SSL:"
echo "     ./setup-ssl.sh"
echo ""
echo "  5. Verify HTTPS:"
echo "     curl https://senorbit.ai/health"
echo ""

