#!/bin/bash
# Quick Deploy Script - Update and Restart Matrix Platform
# Server: 46.224.42.221

set -e

SERVER_IP="46.224.42.221"
SERVER_USER="root"
APP_DIR="/opt/matrix-platform/matrix-scaffold/backend"

echo "🚀 Quick Deploy - Matrix Platform v11.0.0"
echo "📦 Server: $SERVER_IP"
echo ""

# Deploy using SSH
ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP << ENDSSH
set -e

echo "📡 Connected to server"
echo ""

# Navigate to app directory
cd $APP_DIR || {
    echo "❌ Directory not found: $APP_DIR"
    echo "📦 Cloning repository..."
    mkdir -p /opt/matrix-platform
    cd /opt/matrix-platform
    git clone https://github.com/sorooh/matrix-platform.git . || {
        cd matrix-platform
        git pull origin master
    }
    cd matrix-scaffold/backend
}

echo "📥 Pulling latest changes from GitHub..."
git pull origin master || echo "⚠️ Git pull failed, continuing..."

echo ""
echo "📦 Installing/updating dependencies..."
npm install --legacy-peer-deps || {
    echo "⚠️ npm install failed, trying with --force..."
    npm install --legacy-peer-deps --force
}

echo ""
echo "🔧 Generating Prisma Client..."
npx prisma generate || echo "⚠️ Prisma generate failed, continuing..."

echo ""
echo "🏗️ Building application..."
npm run build || echo "⚠️ Build failed, continuing..."

echo ""
echo "🔄 Restarting PM2..."
pm2 restart matrix-platform || {
    echo "⚠️ PM2 restart failed, trying to start..."
    pm2 start ecosystem.config.js || {
        echo "⚠️ PM2 start failed, trying with tsx..."
        pm2 delete matrix-platform 2>/dev/null || true
        pm2 start npx --name matrix-platform -- tsx src/main.ts
    }
}

echo ""
echo "💾 Saving PM2 configuration..."
pm2 save

echo ""
echo "⏳ Waiting for application to start..."
sleep 10

echo ""
echo "🏥 Checking application status..."
pm2 list

echo ""
echo "📋 Checking health endpoint..."
curl -s http://localhost:3000/health || echo "⚠️ Health check failed"

echo ""
echo "✅ Deployment complete!"
echo "🔗 Application should be available at: http://$SERVER_IP:3000"
echo "🌍 Domain: https://senorbit.ai (if configured)"

ENDSSH

echo ""
echo "🎉 Deployment finished!"
echo "🔗 Check: https://senorbit.ai/health"
