#!/bin/bash

echo "=== Debugging NextAuth 404 Issue ==="
echo ""

echo "1. Checking if auth route files exist:"
ls -la app/api/auth/[...nextauth]/ 2>/dev/null || echo "❌ Route directory not found!"
echo ""

echo "2. Checking PM2 logs for errors:"
pm2 logs tekms --lines 50 --nostream | grep -i "error\|404\|auth" | tail -20
echo ""

echo "3. Testing auth endpoints:"
echo "Testing: curl -I https://tekms.com/api/auth/signin"
curl -I https://tekms.com/api/auth/signin 2>&1 | head -5
echo ""

echo "4. Checking if .next build includes auth routes:"
ls -la .next/server/app/api/auth/ 2>/dev/null || echo "❌ Auth routes not in build!"
echo ""

echo "5. Current environment variables:"
cat .env | grep -E "NEXTAUTH_URL|GOOGLE_CLIENT|NODE_ENV" | sed 's/CLIENT_SECRET=.*/CLIENT_SECRET=***/'
echo ""

echo "6. Rebuilding and restarting:"
echo "Run: npm run build && pm2 restart tekms"