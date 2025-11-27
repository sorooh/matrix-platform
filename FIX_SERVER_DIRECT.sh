#!/bin/bash
# ============================================
# إصلاح مباشر على السيرفر
# Direct Server Fix
# ============================================

set -e

echo "🔧 إصلاح مباشر - Matrix Platform"
echo "=================================="

cd /opt/matrix-platform
git stash
git pull origin master

cd matrix-scaffold/backend

# Fix Prisma schema - remove everything after line 1495
echo "📊 Fixing Prisma schema..."
head -n 1495 prisma/schema.prisma > prisma/schema.prisma.fixed
mv prisma/schema.prisma.fixed prisma/schema.prisma

# Clean and install
echo "📦 Installing dependencies..."
rm -f package-lock.json
rm -rf node_modules
npm install --production --legacy-peer-deps 2>&1 | grep -v "npm WARN" || true

# Generate Prisma
echo "🔨 Generating Prisma client..."
export DATABASE_URL="postgresql://matrix:matrix_password_2025@localhost:5432/matrix"
export REDIS_URL="redis://localhost:6379"
export NODE_ENV="production"
export PORT="3000"

npx prisma generate

# Migrate
echo "📊 Running migrations..."
npx prisma migrate deploy || true

# Build
echo "🏗️ Building application..."
npm run build

# PM2
echo "🚀 Starting PM2..."
cd /opt/matrix-platform
pm2 delete matrix-platform 2>/dev/null || true
pm2 start pm2.ecosystem.config.js
pm2 save

# Nginx
echo "🌐 Reloading Nginx..."
systemctl reload nginx

# Verify
echo "✅ Verifying..."
sleep 5
curl http://localhost:3000/health && echo "✅ Done!" || echo "⚠️ Health check failed"

echo ""
echo "=================================="
echo "✅ Fix Complete!"
echo "=================================="
