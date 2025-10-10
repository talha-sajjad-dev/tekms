# HTTPS Migration Checklist for TEKMS

## ✅ After SSL Setup, Update These Services:

### 1. Environment Variables (.env)
```bash
# MUST UPDATE THESE:
NEXTAUTH_URL=https://tekms.com  # ← Change from http://

# Verify these exist:
NEXTAUTH_SECRET=your-secret-here
DATABASE_URL=postgresql://...
```

### 2. Google OAuth Console
🔗 https://console.cloud.google.com/apis/credentials

**Update Authorized Redirect URIs:**
- Remove: `http://localhost:3000/api/auth/callback/google`
- Add: `https://tekms.com/api/auth/callback/google`
- Add: `https://www.tekms.com/api/auth/callback/google`

**Update Authorized JavaScript Origins:**
- Add: `https://tekms.com`
- Add: `https://www.tekms.com`

### 3. Stripe Dashboard
🔗 https://dashboard.stripe.com/webhooks

**Update Webhook Endpoint:**
- Old: `http://yourdomain.com/api/stripe/webhook`
- New: `https://tekms.com/api/stripe/webhook`

**Update Return URLs (if using Checkout):**
- Success URL: `https://tekms.com/dashboard/billing?success=true`
- Cancel URL: `https://tekms.com/dashboard/billing?canceled=true`

### 4. BigCommerce App (if applicable)
🔗 BigCommerce Developer Portal

**Update Auth Callback URL:**
- New: `https://tekms.com/api/bc/auth/callback`

**Update Load Callback URL:**
- New: `https://tekms.com/api/bc/load`

**Update Uninstall Callback URL:**
- New: `https://tekms.com/api/bc/uninstall`

### 5. TikTok Developer Portal (if using OAuth)
Update redirect URI to: `https://tekms.com/api/tiktok-direct/callback`

### 6. Etsy Developer Portal (if using OAuth)
Update redirect URI to: `https://tekms.com/api/etsy/callback`

---

## 🔄 After Updating Everything:

### 1. Restart Your Application
```bash
cd ~/tekms
pm2 restart all
```

### 2. Clear Browser Cache
Users should clear cookies/cache or use incognito mode for first HTTPS visit

### 3. Test Authentication Flow
- Sign out
- Sign in with Google OAuth
- Sign in with email/password
- Verify redirect to dashboard works

### 4. Test Stripe (if applicable)
- Try upgrading subscription
- Verify webhook receives events
- Check webhook logs in Stripe dashboard

### 5. Monitor Logs
```bash
# Nginx logs
sudo tail -f /var/log/nginx/tekms.access.log
sudo tail -f /var/log/nginx/tekms.error.log

# Application logs
pm2 logs
```

---

## 🔍 Verify HTTPS is Working:

### Test URLs:
```bash
# Should redirect to HTTPS:
curl -I http://tekms.com
# Expected: 301 Moved Permanently, Location: https://...

# Should return 200:
curl -I https://tekms.com
# Expected: 200 OK

# Check SSL certificate:
curl -vI https://tekms.com 2>&1 | grep -i "SSL certificate"
```

### Browser Tests:
1. Visit http://tekms.com → should redirect to https://tekms.com
2. Check for 🔒 padlock in address bar
3. No "mixed content" warnings in console
4. All images/assets load properly

### Security Headers Check:
```bash
curl -I https://tekms.com | grep -i "strict-transport-security"
# Should see: strict-transport-security: max-age=31536000
```

---

## ⚠️ Common Issues & Fixes:

### Issue: "Redirect loop"
**Cause:** NEXTAUTH_URL still set to http://
**Fix:** Update .env to https:// and restart app

### Issue: "OAuth callback mismatch"
**Cause:** OAuth providers not updated to HTTPS
**Fix:** Update all OAuth redirect URIs in provider consoles

### Issue: "Stripe webhook failing"
**Cause:** Webhook URL still pointing to HTTP
**Fix:** Update webhook URL in Stripe dashboard

### Issue: "Mixed content warnings"
**Cause:** Some assets loading over HTTP
**Fix:** Check browser console, update any hardcoded HTTP URLs in code

### Issue: "Session not persisting"
**Cause:** Cookie domain/secure settings
**Fix:** NextAuth automatically handles this with NEXTAUTH_URL

---

## 📊 Post-Migration Checklist:

- [ ] ✅ SSL certificate installed and working
- [ ] ✅ HTTP redirects to HTTPS
- [ ] ✅ NEXTAUTH_URL updated to https://
- [ ] ✅ Google OAuth redirect URI updated
- [ ] ✅ Stripe webhook URL updated (if using Stripe)
- [ ] ✅ BigCommerce callback URLs updated (if BigCommerce app)
- [ ] ✅ Application restarted (pm2 restart all)
- [ ] ✅ Sign in/sign out works
- [ ] ✅ OAuth login works
- [ ] ✅ Dashboard accessible
- [ ] ✅ No console errors
- [ ] ✅ SSL Labs test passes (A or A+)
- [ ] ✅ Auto-renewal tested (certbot renew --dry-run)

---

## 🎯 SSL Labs Test:

Visit: https://www.ssllabs.com/ssltest/analyze.html?d=tekms.com

**Target Rating:** A or A+

If not A+, Nginx config already includes:
- TLS 1.2 and 1.3
- Strong ciphers
- HSTS header
- Security headers

---

## 🔐 Security Best Practices:

### Already Implemented:
✅ HTTPS everywhere (forced redirect)
✅ Secure session cookies (httpOnly, secure)
✅ API credentials encrypted in database
✅ Password hashing (bcrypt)
✅ CSRF protection (NextAuth)
✅ Security headers (HSTS, XSS, etc.)

### Recommended:
- [ ] Enable Cloudflare (free tier) for extra DDoS protection
- [ ] Set up log monitoring/alerts
- [ ] Regular security audits
- [ ] Keep dependencies updated (npm audit)

---

## 📝 Maintenance:

### Monthly:
- Check SSL certificate expiry: `sudo certbot certificates`
- Review access logs for suspicious activity
- Update dependencies: `npm update`

### Quarterly:
- Run security audit: `npm audit`
- Review and rotate API keys if needed
- Check SSL Labs rating

### Yearly:
- Review and update security policies
- Audit user access and permissions
- Consider security penetration testing

---

## 🆘 Emergency Procedures:

### If site goes down after SSL setup:

1. **Check Nginx:**
```bash
sudo nginx -t
sudo systemctl status nginx
sudo systemctl restart nginx
```

2. **Check SSL certificate:**
```bash
sudo certbot certificates
sudo certbot renew --force-renewal
```

3. **Check app:**
```bash
pm2 status
pm2 logs
pm2 restart all
```

4. **Temporary rollback to HTTP (if needed):**
```bash
sudo rm /etc/nginx/sites-enabled/tekms
sudo systemctl restart nginx
# App will be accessible via IP:3000
```

5. **Re-run setup:**
```bash
cd ~/tekms
git pull origin gokhan
sudo ./setup-ssl.sh
```

---

## 📞 Support Resources:

- Let's Encrypt: https://letsencrypt.org/docs/
- Nginx Docs: https://nginx.org/en/docs/
- Certbot Docs: https://eff-certbot.readthedocs.io/
- SSL Labs: https://www.ssllabs.com/
- NextAuth Docs: https://next-auth.js.org/