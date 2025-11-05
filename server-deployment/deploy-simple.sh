#!/bin/bash
# Simple Deployment Script - Matrix Platform v11.0.0
set -e

echo "🚀 Starting deployment..."

# Update system
apt-get update -qq && apt-get upgrade -y -qq

# Install essential packages
apt-get install -y -qq curl wget git build-essential software-properties-common

# Install Node.js 20.x
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y -qq nodejs
fi

# Install PM2
npm install -g pm2

# Install Nginx
apt-get install -y -qq nginx

# Install PostgreSQL
apt-get install -y -qq postgresql postgresql-contrib

# Install Redis
apt-get install -y -qq redis-server

# Install Certbot
apt-get install -y -qq certbot python3-certbot-nginx

# Configure firewall
ufw allow 22/tcp --quiet
ufw allow 80/tcp --quiet
ufw allow 443/tcp --quiet
ufw --force enable --quiet

# Create application directory
mkdir -p /opt/matrix-platform
cd /opt/matrix-platform

# Clone repository
if [ -d ".git" ]; then
    git pull origin master
    git checkout v11.0.0
else
    git clone https://github.com/sorooh/matrix-platform.git .
    git checkout v11.0.0
fi

# Install dependencies
cd matrix-scaffold/backend
npm ci --production --quiet

# Setup PostgreSQL
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
export DATABASE_URL="postgresql://matrix:matrix_password_2025@localhost:5432/matrix"
npx prisma migrate deploy --quiet
npx prisma generate --quiet

# Build application
npm run build --quiet

# Setup Nginx
cat > /etc/nginx/sites-available/senorbit.ai << 'EOF'
server {
    listen 80;
    server_name senorbit.ai www.senorbit.ai _;
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
EOF

ln -sf /etc/nginx/sites-available/senorbit.ai /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx --quiet
systemctl start nginx

# Setup PM2
cd /opt/matrix-platform
cat > pm2.ecosystem.config.js << 'EOF'
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
      VERSION: '11.0.0'
    },
    error_file: '/var/log/matrix-platform/error.log',
    out_file: '/var/log/matrix-platform/out.log',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G'
  }]
}
EOF

mkdir -p /var/log/matrix-platform
pm2 start pm2.ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

# Setup SSL
certbot --nginx -d senorbit.ai -d www.senorbit.ai --non-interactive --agree-tos --email admin@senorbit.ai --redirect --quiet || echo "SSL setup will retry"

systemctl restart nginx

echo "✅ Deployment complete!"
echo "🌍 Matrix Platform v11.0.0 is running on https://senorbit.ai"

