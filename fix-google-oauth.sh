#!/bin/bash

echo "=== Complete Google OAuth Fix for tekms.com ==="
echo ""

# Step 1: Update environment variables
echo "Step 1: Updating .env file..."
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Update all production URLs
sed -i 's|NEXTAUTH_URL=".*"|NEXTAUTH_URL="https://tekms.com"|g' .env
sed -i 's|APP_URL=".*"|APP_URL="https://tekms.com"|g' .env
sed -i 's|NODE_ENV=".*"|NODE_ENV="production"|g' .env

echo "✓ Environment variables updated"
echo ""

# Step 2: Verify environment
echo "Step 2: Verifying environment variables..."
echo "NEXTAUTH_URL: $(grep NEXTAUTH_URL .env | cut -d'=' -f2)"
echo "GOOGLE_CLIENT_ID: $(grep GOOGLE_CLIENT_ID .env | cut -d'=' -f2 | cut -c1-30)..."
echo "NODE_ENV: $(grep NODE_ENV .env | cut -d'=' -f2)"
echo ""

# Step 3: Clean build cache
echo "Step 3: Cleaning build cache..."
rm -rf .next
rm -rf node_modules/.cache
echo "✓ Cache cleared"
echo ""

# Step 4: Regenerate Prisma client
echo "Step 4: Regenerating Prisma client..."
npx prisma generate
echo "✓ Prisma client regenerated"
echo ""

# Step 5: Full rebuild
echo "Step 5: Building Next.js app (this may take a minute)..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed! Check errors above."
    exit 1
fi
echo "✓ Build completed successfully"
echo ""

# Step 6: Restart PM2
echo "Step 6: Restarting application..."
pm2 restart tekms
pm2 save
echo "✓ Application restarted"
echo ""

# Step 7: Test endpoints
echo "Step 7: Testing auth endpoints..."
sleep 3
echo "Testing /api/auth/signin..."
curl -s -I https://tekms.com/api/auth/signin | head -1
echo ""

echo "=== Fix Complete! ==="
echo ""
echo "⚠️  IMPORTANT: You must also update Google Cloud Console:"
echo ""
echo "Go to: https://console.cloud.google.com/apis/credentials"
echo ""
echo "Edit your OAuth 2.0 Client and add:"
echo ""
echo "Authorized JavaScript origins:"
echo "  - https://tekms.com"
echo ""  
echo "Authorized redirect URIs:"
echo "  - https://tekms.com/api/auth/callback/google"
echo ""
echo "Then test Google sign-in at: https://tekms.com"