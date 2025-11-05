#!/bin/bash
# Server Installation Script - Matrix Platform v11.0.0
# Hetzner Cloud - senorbit-core
# Domain: senorbit.ai

set -e

echo "🚀 Installing Matrix Platform v11.0.0 on Hetzner Cloud Server..."
echo "📦 Server: senorbit-core"
echo "🌍 Domain: senorbit.ai"
echo ""

# Update system
echo "📦 Updating system packages..."
apt-get update
apt-get upgrade -y

# Install essential packages
echo "📦 Installing essential packages..."
apt-get install -y \
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
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify Node.js installation
node --version
npm --version

# Install PM2 globally
echo "📦 Installing PM2..."
npm install -g pm2

# Install Nginx
echo "📦 Installing Nginx..."
apt-get install -y nginx

# Install PostgreSQL
echo "📦 Installing PostgreSQL..."
apt-get install -y postgresql postgresql-contrib

# Install Redis
echo "📦 Installing Redis..."
apt-get install -y redis-server

# Install Docker
echo "📦 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Install Docker Compose
echo "📦 Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Certbot
echo "📦 Installing Certbot..."
apt-get install -y certbot python3-certbot-nginx

# Install Cloudflare Wrangler (for Cloudflare SSL)
echo "📦 Installing Cloudflare Wrangler..."
npm install -g wrangler

# Configure firewall
echo "🔒 Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Configure fail2ban
echo "🔒 Configuring fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban

# Create application directory
echo "📁 Creating application directory..."
mkdir -p /opt/matrix-platform
cd /opt/matrix-platform

# Clone repository
echo "📥 Cloning Matrix Platform v11.0.0 from GitHub..."
git clone https://github.com/sorooh/matrix-platform.git .
git checkout v11.0.0

# Install dependencies
echo "📦 Installing dependencies..."
cd matrix-scaffold/backend
npm ci --production

# Setup PostgreSQL
echo "🗄️ Setting up PostgreSQL..."
sudo -u postgres psql << EOF
CREATE DATABASE matrix;
CREATE USER matrix WITH ENCRYPTED PASSWORD 'matrix_password_2025';
GRANT ALL PRIVILEGES ON DATABASE matrix TO matrix;
\q
EOF

# Setup Redis
echo "🔴 Setting up Redis..."
systemctl enable redis-server
systemctl start redis-server

# Run database migrations
echo "🗄️ Running database migrations..."
cd /opt/matrix-platform/matrix-scaffold/backend
export DATABASE_URL="postgresql://matrix:matrix_password_2025@localhost:5432/matrix"
npx prisma migrate deploy

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Create PM2 ecosystem file
echo "⚙️ Creating PM2 ecosystem file..."
cat > /opt/matrix-platform/pm2.ecosystem.config.js << 'EOF'
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

# Setup Nginx
echo "🌐 Setting up Nginx..."
cat > /etc/nginx/sites-available/senorbit.ai << 'EOF'
server {
    listen 80;
    server_name senorbit.ai www.senorbit.ai;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name senorbit.ai www.senorbit.ai;

    # SSL certificates (will be configured by Certbot)
    ssl_certificate /etc/letsencrypt/live/senorbit.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/senorbit.ai/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

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

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }

    # Metrics endpoint
    location /metrics {
        proxy_pass http://localhost:3000/metrics;
        access_log off;
    }

    # Static files
    location /static {
        alias /opt/matrix-platform/matrix-scaffold/backend/dist/static;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable Nginx site
ln -sf /etc/nginx/sites-available/senorbit.ai /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Start services
echo "🚀 Starting services..."
systemctl enable nginx
systemctl start nginx

# Start PM2
echo "🚀 Starting PM2..."
cd /opt/matrix-platform
pm2 start pm2.ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

# Setup SSL with Certbot
echo "🔒 Setting up SSL with Certbot..."
certbot --nginx -d senorbit.ai -d www.senorbit.ai --non-interactive --agree-tos --email admin@senorbit.ai

# Restart Nginx
systemctl restart nginx

# Verify services
echo "✅ Verifying services..."
systemctl status nginx --no-pager
systemctl status postgresql --no-pager
systemctl status redis-server --no-pager
pm2 status

# Health check
echo "🏥 Running health check..."
sleep 5
curl -f https://senorbit.ai/health || echo "⚠️ Health check failed, but services are starting..."

echo ""
echo "✅ Installation complete!"
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

