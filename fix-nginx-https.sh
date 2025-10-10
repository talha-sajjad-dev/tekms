#!/bin/bash
# Fix Nginx to properly forward HTTPS protocol to Next.js

echo "🔧 Fixing Nginx configuration for HTTPS forwarding..."

# Update Nginx config to properly forward HTTPS
sudo tee /etc/nginx/sites-available/tekms > /dev/null << 'EOF'
# HTTP Server - Redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name tekms.com www.tekms.com;
    
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name tekms.com www.tekms.com;

    # SSL Configuration (managed by certbot)
    ssl_certificate /etc/letsencrypt/live/tekms.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tekms.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/tekms.access.log;
    error_log /var/log/nginx/tekms.error.log;

    # Proxy to Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        
        # CRITICAL: Forward the HTTPS protocol
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Ssl on;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Standard proxy headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Increase max body size
    client_max_body_size 10M;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/javascript application/json application/javascript;
}
EOF

# Test Nginx configuration
echo "🔍 Testing Nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    echo "🔄 Restarting Nginx..."
    sudo systemctl restart nginx
    echo "✅ Nginx restarted successfully"
    echo ""
    echo "🎉 HTTPS forwarding is now configured!"
    echo "Try signing in with Google at https://tekms.com"
else
    echo "❌ Nginx configuration test failed"
    echo "Please check the error messages above"
    exit 1
fi