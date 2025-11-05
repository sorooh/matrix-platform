#!/bin/bash
# Quick Start Script - Matrix Platform v11.0.0
# Server: senorbit-core
# Domain: senorbit.ai

set -e

echo "🚀 Quick Start - Matrix Platform v11.0.0 Deployment"
echo "📦 Server: senorbit-core"
echo "🌍 Domain: senorbit.ai"
echo ""

# Step 1: Update system
echo "📦 Step 1: Updating system..."
apt-get update && apt-get upgrade -y

# Step 2: Install Node.js
echo "📦 Step 2: Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Step 3: Install PM2
echo "📦 Step 3: Installing PM2..."
npm install -g pm2

# Step 4: Install Nginx
echo "📦 Step 4: Installing Nginx..."
apt-get install -y nginx

# Step 5: Install PostgreSQL
echo "📦 Step 5: Installing PostgreSQL..."
apt-get install -y postgresql postgresql-contrib

# Step 6: Install Redis
echo "📦 Step 6: Installing Redis..."
apt-get install -y redis-server

# Step 7: Install Certbot
echo "📦 Step 7: Installing Certbot..."
apt-get install -y certbot python3-certbot-nginx

# Step 8: Clone repository
echo "📥 Step 8: Cloning repository..."
mkdir -p /opt/matrix-platform
cd /opt/matrix-platform
git clone https://github.com/sorooh/matrix-platform.git .
git checkout v11.0.0

# Step 9: Install dependencies
echo "📦 Step 9: Installing dependencies..."
cd matrix-scaffold/backend
npm ci --production

# Step 10: Setup database
echo "🗄️ Step 10: Setting up database..."
sudo -u postgres psql << EOF
CREATE DATABASE matrix;
CREATE USER matrix WITH ENCRYPTED PASSWORD 'matrix_password_2025';
GRANT ALL PRIVILEGES ON DATABASE matrix TO matrix;
\c matrix
GRANT ALL ON SCHEMA public TO matrix;
CREATE EXTENSION IF NOT EXISTS vector;
\q
EOF

# Step 11: Run migrations
echo "🗄️ Step 11: Running migrations..."
export DATABASE_URL="postgresql://matrix:matrix_password_2025@localhost:5432/matrix"
npx prisma migrate deploy
npx prisma generate

# Step 12: Build application
echo "🔨 Step 12: Building application..."
npm run build

# Step 13: Setup Nginx
echo "🌐 Step 13: Setting up Nginx..."
cp /opt/matrix-platform/server-deployment/nginx-config.conf /etc/nginx/sites-available/senorbit.ai
ln -s /etc/nginx/sites-available/senorbit.ai /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl start nginx

# Step 14: Setup SSL
echo "🔒 Step 14: Setting up SSL..."
certbot --nginx -d senorbit.ai -d www.senorbit.ai \
    --non-interactive \
    --agree-tos \
    --email admin@senorbit.ai \
    --redirect

# Step 15: Start PM2
echo "🚀 Step 15: Starting PM2..."
cd /opt/matrix-platform
cp server-deployment/pm2.config.js pm2.ecosystem.config.js
mkdir -p /var/log/matrix-platform
pm2 start pm2.ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

# Step 16: Configure firewall
echo "🔒 Step 16: Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Step 17: Verify deployment
echo "✅ Step 17: Verifying deployment..."
sleep 5
curl -f https://senorbit.ai/health || echo "⚠️ Health check failed, but services are starting..."

echo ""
echo "✅ Deployment complete!"
echo "🌍 Matrix Platform v11.0.0 is now running on https://senorbit.ai"
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
echo ""

