#!/bin/bash
# DNS Check Script - Matrix Platform v11.0.0
# Domain: senorbit.ai
# Expected IP: 46.224.42.221

set -e

DOMAIN="senorbit.ai"
EXPECTED_IP="46.224.42.221"

echo "🔍 Checking DNS for $DOMAIN..."
echo ""

# Check if domain resolves
RESOLVED_IP=$(dig +short $DOMAIN | tail -n1)

if [ -z "$RESOLVED_IP" ]; then
    echo "❌ ERROR: Domain $DOMAIN does not resolve!"
    echo ""
    echo "⚠️ DNS records are not configured yet."
    echo ""
    echo "📋 Please add these DNS records:"
    echo "  Type: A"
    echo "  Name: @"
    echo "  Content: $EXPECTED_IP"
    echo "  TTL: Auto"
    echo ""
    echo "  Type: A"
    echo "  Name: www"
    echo "  Content: $EXPECTED_IP"
    echo "  TTL: Auto"
    echo ""
    echo "⏱️ Wait 5-30 minutes for DNS propagation"
    echo ""
    exit 1
fi

echo "✅ Domain resolves to: $RESOLVED_IP"

# Check if IP matches
if [ "$RESOLVED_IP" == "$EXPECTED_IP" ]; then
    echo "✅ DNS is correctly configured!"
    echo "✅ Domain $DOMAIN points to server IP $EXPECTED_IP"
    echo ""
    echo "✅ Ready for deployment!"
    exit 0
else
    echo "❌ ERROR: Domain resolves to wrong IP!"
    echo "  Expected: $EXPECTED_IP"
    echo "  Found: $RESOLVED_IP"
    echo ""
    echo "⚠️ Please update DNS records to point to $EXPECTED_IP"
    echo ""
    exit 1
fi

