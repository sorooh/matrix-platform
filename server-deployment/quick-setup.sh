#!/bin/bash
# Quick Setup - Matrix Platform
# Run this directly on the server

echo "🔧 Quick Setup - Matrix Platform"
echo "================================"
echo ""

# Create directories
mkdir -p /opt/matrix-platform/server-deployment
mkdir -p /opt/matrix-platform/matrix-scaffold/backend
mkdir -p /var/log/matrix-platform

# Copy setup script
cat > /opt/matrix-platform/server-deployment/setup-and-fix.sh << 'SCRIPT_END'
#!/bin/bash
# This is the setup script content - will be created on server
SCRIPT_END

echo "✅ Directories created"
echo ""
echo "Now run the full setup:"
echo "cd /opt/matrix-platform/server-deployment"
echo "chmod +x setup-and-fix.sh"
echo "./setup-and-fix.sh"

