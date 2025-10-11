#!/bin/bash

# TEKMS Listing Manager - Deployment Script
# Usage: ./deploy.sh

set -e

echo "🚀 Starting TEKMS deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're on the server
if [ ! -d "/home/tekms/tekms-app" ]; then
    echo "❌ Error: This script must be run on the production server"
    exit 1
fi

cd /home/tekms/tekms-app

echo -e "${YELLOW}📥 Pulling latest changes from GitHub...${NC}"
git pull origin gokhan

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install --legacy-peer-deps

echo -e "${YELLOW}🔧 Generating Prisma client...${NC}"
npx prisma generate

echo -e "${YELLOW}🗄️ Running database migrations...${NC}"
npx prisma migrate deploy

echo -e "${YELLOW}🏗️ Building application...${NC}"
npm run build

echo -e "${YELLOW}🔄 Restarting PM2...${NC}"
pm2 restart tekms

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "📊 Application Status:"
pm2 status

echo ""
echo "🌐 Visit: https://tekms.com"
echo "📝 View logs: pm2 logs tekms"