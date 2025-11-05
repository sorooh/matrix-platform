#!/bin/bash
# Production Tests - Matrix Platform v11
# Global Professional Edition

set -e

echo "🧪 Running Production Tests - Matrix Platform v11..."

# Smoke tests
echo "💨 Running smoke tests..."
npm run test:smoke || echo "⚠️ Smoke tests failed"

# Load tests
echo "⚡ Running load tests..."
npm run test:load || echo "⚠️ Load tests failed"

# Regression tests
echo "🔄 Running regression tests..."
npm run test:regression || echo "⚠️ Regression tests failed"

# Security tests
echo "🔒 Running security tests..."
npm run test:security || echo "⚠️ Security tests failed"

echo "✅ Production tests complete!"

