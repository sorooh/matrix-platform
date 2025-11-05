#!/bin/bash
# Production Deployment Script - Matrix Platform v11
# Global Professional Edition

set -e

echo "🚀 Deploying Matrix Platform v11 - Global Professional Edition..."

# Build
./scripts/build-production.sh

# Deploy to Vercel
if [ "$DEPLOY_VERCEL" = "true" ]; then
  echo "🌐 Deploying to Vercel..."
  vercel deploy --prod
fi

# Deploy to Firebase
if [ "$DEPLOY_FIREBASE" = "true" ]; then
  echo "🔥 Deploying to Firebase..."
  firebase deploy --only hosting,functions
fi

# Deploy to Cloudflare
if [ "$DEPLOY_CLOUDFLARE" = "true" ]; then
  echo "☁️ Deploying to Cloudflare..."
  wrangler publish
fi

# Health check
echo "🏥 Running health checks..."
curl -f http://localhost:3000/health || echo "⚠️ Health check failed"

echo "✅ Deployment complete!"
echo "📦 Version: 11.0.0"
echo "🌍 Build: Matrix Global Professional Build"

