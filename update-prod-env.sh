#!/bin/bash

# Script to update production environment variables for tekms.com
# Run this on the production server

echo "=== Updating Production Environment Variables ==="

# Backup current .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo "✓ Backed up current .env file"

# Update NEXTAUTH_URL
sed -i 's|NEXTAUTH_URL="http://localhost:3000"|NEXTAUTH_URL="https://tekms.com"|g' .env
echo "✓ Updated NEXTAUTH_URL to https://tekms.com"

# Update APP_URL
sed -i 's|APP_URL="http://localhost:3000"|APP_URL="https://tekms.com"|g' .env
echo "✓ Updated APP_URL to https://tekms.com"

# Update NODE_ENV
sed -i 's|NODE_ENV="development"|NODE_ENV="production"|g' .env
echo "✓ Updated NODE_ENV to production"

echo ""
echo "=== Current Production Settings ==="
grep "NEXTAUTH_URL" .env
grep "APP_URL" .env  
grep "NODE_ENV" .env
grep "GOOGLE_CLIENT_ID" .env | head -c 50
echo "..."

echo ""
echo "=== Next Steps ==="
echo "1. Restart the application: pm2 restart tekms"
echo "2. Update Google Cloud Console (see instructions below)"
echo ""
echo "=== Google Cloud Console Update Required ==="
echo "Go to: https://console.cloud.google.com/apis/credentials"
echo ""
echo "Edit your OAuth 2.0 Client ID and add:"
echo ""
echo "Authorized JavaScript origins:"
echo "  - https://tekms.com"
echo ""
echo "Authorized redirect URIs:"
echo "  - https://tekms.com/api/auth/callback/google"
echo ""
echo "Keep the localhost entries for local development."