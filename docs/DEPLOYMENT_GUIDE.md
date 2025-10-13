# DEPLOYMENT GUIDE: Website Settings

**IMPORTANT**: All changes are committed to git but NOT deployed yet!  
Settings won't work until you deploy to your live server.

---

## 🚨 Why You Don't See Changes

**Problem**: Code is in git, but not running on your server  
**Solution**: Deploy the changes following the steps below

---

## 🚀 DEPLOYMENT STEPS (Follow in Order!)

### Step 1: Pull Latest Code (5 minutes)

```bash
# SSH into your server
cd /path/to/your/app

# Pull latest from gokhan branch
git pull origin gokhan

# Install any new dependencies
npm install
```

---

### Step 2: Seed Database Settings (2 minutes)

```bash
# This creates the default settings in your database
npx tsx prisma/seed-website-settings.ts
```

**Expected Output**:
```
🌱 Seeding website settings...
✓ Created: website.name
✓ Created: website.logo_url
✓ Created: website.header_title
... (26 settings total)
✅ Website settings seeded successfully!
```

---

### Step 3: Build Application (3 minutes)

```bash
# Build the Next.js app
npm run build
```

**Expected**: Build should succeed with no errors

---

### Step 4: Restart Server (1 minute)

```bash
# If using PM2:
pm2 restart all

# If using npm:
npm start

# If using next:
npm run start
```

---

### Step 5: Test Settings (5 minutes)

1. **Open your website** in browser
2. **Navigate to** `/admin/settings/website`
3. **Change logo URL** to any image path
4. **Click "Save Branding Settings"**
5. **Should see**: Green popup "Settings saved successfully!"
6. **Refresh homepage** - Logo should change!
7. **Check footer** - Should show your settings

---

## 📋 What Gets Applied

After deployment and saving settings:

### ✅ Homepage (`/`)
- Website logo (top-left corner)
- Site name next to logo

### ✅ Footer (All Pages)
- Website logo
- Site name
- Tagline
- Copyright text
- Social media links (Twitter, Facebook, LinkedIn, Instagram)
- Footer pages (from database)

### ✅ Browser Tab
- Favicon (browser icon)
- Page title

### ⚠️ Store Connector Icons
- **Not implemented yet** - Using default SVG icons
- **Can add later** if needed

---

## 🐛 Troubleshooting

### "Settings don't save"
```bash
# Check if database is accessible
npx prisma studio

# Look for Settings table
# Should have records after seeding
```

### "Logo doesn't change"
- Clear browser cache (Ctrl+Shift+R)
- Check logo URL is correct in settings
- Make sure file exists in /public folder

### "Favicon doesn't change"
- Hard refresh browser (Ctrl+Shift+R)  
- Favicon caching is aggressive
- May take 5-10 minutes to update

### "Can't access /admin/settings/website"
- Make sure you're logged in as ADMIN
- Check session.user.role in database
- Should be 'ADMIN' not 'USER'

---

## 🎯 Quick Test Checklist

After deployment, verify:

- [ ] `/admin/settings/website` page loads
- [ ] Can edit Website Name
- [ ] Can upload logo file
- [ ] Click "Save Branding Settings"
- [ ] See green "Settings saved successfully!" popup
- [ ] Refresh homepage (Ctrl+Shift+R)
- [ ] Logo appears in navigation
- [ ] Site name changed
- [ ] Check footer - shows your settings
- [ ] Try changing copyright text
- [ ] Save and refresh - see changes

---

## 📂 Files That Need to Exist

### On Server:
```
/public/uploads/         (will be created automatically)
  ├── branding/          (for logos, favicons)
  ├── icons/             (for platform icons)
  └── general/           (other uploads)
```

### In Database:
```
Settings table should have ~26 records after seeding:
- website.name
- website.logo_url
- website.favicon_url
- website.header_title
- website.tagline
- footer.copyright_text
- footer.social_twitter
- footer.social_facebook
- footer.social_linkedin
- footer.social_instagram
- seo.meta_description
- seo.meta_keywords
- general.google_analytics_id
... and more
```

---

## 💡 How to Use After Deployment

### Upload New Logo:
1. Go to `/admin/settings/website`
2. Click "Branding" tab
3. Under "Website Logo", click "Upload" button
4. Select image from computer (PNG, SVG, JPEG)
5. See preview
6. Click "Save Branding Settings" button
7. See green success popup
8. Refresh homepage - logo updated!

### Change Copyright Text:
1. Go to `/admin/settings/website`  
2. Click "Footer" tab
3. Edit "Copyright Text" field
4. Click "Save Footer Settings"
5. See green success popup
6. Refresh any page - footer updated!

### Add Social Media Links:
1. Go to `/admin/settings/website`
2. Click "Footer" tab
3. Enter Twitter, Facebook, LinkedIn, Instagram URLs
4. Click "Save Footer Settings"
5. Refresh page - links appear in footer!

---

## ⚠️ Common Mistakes

### Mistake 1: Didn't Deploy
**Problem**: Changed code in git but didn't pull/build/restart  
**Solution**: Follow deployment steps above

### Mistake 2: Didn't Seed Database
**Problem**: Settings table is empty  
**Solution**: Run `npx tsx prisma/seed-website-settings.ts`

### Mistake 3: Didn't Refresh Browser
**Problem**: Old page cached in browser  
**Solution**: Hard refresh (Ctrl+Shift+R) or clear cache

### Mistake 4: Wrong File Path
**Problem**: Logo URL doesn't exist  
**Solution**: Use Upload button or verify file exists in /public

---

## 🎉 Success Criteria

You'll know it's working when:
- ✅ Green "Settings saved successfully!" popup appears
- ✅ Logo changes when you upload new one
- ✅ Footer shows your copyright text
- ✅ Social media links appear in footer
- ✅ Site name changes everywhere
- ✅ Favicon changes in browser tab

---

## 📞 Need Help?

If settings still don't work after deployment:
1. Check browser console for errors (F12)
2. Check server logs for API errors
3. Verify database has Settings records
4. Make sure you're logged in as ADMIN
5. Try incognito/private window (fresh cache)

---

**Remember**: Code is in git, but server is still running old code!  
**Deploy first, then test!** 🚀