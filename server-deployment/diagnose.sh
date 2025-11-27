#!/bin/bash
# Diagnostic Script - Check everything

echo "=========================================="
echo "Matrix Platform - Diagnostic Check"
echo "=========================================="
echo ""

# Check Node.js
echo "1. Checking Node.js..."
if command -v node &> /dev/null; then
    echo "   ✅ Node.js: $(node --version)"
    echo "   ✅ npm: $(npm --version)"
else
    echo "   ❌ Node.js not installed"
    exit 1
fi

# Check project location
echo ""
echo "2. Checking project location..."
if [ -d "/opt/matrix-platform" ]; then
    echo "   ✅ /opt/matrix-platform exists"
    cd /opt/matrix-platform
    echo "   Current directory: $(pwd)"
    echo "   Contents:"
    ls -la | head -10
else
    echo "   ❌ /opt/matrix-platform not found"
    exit 1
fi

# Check backend directory
echo ""
echo "3. Checking backend directory..."
if [ -d "matrix-scaffold/backend" ]; then
    echo "   ✅ matrix-scaffold/backend exists"
    cd matrix-scaffold/backend
    echo "   Current directory: $(pwd)"
    echo "   Contents:"
    ls -la
else
    echo "   ❌ matrix-scaffold/backend not found"
    echo "   Available directories:"
    find /opt/matrix-platform -type d -maxdepth 3 | head -20
    exit 1
fi

# Check package.json
echo ""
echo "4. Checking package.json..."
if [ -f "package.json" ]; then
    echo "   ✅ package.json exists"
    echo "   Scripts available:"
    cat package.json | grep -A 10 '"scripts"' || echo "   No scripts found"
else
    echo "   ❌ package.json not found"
    exit 1
fi

# Check if dist exists
echo ""
echo "5. Checking build output..."
if [ -f "dist/main.js" ]; then
    echo "   ✅ dist/main.js exists - Application is built!"
else
    echo "   ⚠️ dist/main.js not found - Need to build"
fi

# Check Prisma
echo ""
echo "6. Checking Prisma..."
if [ -f "prisma/schema.prisma" ]; then
    echo "   ✅ prisma/schema.prisma exists"
elif [ -f "schema.prisma" ]; then
    echo "   ✅ schema.prisma exists"
else
    echo "   ⚠️ Prisma schema not found (may not be needed)"
    find . -name "*.prisma" -type f 2>/dev/null || echo "   No .prisma files found"
fi

# Check services
echo ""
echo "7. Checking services..."
systemctl is-active postgresql > /dev/null 2>&1 && echo "   ✅ PostgreSQL: running" || echo "   ❌ PostgreSQL: not running"
systemctl is-active redis-server > /dev/null 2>&1 && echo "   ✅ Redis: running" || echo "   ❌ Redis: not running"
systemctl is-active nginx > /dev/null 2>&1 && echo "   ✅ Nginx: running" || echo "   ❌ Nginx: not running"

# Check PM2
echo ""
echo "8. Checking PM2..."
if command -v pm2 &> /dev/null; then
    echo "   ✅ PM2 installed"
    pm2 list | grep matrix-platform && echo "   ✅ matrix-platform running" || echo "   ⚠️ matrix-platform not running"
else
    echo "   ❌ PM2 not installed"
fi

# Check port 3000
echo ""
echo "9. Checking port 3000..."
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "   ⚠️ Port 3000 is in use by PID: $(lsof -ti:3000)"
else
    echo "   ✅ Port 3000 is free"
fi

# Try health check
echo ""
echo "10. Testing health endpoint..."
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null || echo "000")
if [ "$HEALTH" == "200" ]; then
    echo "   ✅ Health check passed (HTTP $HEALTH)"
else
    echo "   ❌ Health check failed (HTTP $HEALTH)"
fi

echo ""
echo "=========================================="
echo "Diagnostic complete!"
echo "=========================================="

