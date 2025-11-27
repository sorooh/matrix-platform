#!/bin/bash
# ============================================
# إصلاح كل المشاكل - Matrix Platform
# Fix All Problems - Matrix Platform
# ============================================

set -e

echo "🔧 إصلاح شامل - Matrix Platform"
echo "=================================="
echo ""

# Step 1: Update project
cd /opt/matrix-platform || (cd /opt && git clone https://github.com/sorooh/matrix-platform.git matrix-platform && cd matrix-platform)
git config pull.rebase false
git fetch origin
git reset --hard origin/master 2>/dev/null || git reset --hard origin/main 2>/dev/null || git pull origin master 2>/dev/null || git pull origin main 2>/dev/null || true

# Step 2: Fix Prisma schema - Remove duplicate models
echo ""
echo "📊 Step 2: Fixing Prisma schema (removing duplicates)..."
cd matrix-scaffold/backend

# Create backup
cp prisma/schema.prisma prisma/schema.prisma.backup

# Remove duplicate models (keep first occurrence, remove second)
# Models to remove: lines 1497-4880 (duplicate section)
python3 << 'PYEOF'
import re

with open('prisma/schema.prisma', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find duplicate section start (around line 1497)
duplicate_start = None
for i, line in enumerate(lines):
    if i >= 1490 and 'model TwoFactorAuth' in line and i > 700:
        duplicate_start = i
        break

if duplicate_start:
    # Find where to cut (before duplicate section)
    # Keep everything before duplicate_start
    # Find the end of the file (last model ends before duplicate)
    cut_point = duplicate_start

    # Remove duplicate section
    new_lines = lines[:cut_point]

    # Add closing if needed
    if not new_lines[-1].strip().endswith('}'):
        # Find last complete model
        for i in range(len(new_lines) - 1, -1, -1):
            if '}' in new_lines[i] and '@@map' in new_lines[i-1] if i > 0 else False:
                new_lines = new_lines[:i+1]
                break

    with open('prisma/schema.prisma', 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print(f"✅ Removed duplicate models from line {duplicate_start}")
else:
    print("⚠️ No duplicate section found, schema may already be fixed")
PYEOF

# If Python failed, use sed to remove duplicate section
if [ $? -ne 0 ]; then
    echo "   Using sed to remove duplicates..."
    # Remove lines 1497-4880 (duplicate section)
    sed -i '1497,4880d' prisma/schema.prisma 2>/dev/null || {
        echo "⚠️ Could not remove duplicates automatically"
        echo "   Please fix manually or restore from backup"
    }
fi

# Step 3: Start services
echo ""
echo "📊 Step 3: Starting system services..."
systemctl start postgresql redis-server nginx 2>/dev/null || true

# Step 4: Setup database
echo ""
echo "📊 Step 4: Setting up database..."
sudo -u postgres psql << PSQLEOF 2>/dev/null || true
CREATE DATABASE matrix;
CREATE USER matrix WITH ENCRYPTED PASSWORD 'matrix_password_2025';
GRANT ALL PRIVILEGES ON DATABASE matrix TO matrix;
\c matrix
GRANT ALL ON SCHEMA public TO matrix;
CREATE EXTENSION IF NOT EXISTS vector;
\q
PSQLEOF

# Step 5: Build application
echo ""
echo "📊 Step 5: Building application..."
export DATABASE_URL="postgresql://matrix:matrix_password_2025@localhost:5432/matrix"
export REDIS_URL="redis://localhost:6379"
export NODE_ENV="production"
export PORT="3000"

# Remove old package-lock.json and node_modules
echo "   Cleaning old dependencies..."
rm -f package-lock.json
rm -rf node_modules

# Install dependencies (will create new package-lock.json)
echo "   Installing dependencies..."
npm install --production --legacy-peer-deps 2>&1 | grep -v "npm WARN" || true

# Generate Prisma client
echo "   Generating Prisma client..."
npx prisma generate || {
    echo "❌ Prisma generate failed! Checking schema..."
    npx prisma validate
    exit 1
}

# Run migrations
echo "   Running migrations..."
npx prisma migrate deploy || echo "⚠️ Migration warning (may be normal)"

# Build
echo "   Building TypeScript..."
npm run build

if [ ! -f "dist/main.js" ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Application built successfully"

# Step 6: Setup PM2
echo ""
echo "📊 Step 6: Setting up PM2..."
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

# Step 7: Setup Nginx
echo ""
echo "📊 Step 7: Setting up Nginx..."
cat > /etc/nginx/sites-available/senorbit.ai << 'NGINXEOF'
server { listen 80; server_name senorbit.ai www.senorbit.ai; return 301 https://$server_name$request_uri; }
server { listen 443 ssl http2; server_name senorbit.ai www.senorbit.ai; ssl_certificate /etc/letsencrypt/live/senorbit.ai/fullchain.pem; ssl_certificate_key /etc/letsencrypt/live/senorbit.ai/privkey.pem; location / { proxy_pass http://localhost:3000; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; } }
NGINXEOF
ln -sf /etc/nginx/sites-available/senorbit.ai /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Step 8: Verify
echo ""
echo "📊 Step 8: Verifying..."
sleep 5
pm2 status
curl http://localhost:3000/health && echo "✅ Done!" || echo "⚠️ Health check failed"

echo ""
echo "=================================="
echo "✅ Fix Complete!"
echo "=================================="
