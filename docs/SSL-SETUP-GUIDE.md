# SSL/HTTPS Setup Guide for TEKMS

## Why SSL is Critical

Your application handles:
- ✅ User passwords and authentication
- ✅ BigCommerce, TikTok, and Etsy API credentials
- ✅ Stripe payment information
- ✅ Personal user data
- ✅ Session cookies

**Without SSL, all this data is transmitted in plain text and can be intercepted!**

---

## Prerequisites

- Domain name pointed to your server IP
- Server with sudo access
- Next.js app running on port 3000

---

## Option 1: Nginx + Let's Encrypt (Recommended)

### Step 1: Install Nginx

```bash
sudo apt update
sudo apt install nginx -y
```

### Step 2: Install Certbot (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### Step 3: Configure Nginx for your domain

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/tekms
```

Add this configuration (replace `yourdomain.com` with your actual domain):

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates (will be added by certbot)
    # ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Next.js
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
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Increase max body size for file uploads
    client_max_body_size 10M;
}
```

### Step 4: Enable the site

```bash
sudo ln -s /etc/nginx/sites-available/tekms /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

### Step 5: Get SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts:
- Enter your email
- Agree to terms
- Choose whether to redirect HTTP to HTTPS (choose Yes)

### Step 6: Test Auto-Renewal

```bash
sudo certbot renew --dry-run
```

### Step 7: Update Your Environment Variables

Update `.env.local`:

```bash
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-secret-here
```

---

## Option 2: Caddy (Easiest - Automatic SSL)

Caddy automatically handles SSL certificates!

### Step 1: Install Caddy

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

### Step 2: Configure Caddy

```bash
sudo nano /etc/caddy/Caddyfile
```

Add this simple configuration:

```
yourdomain.com, www.yourdomain.com {
    reverse_proxy localhost:3000
    
    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        X-XSS-Protection "1; mode=block"
    }
}
```

### Step 3: Restart Caddy

```bash
sudo systemctl restart caddy
```

That's it! Caddy automatically gets and renews SSL certificates.

---

## Option 3: Cloudflare (Free SSL + CDN)

### Benefits:
- Free SSL certificate
- DDoS protection
- CDN (faster loading)
- WAF (Web Application Firewall)

### Steps:

1. **Sign up for Cloudflare** (free tier is fine)
2. **Add your domain** to Cloudflare
3. **Update nameservers** at your domain registrar to Cloudflare's
4. **Enable SSL/TLS:**
   - Go to SSL/TLS → Overview
   - Set to "Full" or "Full (strict)"
5. **Force HTTPS:**
   - SSL/TLS → Edge Certificates
   - Enable "Always Use HTTPS"

---

## Verify SSL is Working

### 1. Test your site:

```bash
curl -I https://yourdomain.com
```

Should return:
```
HTTP/2 200
strict-transport-security: max-age=31536000; includeSubDomains
```

### 2. Check SSL certificate:

```bash
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

### 3. Online SSL test:

Visit: https://www.ssllabs.com/ssltest/

Enter your domain and aim for an **A** or **A+** rating.

---

## Update Next.js for Production

### 1. Update your .env.local:

```bash
# Change HTTP to HTTPS
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=generate-a-long-random-string-here

# Ensure secure cookies
NODE_ENV=production
```

### 2. Update Stripe webhooks (if using):

In Stripe Dashboard:
- Go to Developers → Webhooks
- Update endpoint to `https://yourdomain.com/api/stripe/webhook`

### 3. Update OAuth redirect URIs:

**Google OAuth:**
- https://console.cloud.google.com
- Update redirect URI to `https://yourdomain.com/api/auth/callback/google`

---

## Security Checklist

After SSL setup, verify:

- ✅ HTTP redirects to HTTPS
- ✅ SSL certificate is valid
- ✅ Security headers are present
- ✅ NextAuth HTTPS cookies work
- ✅ OAuth redirects work
- ✅ Stripe webhooks work with HTTPS
- ✅ API credentials are encrypted in database
- ✅ Session cookies have `secure` flag

---

## Troubleshooting

### Certificate not working?

```bash
# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Renew certificate manually
sudo certbot renew --force-renewal

# Restart Nginx
sudo systemctl restart nginx
```

### Redirect loop?

Check your NEXTAUTH_URL matches your domain exactly:
```bash
NEXTAUTH_URL=https://yourdomain.com  # Not http://
```

### Mixed content warnings?

Update all API URLs in your code to use `https://`

---

## Maintenance

### Auto-renewal (Nginx + Certbot)

Certbot automatically sets up a cron job. Verify it:

```bash
sudo systemctl status certbot.timer
```

### Manual renewal:

```bash
sudo certbot renew
sudo systemctl reload nginx
```

---

## Recommended: Option 1 (Nginx + Let's Encrypt)

**Why?**
- Free SSL certificates
- Full control over configuration
- Industry standard
- Easy to debug
- Works with PM2/systemd

**Setup time:** ~15 minutes
**Cost:** Free
**Difficulty:** Moderate

Start with Option 1, and consider adding Cloudflare on top for extra protection!