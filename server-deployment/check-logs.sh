#!/bin/bash
# Check PM2 logs for matrix-platform

echo "📋 Error Logs:"
echo "=============="
ssh root@46.224.42.221 'cd /opt/matrix-platform/matrix-scaffold/backend && pm2 logs matrix-platform --err --lines 50 --nostream'

echo ""
echo "📋 All Logs:"
echo "============"
ssh root@46.224.42.221 'cd /opt/matrix-platform/matrix-scaffold/backend && pm2 logs matrix-platform --lines 50 --nostream'
