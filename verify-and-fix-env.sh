#!/bin/bash

echo "=== Verifying Production Environment Variables ==="
echo ""

# Check if running on server
if [ ! -f "/home/tekms/tekms-app/.env" ]; then
    echo "❌ This script must be run on the production server at /home/tekms/tekms-app"
    echo "Run: ssh tekms@68.183.149.168"
    exit 1
fi

cd /home/tekms/tekms-app

echo "Current .env file status:"
echo ""

# Check each critical variable
check_var() {
    var_name=$1
    expected=$2
    current=$(grep "^${var_name}=" .env | cut -d'=' -f2- | tr -d '"')
    
    if [ -z "$current" ]; then
        echo "❌ $var_name: NOT SET"
        return 1
    elif [ ! -z "$expected" ] && [ "$current" != "$expected" ]; then
        echo "⚠️  $var_name: '$current' (should be '$expected')"
        return 1
    else
        echo "✅ $var_name: SET"
        return 0
    fi
}

issues=0

check_var "NEXTAUTH_URL" "https://tekms.com" || issues=$((issues+1))
check_var "NEXTAUTH_SECRET" "" || issues=$((issues+1))
check_var "GOOGLE_CLIENT_ID" "" || issues=$((issues+1))
check_var "GOOGLE_CLIENT_SECRET" "" || issues=$((issues+1))
check_var "DATABASE_URL" "" || issues=$((issues+1))
check_var "NODE_ENV" "production" || issues=$((issues+1))

echo ""

if [ $issues -gt 0 ]; then
    echo "❌ Found $issues issue(s). Fixing now..."
    echo ""
    
    # Backup
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo "✓ Backed up .env"
    
    # Fix NEXTAUTH_URL
    if grep -q "^NEXTAUTH_URL=" .env; then
        sed -i 's|^NEXTAUTH_URL=.*|NEXTAUTH_URL="https://tekms.com"|' .env
    else
        echo 'NEXTAUTH_URL="https://tekms.com"' >> .env
    fi
    echo "✓ Fixed NEXTAUTH_URL"
    
    # Fix APP_URL
    if grep -q "^APP_URL=" .env; then
        sed -i 's|^APP_URL=.*|APP_URL="https://tekms.com"|' .env
    else
        echo 'APP_URL="https://tekms.com"' >> .env
    fi
    echo "✓ Fixed APP_URL"
    
    # Fix NODE_ENV
    if grep -q "^NODE_ENV=" .env; then
        sed -i 's|^NODE_ENV=.*|NODE_ENV="production"|' .env
    else
        echo 'NODE_ENV="production"' >> .env
    fi
    echo "✓ Fixed NODE_ENV"
    
    # Check if NEXTAUTH_SECRET exists and is long enough
    secret=$(grep "^NEXTAUTH_SECRET=" .env | cut -d'=' -f2- | tr -d '"')
    if [ -z "$secret" ] || [ ${#secret} -lt 32 ]; then
        echo "⚠️  NEXTAUTH_SECRET is missing or too short"
        echo "   Current value length: ${#secret}"
        echo "   You can generate a new one with: openssl rand -base64 32"
    fi
    
    echo ""
    echo "=== Rebuilding Application ==="
    npm run build
    pm2 restart tekms
    pm2 save
    
    echo ""
    echo "✅ Fix complete! Testing endpoints..."
    sleep 3
    curl -s https://tekms.com/api/auth/providers | head -c 200
    echo ""
else
    echo "✅ All environment variables are configured correctly!"
fi