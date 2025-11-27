#!/bin/bash
set -e

echo "🔧 Fixing Matrix Platform on Server..."
echo "======================================"

# Navigate to project
cd /opt/matrix-platform 2>/dev/null || (cd /opt && git clone https://github.com/sorooh/matrix-platform.git matrix-platform && cd matrix-platform)

# Stash local changes and pull
git stash
git pull origin master

# Fix Prisma schema
cd matrix-scaffold/backend
head -n 1495 prisma/schema.prisma > prisma/schema.prisma.fixed
mv prisma/schema.prisma.fixed prisma/schema.prisma

# Start services
systemctl start postgresql redis-server nginx 2>/dev/null || true

# Setup database
sudo -u postgres psql << 'PSQLEOF' 2>/dev/null || true
CREATE DATABASE matrix;
CREATE USER matrix WITH ENCRYPTED PASSWORD 'matrix_password_2025';
GRANT ALL PRIVILEGES ON DATABASE matrix TO matrix;
\c matrix
GRANT ALL ON SCHEMA public TO matrix;
CREATE EXTENSION IF NOT EXISTS vector;
\q
PSQLEOF

# Clean and reinstall
rm -f package-lock.json
rm -rf node_modules
npm install --production --legacy-peer-deps 2>&1 | grep -v "npm WARN" || true

# Setup environment
export DATABASE_URL="postgresql://matrix:matrix_password_2025@localhost:5432/matrix"
export REDIS_URL="redis://localhost:6379"
export NODE_ENV="production"
export PORT="3000"

# Prisma setup
npx prisma generate
npx prisma migrate deploy || true

# Build
npm run build

# PM2 setup
cd /opt/matrix-platform
command -v pm2 || npm install -g pm2

cat > pm2.ecosystem.config.js << 'PM2EOF'
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
      CORS_ORIGIN: 'https://senorbit.ai,https://www.senorbit.ai'
    },
    autorestart: true,
    max_memory_restart: '2G'
  }]
}
PM2EOF

mkdir -p /var/log/matrix-platform
pm2 delete matrix-platform 2>/dev/null || true
pm2 start pm2.ecosystem.config.js
pm2 save

# Nginx setup
cat > /etc/nginx/sites-available/senorbit.ai << 'NGINXEOF'
server {
    listen 80;
    server_name senorbit.ai www.senorbit.ai;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name senorbit.ai www.senorbit.ai;

    ssl_certificate /etc/letsencrypt/live/senorbit.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/senorbit.ai/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/senorbit.ai /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl reload nginx

# Test
sleep 5
curl http://localhost:3000/health

echo ""
echo "✅ Done! Check https://senorbit.ai"
