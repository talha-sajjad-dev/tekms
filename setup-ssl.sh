#!/bin/bash

# TEKMS SSL Setup Script for tekms.com
# Run this on your server as root or with sudo

set -e

echo "🚀 Setting up SSL for TEKMS (tekms.com)"
echo "========================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root or with sudo"
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
apt update

# Install Nginx
echo "📦 Installing Nginx..."
apt install -y nginx

# Install Certbot
echo "📦 Installing Certbot..."
apt install -y certbot python3-certbot-nginx

# Copy Nginx configuration (HTTP only first, certbot will add HTTPS)
echo "📝 Setting up initial Nginx configuration (HTTP only)..."
cat > /etc/nginx/sites-available/tekms << 'EOF'
# HTTP Server - Certbot will modify this
server {
    listen 80;
    listen [::]:80;
    server_name tekms.com www.tekms.com;
    
    # Proxy to Next.js (port 3000)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Increase max body size
    client_max_body_size 10M;
}
EOF

# Enable site
echo "✅ Enabling Nginx site..."
ln -sf /etc/nginx/sites-available/tekms /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
echo "🔍 Testing Nginx configuration..."
nginx -t

# Restart Nginx
echo "🔄 Restarting Nginx..."
systemctl restart nginx
systemctl enable nginx

# Get SSL certificate
echo "🔐 Obtaining SSL certificate from Let's Encrypt..."
echo ""
echo "⚠️  Make sure tekms.com and www.tekms.com are pointing to this server!"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

certbot --nginx -d tekms.com -d www.tekms.com --non-interactive --agree-tos --email gokhansancar@gmail.com --redirect

# Test auto-renewal
echo "🔄 Testing SSL certificate auto-renewal..."
certbot renew --dry-run

echo ""
echo "✅ SSL Setup Complete!"
echo "===================="
echo ""
echo "Your site is now available at:"
echo "  🌐 https://tekms.com"
echo "  🌐 https://www.tekms.com"
echo ""
echo "Next steps:"
echo "1. Update your .env file:"
echo "   NEXTAUTH_URL=https://tekms.com"
echo ""
echo "2. Restart your Next.js app:"
echo "   cd ~/tekms"
echo "   pm2 restart all"
echo ""
echo "3. Update OAuth redirect URIs in:"
echo "   - Google Cloud Console"
echo "   - Stripe Dashboard"
echo ""
echo "SSL certificates will auto-renew. Check status with:"
echo "   sudo certbot certificates"
echo ""