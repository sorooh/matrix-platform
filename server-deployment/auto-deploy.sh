#!/bin/bash
# Auto Deployment Script - Matrix Platform v11.0.0
# Server: senorbit-core (46.224.42.221)
# Domain: senorbit.ai

set -e

SERVER_IP="46.224.42.221"
SERVER_USER="root"
SERVER_PASSWORD="q7KUVagNFehLNtUeW3un"
DOMAIN="senorbit.ai"

echo "🚀 Auto Deploying Matrix Platform v11.0.0..."
echo "📦 Server: $SERVER_IP"
echo "🌍 Domain: $DOMAIN"
echo ""

# Install sshpass if not available
if ! command -v sshpass &> /dev/null; then
    echo "📦 Installing sshpass..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update && sudo apt-get install -y sshpass
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install hudochenkov/sshpass/sshpass
    else
        echo "⚠️ Please install sshpass manually"
        echo "Or use: ssh $SERVER_USER@$SERVER_IP"
    fi
fi

# Deploy using SSH
echo "📡 Connecting to server..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP << 'ENDSSH'
set -e

echo "🚀 Starting deployment on server..."

# Update system
echo "📦 Updating system..."
apt-get update -qq
apt-get upgrade -y -qq

# Install essential packages
echo "📦 Installing essential packages..."
apt-get install -y -qq \
    curl \
    wget \
    git \
    build-essential \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    ufw \
    fail2ban \
    htop \
    nano \
    vim \
    zip \
    unzip \
    net-tools

# Install Node.js 20.x
echo "📦 Installing Node.js 20.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y -qq nodejs
fi

# Install PM2
echo "📦 Installing PM2..."
npm install -g pm2

# Install Nginx
echo "📦 Installing Nginx..."
apt-get install -y -qq nginx

# Install PostgreSQL
echo "📦 Installing PostgreSQL..."
apt-get install -y -qq postgresql postgresql-contrib

# Install Redis
echo "📦 Installing Redis..."
apt-get install -y -qq redis-server

# Install Certbot
echo "📦 Installing Certbot..."
apt-get install -y -qq certbot python3-certbot-nginx

# Configure firewall
echo "🔒 Configuring firewall..."
ufw allow 22/tcp --quiet
ufw allow 80/tcp --quiet
ufw allow 443/tcp --quiet
ufw --force enable --quiet

# Configure fail2ban
echo "🔒 Configuring fail2ban..."
systemctl enable fail2ban --quiet
systemctl start fail2ban --quiet

# Create application directory
echo "📁 Creating application directory..."
mkdir -p /opt/matrix-platform
cd /opt/matrix-platform

# Clone repository
echo "📥 Cloning repository..."
if [ -d ".git" ]; then
    echo "📥 Repository exists, pulling latest..."
    git pull origin master
    git checkout v11.0.0
else
    git clone https://github.com/sorooh/matrix-platform.git .
    git checkout v11.0.0
fi

# Install dependencies
echo "📦 Installing dependencies..."
cd matrix-scaffold/backend
npm ci --production --quiet

# Setup PostgreSQL
echo "🗄️ Setting up PostgreSQL..."
sudo -u postgres psql << EOF
CREATE DATABASE matrix;
CREATE USER matrix WITH ENCRYPTED PASSWORD 'matrix_password_2025';
GRANT ALL PRIVILEGES ON DATABASE matrix TO matrix;
\c matrix
GRANT ALL ON SCHEMA public TO matrix;
CREATE EXTENSION IF NOT EXISTS vector;
\q
EOF

# Run migrations
echo "🗄️ Running migrations..."
export DATABASE_URL="postgresql://matrix:matrix_password_2025@localhost:5432/matrix"
npx prisma migrate deploy --quiet
npx prisma generate --quiet

# Build application
echo "🔨 Building application..."
npm run build --quiet

# Setup Nginx
echo "🌐 Setting up Nginx..."
cat > /etc/nginx/sites-available/senorbit.ai << 'EOF'
server {
    listen 80;
    server_name senorbit.ai www.senorbit.ai _;

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
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/senorbit.ai /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Start Nginx
systemctl enable nginx --quiet
systemctl start nginx

# Setup PM2
echo "⚙️ Setting up PM2..."
cd /opt/matrix-platform
cat > pm2.ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
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
        VERSION: '11.0.0'
      },
      error_file: '/var/log/matrix-platform/error.log',
      out_file: '/var/log/matrix-platform/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '1G',
      watch: false
    }
  ]
}
EOF

# Create logs directory
mkdir -p /var/log/matrix-platform

# Start PM2
echo "🚀 Starting PM2..."
pm2 start pm2.ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

# Setup SSL
echo "🔒 Setting up SSL..."
certbot --nginx -d senorbit.ai -d www.senorbit.ai \
    --non-interactive \
    --agree-tos \
    --email admin@senorbit.ai \
    --redirect \
    --quiet || echo "⚠️ SSL setup failed, will retry later"

# Restart Nginx
systemctl restart nginx

# Verify deployment
echo "✅ Verifying deployment..."
sleep 5

# Health check
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
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
echo "  - Ready: https://senorbit.ai/ready"
echo "  - Live: https://senorbit.ai/live"
echo ""
echo "✅ Deployment complete!"

ENDSSH

echo ""
echo "✅ Auto deployment complete!"
echo "🌍 Matrix Platform v11.0.0 is now running on https://senorbit.ai"
echo ""
echo "📊 Verify deployment:"
echo "  curl https://senorbit.ai/health"
echo ""

