// Quick environment check script
console.log('=== Environment Variables Check ===')
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL || 'NOT SET')
console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET')
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET')
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET')
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET')
console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET')
console.log('\n=== Required Actions ===')

const issues = []

if (!process.env.NEXTAUTH_URL || process.env.NEXTAUTH_URL !== 'https://tekms.com') {
  issues.push('❌ NEXTAUTH_URL must be set to: https://tekms.com')
}

if (!process.env.GOOGLE_CLIENT_ID) {
  issues.push('❌ GOOGLE_CLIENT_ID is not set')
}

if (!process.env.GOOGLE_CLIENT_SECRET) {
  issues.push('❌ GOOGLE_CLIENT_SECRET is not set')
}

if (issues.length > 0) {
  console.log('\nIssues found:')
  issues.forEach(issue => console.log(issue))
  console.log('\nTo fix:')
  console.log('1. SSH into server: ssh tekms@68.183.149.168')
  console.log('2. Edit .env file: nano /home/tekms/tekms-app/.env')
  console.log('3. Add/update these variables')
  console.log('4. Restart PM2: pm2 restart tekms')
} else {
  console.log('✅ All environment variables are configured correctly')
}

console.log('\n=== Google OAuth Setup ===')
console.log('Ensure in Google Console (https://console.cloud.google.com):')
console.log('1. Authorized JavaScript origins: https://tekms.com')
console.log('2. Authorized redirect URIs: https://tekms.com/api/auth/callback/google')