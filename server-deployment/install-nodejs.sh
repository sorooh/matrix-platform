#!/bin/bash
# Install Node.js and npm on Ubuntu/Debian server

set -e

echo "📦 Installing Node.js and npm..."
echo "=================================="
echo ""

# Check if Node.js is already installed
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js is already installed: $NODE_VERSION"
    
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        echo "✅ npm is already installed: $NPM_VERSION"
        exit 0
    fi
fi

# Install Node.js 20.x using NodeSource repository
echo "📥 Adding NodeSource repository..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

echo "📥 Installing Node.js..."
apt-get update
apt-get install -y nodejs

# Verify installation
echo ""
echo "✅ Installation complete!"
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# Install PM2 globally
echo ""
echo "📦 Installing PM2..."
npm install -g pm2

echo ""
echo "✅ All done! Node.js, npm, and PM2 are installed."

