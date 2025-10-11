# TEKMS Listing Manager - DigitalOcean Droplet Deployment

## 🚀 Deploying to DigitalOcean Droplet (tekms.com)

### Prerequisites
- DigitalOcean Droplet (Ubuntu 22.04 LTS recommended)
- Domain: tekms.com pointed to droplet IP
- PostgreSQL database (already configured on DigitalOcean)
- SSH access to droplet

## Step 1: Initial Server Setup

### 1.1 Connect to Droplet
```bash
ssh root@tekms.com
# or
ssh root@YOUR_DROPLET_IP
```

### 1.2 Update System
```bash
apt update && apt upgrade -y
```

### 1.3 Install Node.js 20.x
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs
node --version  # Should be v20.x
npm --version
```

### 1.4 Install PM2 (Process Manager)
```bash
npm install -g pm2
```

### 1.5 Install Nginx
```bash
apt install -y nginx
```

## Step 2: Setup Application

### 2.1 Create Application User
```bash
adduser tekms
usermod -aG sudo tekms
su - tekms
```

### 2.2 Clone Repository
```bash
cd /home/tekms
git clone YOUR_GITHUB_REPO_URL tekms-app
cd tekms-app
```

### 2.3 Install Dependencies
```bash
npm install
```

### 2.4 Setup Environment Variables
```bash
nano .env
```

Add the following (replace with your actual values):
```env
# Database (Your DigitalOcean PostgreSQL)
DATABASE_URL="postgresql://doadmin:AVNS_0pvs_ofGIj71k3iX0Ui@tekms-postgesql-db-do-user-18650434-0.d.db.ondigitalocean.com:25060/defaultdb?sslmode=require"

# NextAuth
NEXTAUTH_URL="https://tekms.com"
NEXTAUTH_SECRET="your-super-secret-32-char-random-string-change-this"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Encryption
ENCRYPTION_KEY="your-32-char-encryption-key-change-this"

# Node Environment
NODE_ENV="production"
```

### 2.5 Generate Prisma Client & Run Migrations
```bash
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

### 2.6 Build Application
```bash
npm run build
```

## Step 3: Configure PM2

### 3.1 Create PM2 Ecosystem File
```bash
nano ecosystem.config.js
```

Add:
```javascript
module.exports = {
  apps: [{
    name: 'tekms',
    script: 'npm',
    args: 'start',
    cwd: '/home/tekms/tekms-app',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/home/tekms/logs/err.log',
    out_file: '/home/tekms/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
}
```

### 3.2 Create Logs Directory
```bash
mkdir -p /home/tekms/logs
```

### 3.3 Start Application with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Copy and run the command that PM2 outputs (as root if needed)

## Step 4: Configure Nginx

### 4.1 Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/tekms.com
```

Add:
```nginx
server {
    listen 80;
    server_name tekms.com www.tekms.com;

    # Redirect HTTP to HTTPS (will be enabled after SSL)
    # return 301 https://$server_name$request_uri;

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

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
}
```

### 4.2 Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/tekms.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 5: Setup SSL with Let's Encrypt

### 5.1 Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 5.2 Obtain SSL Certificate
```bash
sudo certbot --nginx -d tekms.com -d www.tekms.com
```

Follow the prompts:
- Enter email address
- Agree to terms
- Choose to redirect HTTP to HTTPS

### 5.3 Test Auto-renewal
```bash
sudo certbot renew --dry-run
```

## Step 6: Configure Firewall

### 6.1 Setup UFW
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

## Step 7: Post-Deployment Setup

### 7.1 Update Google OAuth Redirect URIs
Go to Google Cloud Console and update:
- Authorized redirect URIs: `https://tekms.com/api/auth/callback/google`
- Authorized JavaScript origins: `https://tekms.com`

### 7.2 Create Admin User
If not already seeded:
```bash
cd /home/tekms/tekms-app
npx prisma db seed
```

### 7.3 Test Application
Visit: https://tekms.com

Test:
- Homepage loads
- Sign up with Google
- Sign up with email
- Login works
- Dashboard accessible
- Admin panel (with admin account)

## Step 8: Monitoring & Maintenance

### 8.1 PM2 Commands
```bash
# View logs
pm2 logs tekms

# Monitor
pm2 monit

# Restart
pm2 restart tekms

# Stop
pm2 stop tekms

# Status
pm2 status
```

### 8.2 View Nginx Logs
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 8.3 Application Logs
```bash
tail -f /home/tekms/logs/out.log
tail -f /home/tekms/logs/err.log
```

## Step 9: Deployment Updates

### 9.1 Pull Latest Changes
```bash
cd /home/tekms/tekms-app
git pull origin main
```

### 9.2 Install Dependencies (if package.json changed)
```bash
npm install
```

### 9.3 Run Migrations (if schema changed)
```bash
npx prisma generate
npx prisma migrate deploy
```

### 9.4 Rebuild
```bash
npm run build
```

### 9.5 Restart Application
```bash
pm2 restart tekms
```

## Step 10: Automated Deployment Script

Create deployment script:
```bash
nano /home/tekms/deploy.sh
```

Add:
```bash
#!/bin/bash
cd /home/tekms/tekms-app
git pull origin main
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart tekms
echo "Deployment complete!"
```

Make executable:
```bash
chmod +x /home/tekms/deploy.sh
```

Use:
```bash
./deploy.sh
```

## Backup Strategy

### Database Backups
DigitalOcean PostgreSQL has automatic daily backups.

Manual backup:
```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### Code Backups
- Git repository
- DigitalOcean Droplet snapshots (weekly recommended)

## Security Checklist

- [x] Firewall configured (UFW)
- [x] SSL certificate installed
- [x] Strong passwords in .env
- [x] Database SSL enabled
- [x] Nginx security headers
- [x] PM2 process management
- [ ] Setup monitoring (optional)
- [ ] Setup automated backups
- [ ] Configure fail2ban (optional)

## Troubleshooting

### Application Won't Start
```bash
# Check logs
pm2 logs tekms

# Check if port 3000 is available
sudo lsof -i :3000

# Check environment variables
pm2 env tekms
```

### Nginx Issues
```bash
# Test configuration
sudo nginx -t

# Check status
sudo systemctl status nginx

# Restart
sudo systemctl restart nginx
```

### Database Connection Issues
```bash
# Test connection
psql $DATABASE_URL

# Check if database is accessible
ping tekms-postgesql-db-do-user-18650434-0.d.db.ondigitalocean.com
```

### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew manually
sudo certbot renew
```

## Performance Optimization

### Enable Nginx Caching
Add to Nginx config:
```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=STATIC:10m inactive=7d use_temp_path=off;

location /_next/static {
    proxy_cache STATIC;
    proxy_pass http://localhost:3000;
}
```

### PM2 Cluster Mode
Already configured in ecosystem.config.js with `instances: 'max'`

## Monitoring (Optional)

### Setup PM2 Monitoring
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Setup Uptime Monitoring
Use services like:
- UptimeRobot
- Pingdom
- StatusCake

## Support

Domain: https://tekms.com
Database: DigitalOcean PostgreSQL
Server: DigitalOcean Droplet (Ubuntu)

For issues:
- Check PM2 logs: `pm2 logs tekms`
- Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Check application logs: `tail -f /home/tekms/logs/err.log`