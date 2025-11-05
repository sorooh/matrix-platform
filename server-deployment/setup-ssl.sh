#!/bin/bash
# SSL Setup Script - Matrix Platform v11.0.0
# Options: Certbot or Cloudflare

set -e

DOMAIN="senorbit.ai"
EMAIL="admin@senorbit.ai"

echo "🔒 Setting up SSL for $DOMAIN..."

# Option 1: Certbot (Let's Encrypt)
setup_certbot() {
    echo "📜 Setting up SSL with Certbot (Let's Encrypt)..."
    
    # Install Certbot
    apt-get install -y certbot python3-certbot-nginx
    
    # Obtain certificate
    certbot --nginx -d $DOMAIN -d www.$DOMAIN \
        --non-interactive \
        --agree-tos \
        --email $EMAIL \
        --redirect
    
    # Setup auto-renewal
    systemctl enable certbot.timer
    systemctl start certbot.timer
    
    echo "✅ Certbot SSL setup complete!"
}

# Option 2: Cloudflare SSL
setup_cloudflare() {
    echo "☁️ Setting up SSL with Cloudflare..."
    
    # Install Cloudflare Wrangler
    npm install -g wrangler
    
    echo "⚠️ Cloudflare SSL requires manual configuration:"
    echo "  1. Add DNS records in Cloudflare dashboard"
    echo "  2. Set SSL/TLS mode to 'Full' or 'Full (strict)'"
    echo "  3. Configure Origin Certificate if needed"
    echo ""
    echo "📝 For automatic SSL, use Certbot instead."
}

# Choose method
if [ "$1" == "cloudflare" ]; then
    setup_cloudflare
else
    setup_certbot
fi

# Restart Nginx
systemctl restart nginx

echo "✅ SSL setup complete!"
echo "🌍 Domain: https://$DOMAIN"

