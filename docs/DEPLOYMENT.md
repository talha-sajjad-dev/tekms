# TEKMS Listing Manager - Deployment Guide

## 🚀 Deploying to Vercel

### Prerequisites
1. Vercel account
2. PostgreSQL database (DigitalOcean, Supabase, or Railway)
3. Google OAuth credentials
4. GitHub repository

### Step 1: Prepare Database

1. **Create PostgreSQL Database**
   - Use DigitalOcean, Supabase, Railway, or Neon
   - Note the connection string

2. **Run Migrations**
   ```bash
   npx prisma migrate deploy
   ```

3. **Seed Initial Data**
   ```bash
   npx prisma db seed
   ```

### Step 2: Configure Vercel

1. **Import Project**
   - Go to Vercel dashboard
   - Click "New Project"
   - Import your GitHub repository

2. **Set Environment Variables**
   
   Go to Project Settings → Environment Variables and add:

   ```
   DATABASE_URL=your_postgresql_connection_string
   NEXTAUTH_URL=https://your-domain.vercel.app
   NEXTAUTH_SECRET=generate_with_openssl_rand_-base64_32
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ENCRYPTION_KEY=generate_with_openssl_rand_-base64_32
   ```

3. **Configure Build Settings**
   - Framework Preset: Next.js
   - Build Command: `prisma generate && prisma migrate deploy && next build`
   - Output Directory: `.next`
   - Install Command: `npm install`

### Step 3: Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Visit your deployed URL

### Step 4: Post-Deployment

1. **Create Admin User**
   - Run seed script if not already done
   - Or manually create admin via database

2. **Configure OAuth**
   - Update Google OAuth redirect URIs:
     - `https://your-domain.vercel.app/api/auth/callback/google`

3. **Test Authentication**
   - Sign up with Google
   - Sign up with email/password
   - Verify admin access

4. **Configure Settings**
   - Login as admin
   - Go to /admin
   - Configure Stripe keys (when ready)
   - Configure email settings (when ready)

## 🔧 Environment Variables Explained

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - Your deployment URL
- `NEXTAUTH_SECRET` - Random 32-character string for session encryption
- `GOOGLE_CLIENT_ID` - OAuth client ID
- `GOOGLE_CLIENT_SECRET` - OAuth client secret
- `ENCRYPTION_KEY` - Random 32-character string for API key encryption

### Optional (Configure Later)
- `STRIPE_SECRET_KEY` - (Configure via admin Settings table)
- `STRIPE_PUBLISHABLE_KEY` - (Configure via admin Settings table)
- `RESEND_API_KEY` - (Configure via admin Settings table)

## 📊 Database Migrations

### Production Migrations

```bash
# Generate Prisma client
npx prisma generate

# Deploy migrations
npx prisma migrate deploy

# Seed initial data
npx prisma db seed
```

### Creating New Migrations

```bash
# Development
npx prisma migrate dev --name your_migration_name

# Production
npx prisma migrate deploy
```

## 🔐 Security Checklist

Before going live:

- [ ] Change `NEXTAUTH_SECRET` to a strong random value
- [ ] Change `ENCRYPTION_KEY` to a strong random value
- [ ] Update Google OAuth redirect URIs
- [ ] Set up proper database backups
- [ ] Enable SSL for database connection
- [ ] Review and update CORS settings
- [ ] Set up error monitoring (Sentry)
- [ ] Configure rate limiting
- [ ] Set up uptime monitoring

## 🎯 Post-Launch Checklist

After deployment:

- [ ] Test user signup flow
- [ ] Test Google OAuth
- [ ] Test email/password login
- [ ] Verify admin panel access
- [ ] Test credential management
- [ ] Verify subscription limits
- [ ] Test product listing
- [ ] Configure Stripe (when ready)
- [ ] Set up email service (when ready)
- [ ] Add custom domain
- [ ] Set up analytics
- [ ] Monitor error logs

## 🔄 Continuous Deployment

Vercel automatically deploys:
- **Production**: Pushes to `main` branch
- **Preview**: Pull requests and other branches

### Manual Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

## 📈 Scaling Considerations

### Database
- Monitor connection pool usage
- Set up read replicas if needed
- Regular backups
- Performance monitoring

### Application
- Vercel auto-scales
- Monitor function execution times
- Optimize heavy queries
- Use caching where appropriate

### Monitoring
- Set up error tracking (Sentry)
- Monitor API response times
- Track user signups
- Monitor subscription conversions

## 🆘 Troubleshooting

### Build Fails
- Check Prisma schema is valid
- Ensure all dependencies are in package.json
- Verify environment variables are set
- Check build logs for errors

### Database Connection Issues
- Verify DATABASE_URL is correct
- Check SSL settings
- Ensure database allows connections from Vercel IPs
- Test connection string locally

### OAuth Not Working
- Verify redirect URIs in Google Console
- Check NEXTAUTH_URL is correct
- Ensure NEXTAUTH_SECRET is set
- Check OAuth scopes

### Migration Errors
- Run `npx prisma migrate reset` locally to test
- Ensure migrations are committed to git
- Check for conflicting migrations
- Review migration SQL files

## 📝 Domain Setup

### Custom Domain

1. Go to Vercel Project Settings → Domains
2. Add your custom domain
3. Configure DNS:
   - Type: A
   - Name: @
   - Value: 76.76.21.21
   
   OR
   
   - Type: CNAME
   - Name: www
   - Value: cname.vercel-dns.com

4. Wait for DNS propagation
5. Update NEXTAUTH_URL environment variable
6. Update Google OAuth redirect URIs

## 🔔 Monitoring & Alerts

### Vercel Dashboard
- Monitor function execution
- Check error logs
- View analytics

### External Tools
- Sentry for error tracking
- LogRocket for session replay
- Google Analytics for user tracking
- Uptime Robot for availability monitoring

## 💾 Backup Strategy

### Database Backups
- Daily automated backups
- Weekly manual backups
- Test restore procedure monthly
- Store backups off-site

### Code Backups
- Git repository
- Multiple branches
- Tagged releases
- Documentation

## 🎉 Go Live Checklist

Final steps before announcing:

1. [ ] All environment variables set
2. [ ] Database seeded with initial data
3. [ ] Admin account created and tested
4. [ ] OAuth working
5. [ ] All pages load correctly
6. [ ] Mobile responsive
7. [ ] Forms working
8. [ ] Error pages set up
9. [ ] Analytics configured
10. [ ] Custom domain configured
11. [ ] SSL certificate active
12. [ ] Terms of Service page
13. [ ] Privacy Policy page
14. [ ] Contact information updated
15. [ ] Support email configured

## 📧 Support

For deployment issues:
- Check Vercel documentation
- Review build logs
- Contact support@tekmslisting.com