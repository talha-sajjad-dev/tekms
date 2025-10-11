#!/bin/bash

echo "=== Testing NextAuth Endpoints on tekms.com ==="
echo ""

echo "1. Testing /api/auth/providers (should return JSON):"
curl -s https://tekms.com/api/auth/providers | head -c 200
echo ""
echo ""

echo "2. Testing /api/auth/signin (should redirect or return HTML):"
curl -s -I https://tekms.com/api/auth/signin | grep -E "HTTP|Location"
echo ""

echo "3. Testing /api/auth/callback/google (should redirect):"
curl -s -I https://tekms.com/api/auth/callback/google | grep -E "HTTP|Location"
echo ""

echo "If all show 404, the auth routes aren't built. Run: ./fix-google-oauth.sh"