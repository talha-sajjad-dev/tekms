# Deploy TEKMS to DigitalOcean Droplet - Complete Guide

## 🎯 What You'll Build

A production Next.js app running on Ubuntu with:
- Nginx as reverse proxy
- PM2 for process management
- SSL certificate (free)
- Auto-restart on failure
- Connected to your PostgreSQL database

**Cost:** $6/month (Basic Droplet)

---

## Step 1: Create Droplet

### 1.1 Go to DigitalOcean
1. Visit https://cloud.digitalocean.com/
2. Click "Create" → "Droplets"

### 1.2 Choose Configuration
**Image:** Ubuntu 22.04 LTS (recommended)  
**Plan:** Basic  
**CPU Options:** Regular ($6/mo - 1GB RAM, 1 vCPU, 25GB SSD)  
**Datacenter:** Choose closest to users (e.g., New York)  

### 1.3 Authentication
**Choose:** SSH Key (more secure) or Password

For SSH:
1. Click "New SSH Key"
2. Paste your public key (`cat ~/.ssh/id_rsa.pub`)
3. Name it "My Mac" or similar

### 1.4 Finalize
**Hostname:** tekms-prod  
**Tags:** production, nextjs  
Click **"Create Droplet"**

Wait 1-2 minutes for creation. Note the IP address shown.

---

## Step 2: Initial Server Setup

### 2.1 SSH into Droplet
```bash
ssh root@YOUR_DROPLET_IP
```

### 2.2 Update System
```bash
apt update && apt upgrade -y
```

### 2.3 Create Non-Root User
```bash
adduser tekms
usermod -aG sudo tekms
```

Set a password when prompted.

### 2.4 Switch to New User
```bash
su - tekms
```

---

## Step 3: Install Node.js

### 3.1 Install Node.js 20.x
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 3.2 Verify Installation
```bash
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

---

## Step 4: Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

PM2 will keep your app running and restart it if it crashes.

---

## Step 5: Clone Your Repository

### 5.1 Install Git
```bash
sudo apt install -y git
```

### 5.2 Setup GitHub Access

**Option A: Use Personal Access Token (Recommended)**

1. Go to GitHub: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Name: "TEKMS Deployment"
4. Scopes: Check "repo" (full control)
5. Click "Generate token"
6. **COPY THE TOKEN** (you won't see it again)

Then clone with token:
```bash
cd ~
git clone https://<YOUR_GITHUB_USERNAME>:<YOUR_TOKEN>@github.com/gokhansancar82/tekms.git
cd tekms
```

**Option B: Make Repository Public (Easiest)**

1. Go to: https://github.com/gokhansancar82/tekms/settings
2. Scroll to "Danger Zone"
3. Click "Change visibility" → "Make public"
4. Then clone without authentication:
```bash
cd ~
git clone https://github.com/gokhansancar82/tekms.git
cd tekms
```

### 5.3 Checkout Branch
```bash
git checkout gokhan  # or main
```

---

## Step 6: Configure Environment Variables

### 6.1 Create .env File
```bash
nano .env
```

### 6.2 Paste Configuration
```env
# Database
DATABASE_URL="postgresql://doadmin:AVNS_MyP5sJ4wH7XtXjR1ZnN@db-postgresql-nyc1-00757-do-user-18650434-0.d.db.ondigitalocean.com:25060/defaultdb?sslmode=require"

# NextAuth - UPDATE this after getting domain/IP
NEXTAUTH_URL="http://YOUR_DROPLET_IP:3000"
NEXTAUTH_SECRET="c4rTvBT8F2X2SvEtp9JBbSHgcjQZiJWrlFmxOURB5Z0="

# Google OAuth  
GOOGLE_CLIENT_ID="416002458685-08e813pl73pt22gocfee7287u8ht2mpe.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="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"

# Encryption
ENCRYPTION_KEY="e2b79fd5abdcc5c4ee143c6abb483461e07aca0f4a752a2b7892266605c442fc"

# Stripe
STRIPE_SECRET_KEY="sk_test_placeholder"
STRIPE_PUBLISHABLE_KEY="pk_test_placeholder"
STRIPE_WEBHOOK_SECRET="whsec_placeholder"
STRIPE_STARTER_PRICE_ID="price_starter"
STRIPE_PRO_PRICE_ID="price_pro"
STRIPE_ENTERPRISE_PRICE_ID="price_enterprise"
```

**Save:** Press `Ctrl+X`, then `Y`, then `Enter`

---

## Step 7: Install Dependencies & Build

### 7.1 Install Dependencies
```bash
npm install
```

This will take 2-3 minutes.

### 7.2 Generate Prisma Client
```bash
npx prisma generate
```

### 7.3 Run Database Migration
```bash
npx prisma migrate deploy
```

### 7.4 Create Admin User
```bash
npx tsx scripts/create-admin.ts
```

### 7.5 Build Application
```bash
npm run build
```

This creates optimized production build (takes 2-3 minutes).

---

## Step 8: Start App with PM2

### 8.1 Start Application
```bash
pm2 start npm --name "tekms" -- start
```

### 8.2 Verify Running
```bash
pm2 status
```

Should show:
```
┌────┬────────┬─────────┬─────────┬──────────┐
│ id │ name   │ status  │ cpu     │ memory   │
├────┼────────┼─────────┼─────────┼──────────┤
│ 0  │ tekms  │ online  │ 0%      │ 50.0mb   │
└────┴────────┴─────────┴─────────┴──────────┘
```

### 8.3 Setup Auto-Start on Reboot
```bash
pm2 startup
pm2 save
```

Run the command PM2 suggests (starts with `sudo`).

### 8.4 Test App
```bash
curl http://localhost:3000
```

Should return HTML.

---

## Step 9: Install & Configure Nginx

### 9.1 Install Nginx
```bash
sudo apt install -y nginx
```

### 9.2 Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/tekms
```

### 9.3 Paste Configuration
```nginx
server {
    listen 80;
    server_name YOUR_DROPLET_IP tekms.com www.tekms.com;

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
    }
}
```

**Replace `YOUR_DROPLET_IP`** with actual IP.

**Save:** `Ctrl+X`, `Y`, `Enter`

### 9.4 Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/tekms /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

### 9.5 Configure Firewall
```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

---

## Step 10: Test Deployment

### 10.1 Visit Your Site
Open browser: `http://YOUR_DROPLET_IP`

You should see TEKMS landing page!

### 10.2 Test Login
1. Click "Sign In"
2. Try email/password login
3. Try Google OAuth

**If Google OAuth fails:** Need to update redirect URIs (next step)

---

## Step 11: Update Google OAuth

### 11.1 Add Droplet IP to Google Console
1. Go to https://console.cloud.google.com/
2. APIs & Services → Credentials
3. Click your OAuth client
4. Add to "Authorized JavaScript origins":
   ```
   http://YOUR_DROPLET_IP
   ```
5. Add to "Authorized redirect URIs":
   ```
   http://YOUR_DROPLET_IP/api/auth/callback/google
   ```
6. Click "Save"

---

## Step 12: Setup SSL (Optional but Recommended)

### 12.1 Point Domain to Droplet
In your domain registrar (e.g., GoDaddy, Namecheap):

Add A Record:
```
Type: A
Name: @
Value: YOUR_DROPLET_IP
TTL: 300
```

Add CNAME for www:
```
Type: CNAME
Name: www
Value: tekms.com
TTL: 300
```

Wait 5-10 minutes for DNS propagation.

### 12.2 Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 12.3 Get SSL Certificate
```bash
sudo certbot --nginx -d tekms.com -d www.tekms.com
```

Follow prompts:
- Enter email
- Agree to terms
- Choose redirect HTTP to HTTPS: Yes

### 12.4 Test Auto-Renewal
```bash
sudo certbot renew --dry-run
```

### 12.5 Update Environment
```bash
cd ~/tekms
nano .env
```

Change:
```
NEXTAUTH_URL="https://tekms.com"
```

Restart app:
```bash
pm2 restart tekms
```

### 12.6 Update Google OAuth Again
Add HTTPS URLs to Google Console:
```
https://tekms.com
https://tekms.com/api/auth/callback/google
```

---

## Step 13: Verify Everything Works

Visit: `https://tekms.com` (or `http://YOUR_DROPLET_IP`)

Test:
- [ ] Landing page loads
- [ ] Sign in modal opens
- [ ] Email login works
- [ ] Google OAuth works
- [ ] Dashboard accessible
- [ ] Admin panel accessible
- [ ] Credentials can be added
- [ ] Usage tracking works

---

## 🔧 Useful Commands

### View Logs
```bash
pm2 logs tekms
```

### Restart App
```bash
pm2 restart tekms
```

### Update Code (After Pushing to GitHub)
```bash
cd ~/tekms
git pull
npm install
npm run build
pm2 restart tekms
```

### Check App Status
```bash
pm2 status
```

### View Nginx Logs
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 💰 Monthly Costs

- **Droplet:** $6/month (Basic)
- **Database:** Already have ✅
- **Domain:** ~$12/year (if purchased)
- **SSL:** FREE (Let's Encrypt)

**Total:** ~$6/month

---

## 🎯 Quick Start Commands

All commands in one place:
```bash
# SSH into droplet
ssh root@YOUR_DROPLET_IP

# Install everything
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs git nginx
npm install -g pm2

# Clone and setup
git clone https://github.com/gokhansancar82/tekms.git
cd tekms
npm install
npx prisma generate
npx prisma migrate deploy
npx tsx scripts/create-admin.ts
npm run build
pm2 start npm --name "tekms" -- start
pm2 startup
pm2 save

# Configure Nginx (create config file first)
ln -s /etc/nginx/sites-available/tekms /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
ufw allow 'Nginx Full'
ufw allow OpenSSH
ufw enable
```

Ready to start? Let me know when you create the droplet!