# Zoho Mail Setup Guide for TEKMS

This guide explains how to configure Zoho Mail as your email service provider in TEKMS.

## Why Zoho Mail?

- ✅ Professional email service
- ✅ Reliable SMTP delivery
- ✅ Good deliverability rates
- ✅ Free tier available (up to 5 users)
- ✅ Custom domain support
- ✅ No API keys needed - uses SMTP

## Step 1: Create Zoho Mail Account

1. Go to https://www.zoho.com/mail/
2. Sign up for Zoho Mail (free or paid plan)
3. Verify your domain (if using custom domain)

## Step 2: Enable SMTP Access

1. Login to Zoho Mail
2. Go to **Settings** > **Mail Accounts**
3. Click on your email address
4. Enable **POP/IMAP Access** (this also enables SMTP)

## Step 3: Get SMTP Credentials

Zoho Mail SMTP Settings:
- **Host**: `smtp.zoho.com`
- **Port**: `465` (SSL) or `587` (TLS)
- **Username**: Your full Zoho email address (e.g., noreply@yourdomain.com)
- **Password**: Your Zoho email password or app-specific password

### Using App-Specific Password (Recommended)

For better security, create an app-specific password:

1. Go to Zoho Accounts: https://accounts.zoho.com/
2. Navigate to **Security** > **App-Specific Passwords**
3. Click **Generate New Password**
4. Name it "TEKMS Email Service"
5. Copy the generated password (you'll use this instead of your regular password)

## Step 4: Configure in TEKMS Admin Panel

1. Login to TEKMS as admin
2. Go to **Admin Dashboard** > **System Settings**
3. Click on the **Email** tab
4. Fill in the following:

```
Email Provider: smtp
SMTP Host: smtp.zoho.com
SMTP Port: 465
SMTP Username: noreply@yourdomain.com
SMTP Password: [your-app-specific-password]
From Email: noreply@yourdomain.com
From Name: TEKMS Listing Manager
```

5. Click **Save Email Settings**

## Step 5: Test Email Configuration

You can test if emails are working by:

1. Registering a new test account
2. Checking if you receive the welcome email
3. Testing password reset functionality

Or use the email testing utility:

```typescript
import { sendWelcomeEmail } from '@/lib/email'

// Test sending
await sendWelcomeEmail('your-test-email@example.com', 'Test User')
```

## Troubleshooting

### "Failed to send email" Error

**Check:**
- SMTP credentials are correct
- SMTP host and port are correct
- App-specific password is being used (not regular password)
- POP/IMAP access is enabled in Zoho Mail settings

### "Authentication failed" Error

**Solutions:**
1. Make sure you're using your full email address as username
2. Use app-specific password instead of regular password
3. Check if 2FA is enabled (requires app-specific password)

### Emails going to spam

**Improve deliverability:**
1. Set up SPF record for your domain
2. Set up DKIM in Zoho Mail settings
3. Set up DMARC policy
4. Use a verified custom domain

## Zoho Mail Limits

### Free Plan
- 5 users
- 5 GB storage per user
- 25 MB attachment limit
- No daily sending limit specified

### Paid Plans
- Higher storage
- More users
- Priority support
- Advanced features

## Alternative Ports

If port 465 doesn't work:

```
Port 587 (TLS)
- More compatible with some hosting providers
- Requires STARTTLS
```

Update in Admin Settings:
```
SMTP Port: 587
```

## SPF Record Setup

Add this SPF record to your domain DNS:

```
v=spf1 include:zoho.com ~all
```

## DKIM Setup

1. Go to Zoho Mail Admin Console
2. Navigate to **Email Configuration** > **DKIM**
3. Follow Zoho's instructions to add DKIM TXT record to your DNS

## Environment Variables (Optional Fallback)

You can also set these in `.env` as fallback:

```env
SMTP_HOST=smtp.zoho.com
SMTP_PORT=465
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=your-app-specific-password
EMAIL_FROM=noreply@yourdomain.com
```

However, **it's recommended to use the Admin Panel** for easier management.

## Email Templates Available

TEKMS includes these pre-built email templates:

1. **Welcome Email** - Sent when user registers
   ```typescript
   sendWelcomeEmail(email, name)
   ```

2. **Password Reset** - Sent when user requests password reset
   ```typescript
   sendPasswordResetEmail(email, resetToken)
   ```

3. **Subscription Upgrade** - Sent when store is auto-upgraded
   ```typescript
   sendSubscriptionUpgradeEmail(email, name, storeName, oldTier, newTier, newPrice)
   ```

All templates are professionally designed with:
- Responsive HTML
- Brand colors (blue-cyan gradient)
- Clear call-to-action buttons
- Footer with company info

## Monitoring

Check email sending status in:
- Server logs: `pm2 logs tekms`
- Application console for email send confirmations
- Zoho Mail sent folder

## Support

- **Zoho Mail Support**: https://help.zoho.com/portal/en/kb/mail
- **TEKMS Email Issues**: Check server logs and verify SMTP settings

---

**Last Updated**: 2024-10-11