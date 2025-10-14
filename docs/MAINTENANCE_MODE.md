# Maintenance Mode Feature

## Overview

Beautiful, modern maintenance mode system with admin controls and customizable messaging.

## Features

✅ **Toggle Switch** - Easy on/off control in Website Settings
✅ **Custom Messaging** - Set title, message, and ETA
✅ **Admin Bypass** - Admins can still access the site
✅ **Modern Design** - Animated gradients, glassmorphism, smooth animations
✅ **Feature Highlights** - Showcase upcoming improvements
✅ **Public API** - Maintenance page works without authentication

## How to Use

### 1. Enable Maintenance Mode

1. Go to **Admin Panel** → **Website Settings**
2. Click the **General** tab
3. Toggle **🚧 Maintenance Mode** switch ON
4. Customize the content:
   - **Title**: "We'll be back soon!"
   - **Message**: Your custom maintenance message
   - **ETA**: "Back online in 2 hours" (optional)
5. Click **Save All Changes**

### 2. Restart Server

For the maintenance mode to take effect in middleware:
```bash
# Development
npm run dev

# Production
pm2 restart bigcommerce-api
```

### 3. Test It

- **As Visitor**: Navigate to any page → Redirected to maintenance page
- **As Admin**: Can still access all pages normally
- **View Page**: Visit `/maintenance` directly to see the page

## Customization

### Maintenance Page Sections

**Animated Background**
- Beautiful blob animations
- Gradient effects
- Smooth transitions

**Main Card**
- Glassmorphism design
- Animated wrench icon
- Gradient title
- Custom message

**Features Section**
- Shows 3 upcoming features
- Can be edited in the code
- Each with icon and description

**Footer**
- Support contact link
- Customizable in page code

### Edit Feature List

File: `app/maintenance/page.tsx` (lines 93-113)

```tsx
<div className="grid gap-3">
  <div className="flex items-start gap-3 p-3 ...">
    <div className="h-2 w-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
    <div>
      <p className="font-medium">🚀 Your Feature</p>
      <p className="text-sm">Feature description</p>
    </div>
  </div>
</div>
```

## Technical Details

### Database Settings

Stored in `Settings` table:
```
general.maintenance_mode = 'true' | 'false'
general.maintenance_title = string
general.maintenance_message = string
general.maintenance_eta = string (optional)
```

### Middleware Logic

File: `middleware.ts`

```typescript
const maintenanceMode = process.env.MAINTENANCE_MODE === 'true'

if (maintenanceMode && !isMaintenancePage) {
  if (session?.user?.role !== 'ADMIN') {
    // Redirect to /maintenance
  }
}
```

### Public API

Endpoint: `GET /api/settings/public`

Returns maintenance settings and other public-facing configs:
```json
{
  "settings": {
    "general.maintenance_mode": "true",
    "general.maintenance_title": "We'll be back soon!",
    "general.maintenance_message": "Making improvements...",
    "general.maintenance_eta": "Back in 2 hours"
  }
}
```

## Files Created/Modified

### Created:
1. **`app/maintenance/page.tsx`** - Maintenance page component
2. **`app/api/settings/public/route.ts`** - Public settings API
3. **`app/api/admin/maintenance/route.ts`** - Maintenance toggle API
4. **`docs/MAINTENANCE_MODE.md`** - This documentation

### Modified:
1. **`app/admin/settings/website/page.tsx`** - Added toggle in General tab
2. **`middleware.ts`** - Added maintenance mode check

## Design Inspiration

The maintenance page features:

**Glassmorphism**
- Semi-transparent white background
- Backdrop blur effect
- Subtle borders

**Animated Blobs**
- Three blob elements
- Different animation delays
- Smooth movements

**Gradient Effects**
- Blue to purple gradients
- Used in title, icons, and accents
- Smooth transitions

**Micro-animations**
- Bouncing wrench icon
- Pulsing background
- Animated dots loader
- Blob movements

## Example Usage

### Deployment Updates
```
Title: "Upgrading Our Servers"
Message: "We're enhancing performance and adding exciting new features. Your data is safe and we'll be back shortly."
ETA: "Expected downtime: 30 minutes"
```

### Feature Releases
```
Title: "Something Amazing is Coming!"
Message: "We're launching a major update with real-time sync, smart pricing, and enhanced performance. Get ready for a better experience!"
ETA: "Back online at 10:00 PM EST"
```

### Emergency Maintenance
```
Title: "Brief Maintenance in Progress"
Message: "We're resolving a technical issue to ensure the best experience. Thank you for your patience."
ETA: "Back as soon as possible"
```

## Screenshots

### Admin Toggle
```
┌─────────────────────────────────────┐
│ 🚧 Maintenance Mode           [ON]  │
├─────────────────────────────────────┤
│ Maintenance Page Title              │
│ ┌─────────────────────────────────┐ │
│ │ We'll be back soon!             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Maintenance Message                 │
│ ┌─────────────────────────────────┐ │
│ │ We're making improvements...    │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Maintenance Page
```
╔═══════════════════════════════════════╗
║        🔧 (animated bouncing)         ║
║                                       ║
║      We'll be back soon!             ║
║      ─────────────────────            ║
║                                       ║
║   Making exciting improvements...     ║
║                                       ║
║   🕐 Back online in 2 hours          ║
║                                       ║
║   ✨ What's New                       ║
║   • Real-time Product Sync            ║
║   • Smart Pricing Tiers               ║
║   • Enhanced Performance              ║
║                                       ║
║   ● ● ● (animated loading dots)      ║
╚═══════════════════════════════════════╝
```

## Best Practices

1. **Set ETA**: Always provide an estimated time when possible
2. **Keep Updated**: If maintenance takes longer, update the ETA
3. **Test First**: Enable maintenance mode in development first
4. **Admin Access**: Remember admins can still access the site
5. **Clear Message**: Explain what's being improved
6. **Contact Info**: Provide support email for urgent issues

## Troubleshooting

### Maintenance page not showing?
1. Check database: `general.maintenance_mode` = 'true'
2. Restart server to reload middleware
3. Clear browser cache
4. Check if you're logged in as admin (admins bypass)

### Can't disable maintenance mode?
1. Use Website Settings toggle
2. Or manually update database:
   ```sql
   UPDATE Settings 
   SET value = 'false' 
   WHERE key = 'general.maintenance_mode'
   ```
3. Restart server

### Changes not saving?
1. Check admin permissions
2. Check database connection
3. View browser console for errors
4. Check server logs

## Future Enhancements

Potential improvements:
- [ ] Scheduled maintenance (set start/end times)
- [ ] Email notifications to users
- [ ] Custom maintenance page per domain
- [ ] Countdown timer
- [ ] Social media status integration
- [ ] Whitelist specific IPs
- [ ] Maintenance mode history/logs