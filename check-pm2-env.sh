#!/bin/bash

echo "=== Checking PM2 Runtime Environment ==="
echo ""

echo "1. PM2 process info:"
pm2 describe tekms | grep -A 5 "env:"

echo ""
echo "2. Checking actual runtime NEXTAUTH_URL:"
pm2 prettylist | grep -i "nextauth" || echo "Not found in PM2 environment"

echo ""
echo "3. PM2 restart with --update-env:"
pm2 restart tekms --update-env
pm2 save

echo ""
echo "4. Testing after restart:"
sleep 3
curl -s https://tekms.com/api/auth/providers | jq . || curl -s https://tekms.com/api/auth/providers

echo ""
echo "=== If still 400, the issue might be NEXTAUTH_SECRET ==="
echo "Current NEXTAUTH_SECRET length: $(grep NEXTAUTH_SECRET /home/tekms/tekms-app/.env | cut -d'=' -f2 | tr -d '"' | wc -c)"