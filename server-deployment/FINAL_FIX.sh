#!/bin/bash
# Final Fix - Simple and Direct

set -e

echo "=========================================="
echo "Matrix Platform - Final Fix"
echo "=========================================="
echo ""

# Step 1: Go to project
cd /opt/matrix-platform
echo "📍 Location: $(pwd)"

# Step 2: Find backend
if [ ! -d "matrix-scaffold/backend" ]; then
    echo "❌ Backend not found. Searching..."
    find . -name "package.json" -type f | head -5
    echo "Please check the project structure"
    exit 1
fi

cd matrix-scaffold/backend
echo "📍 Backend: $(pwd)"

# Step 3: Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install --omit=dev

# Step 4: Build
echo ""
echo "🔨 Building application..."
npm run build || {
    echo "⚠️ Build failed, trying with TypeScript..."
    npm install -g typescript || true
    npm run build
}

# Step 5: Check if built
if [ ! -f "dist/main.js" ]; then
    echo "❌ Build failed - dist/main.js not found"
    echo "Checking dist directory:"
    ls -la dist/ 2>/dev/null || echo "dist/ directory doesn't exist"
    exit 1
fi

echo "✅ Build successful!"

# Step 6: Start services
echo ""
echo "🚀 Starting services..."
systemctl start postgresql redis-server nginx 2>/dev/null || true

# Step 7: Setup database
echo ""
echo "🗄️ Setting up database..."
sudo -u postgres psql << PSQLEOF 2>/dev/null || true
CREATE DATABASE matrix;
CREATE USER matrix WITH ENCRYPTED PASSWORD 'matrix_password_2025';
GRANT ALL PRIVILEGES ON DATABASE matrix TO matrix;
\c matrix
GRANT ALL ON SCHEMA public TO matrix;
CREATE EXTENSION IF NOT EXISTS vector;
\q
PSQLEOF

# Step 8: PM2
echo ""
echo "🔄 Starting PM2..."
cd /opt/matrix-platform
cat > pm2.ecosystem.config.js << 'PM2EOF'
module.exports = {
  apps: [{
    name: 'matrix-platform',
    script: './matrix-scaffold/backend/dist/main.js',
    cwd: '/opt/matrix-platform',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATABASE_URL: 'postgresql://matrix:matrix_password_2025@localhost:5432/matrix',
      REDIS_URL: 'redis://localhost:6379'
    },
    autorestart: true
  }]
};
PM2EOF

pm2 delete matrix-platform 2>/dev/null || true
pm2 start pm2.ecosystem.config.js
pm2 save

# Step 9: Nginx
echo ""
echo "🌐 Configuring Nginx..."
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
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/senorbit.ai /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Step 10: Test
echo ""
echo "🧪 Testing..."
sleep 5
curl -s http://localhost:3000/health && echo "" && echo "✅ SUCCESS!" || echo "⚠️ Check: pm2 logs matrix-platform"

echo ""
echo "=========================================="

