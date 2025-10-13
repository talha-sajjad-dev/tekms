# Website Settings Implementation Plan

**Date**: 2025-10-13  
**Feature**: Centralized Website Settings Admin Panel  
**Status**: In Progress

---

## 📋 Overview

Create a comprehensive admin settings page that consolidates all website-related configuration in one place, making the site fully customizable without code changes.

---

## 🎯 Features to Implement

### 1. **Website Branding**
- [ ] Website name/title
- [ ] Website logo (upload)
- [ ] Favicon (upload)
- [ ] Header title
- [ ] Tagline/slogan

### 2. **Platform Icons**
- [ ] BigCommerce icon (SVG upload)
- [ ] Shopify icon (SVG upload)
- [ ] Etsy icon (SVG upload)
- [ ] TikTok icon (SVG upload)
- [ ] Custom platform icons support

### 3. **Page Content Management**
- [ ] Homepage hero text
- [ ] Homepage description
- [ ] About page content
- [ ] Contact page info
- [ ] Terms & Conditions
- [ ] Privacy Policy

### 4. **Footer Settings**
- [ ] Footer text/copyright
- [ ] Footer columns (3-4 columns)
- [ ] Footer links
- [ ] Social media links (Twitter, Facebook, LinkedIn, Instagram)
- [ ] Newsletter signup text

### 5. **SEO & Meta**
- [ ] Site meta description
- [ ] Site meta keywords
- [ ] Open Graph image
- [ ] Twitter card image

### 6. **General Settings**
- [ ] Maintenance mode toggle
- [ ] Coming soon mode
- [ ] Google Analytics ID
- [ ] Custom CSS
- [ ] Custom JavaScript (head/footer)

---

## 🗄️ Database Schema

### Using Existing `Settings` Table
```prisma
model Settings {
  id          String   @id @default(cuid())
  key         String   @unique
  value       String   @db.Text
  type        String   @default("string")
  category    String   @default("general")
  description String?
  isPublic    Boolean  @default(false)
  
  updatedAt   DateTime @updatedAt
  updatedBy   String?
}
```

### Settings Categories
- `branding` - Logo, favicon, site name
- `platform_icons` - Store connector icons
- `pages` - Page content
- `footer` - Footer configuration
- `seo` - Meta tags and SEO
- `integrations` - Analytics, scripts
- `general` - Other settings

### Settings Keys Structure
```typescript
// Branding
website.name
website.logo_url
website.favicon_url
website.header_title
website.tagline

// Platform Icons
platform.bigcommerce_icon
platform.shopify_icon
platform.etsy_icon
platform.tiktok_icon

// Pages
page.homepage_hero
page.homepage_description
page.about_content
page.contact_info

// Footer
footer.copyright_text
footer.column1_title
footer.column1_links (JSON)
footer.social_twitter
footer.social_facebook
footer.social_linkedin
footer.social_instagram

// SEO
seo.meta_description
seo.meta_keywords
seo.og_image_url
seo.twitter_card_image

// General
general.maintenance_mode
general.google_analytics_id
general.custom_css
general.custom_js_head
general.custom_js_footer
```

---

## 📁 Files to Create

### 1. Admin Settings Page
**File**: `app/admin/settings/website/page.tsx`
- Tabbed interface (Branding, Icons, Pages, Footer, SEO, General)
- Form with real-time preview
- Image upload for logos/icons
- Rich text editor for page content
- Save button with success feedback

### 2. API Endpoints
**File**: `app/api/admin/settings/route.ts`
- GET `/api/admin/settings` - Get all settings
- GET `/api/admin/settings?category=branding` - Get by category
- POST `/api/admin/settings` - Update multiple settings
- PUT `/api/admin/settings/[key]` - Update single setting

### 3. Settings Service
**File**: `lib/settings/service.ts`
- `getSettings(category?)` - Get settings
- `getSetting(key)` - Get single setting
- `updateSettings(settings)` - Bulk update
- `updateSetting(key, value)` - Single update
- `getPublicSettings()` - Get public-facing settings

### 4. File Upload Handler
**File**: `app/api/admin/upload/route.ts`
- Handle logo uploads
- Handle favicon uploads
- Handle icon uploads
- Optimize images
- Store in `/public/uploads/`

### 5. Settings Context (Frontend)
**File**: `lib/contexts/SettingsContext.tsx`
- Provide settings throughout the app
- Cache settings in memory
- Auto-refresh on update

---

## 🎨 UI Components

### 1. Settings Tabs Component
```typescript
<Tabs>
  <TabsList>
    <TabsTrigger value="branding">Branding</TabsTrigger>
    <TabsTrigger value="icons">Platform Icons</TabsTrigger>
    <TabsTrigger value="pages">Pages</TabsTrigger>
    <TabsTrigger value="footer">Footer</TabsTrigger>
    <TabsTrigger value="seo">SEO</TabsTrigger>
    <TabsTrigger value="general">General</TabsTrigger>
  </TabsList>
  
  <TabsContent value="branding">
    <BrandingSettings />
  </TabsContent>
  // ... other tabs
</Tabs>
```

### 2. Image Upload Component
```typescript
<ImageUpload
  label="Website Logo"
  value={settings.website_logo_url}
  onChange={(url) => updateSetting('website.logo_url', url)}
  preview={true}
  maxSize={2} // MB
  acceptedFormats={['image/png', 'image/svg+xml']}
/>
```

### 3. Rich Text Editor
```typescript
<RichTextEditor
  value={settings.about_content}
  onChange={(html) => updateSetting('page.about_content', html)}
  toolbar={['bold', 'italic', 'link', 'image']}
/>
```

---

## 🔄 Implementation Steps

### Phase 1: Database & API (1 hour)
1. [ ] Seed default settings to database
2. [ ] Create settings service (`lib/settings/service.ts`)
3. [ ] Create API endpoints (`/api/admin/settings/route.ts`)
4. [ ] Create file upload API (`/api/admin/upload/route.ts`)
5. [ ] Test API with Postman/curl

### Phase 2: UI Components (1.5 hours)
6. [ ] Create settings page (`app/admin/settings/website/page.tsx`)
7. [ ] Create tabbed interface
8. [ ] Create form components for each section
9. [ ] Create image upload component
10. [ ] Add rich text editor for pages

### Phase 3: Integration (30 minutes)
11. [ ] Connect forms to API
12. [ ] Add loading states
13. [ ] Add success/error toasts
14. [ ] Add form validation

### Phase 4: Apply Settings (1 hour)
15. [ ] Create settings context
16. [ ] Apply logo to navbar
17. [ ] Apply favicon dynamically
18. [ ] Apply platform icons to store connector
19. [ ] Apply footer settings
20. [ ] Apply page content

### Phase 5: Testing (30 minutes)
21. [ ] Test all settings save correctly
22. [ ] Test image uploads work
23. [ ] Test settings apply immediately
24. [ ] Test on mobile
25. [ ] Test admin-only access

---

## 🎯 Success Criteria

- [ ] All website branding can be changed via admin panel
- [ ] Platform icons can be customized
- [ ] Page content can be edited
- [ ] Footer can be fully configured
- [ ] SEO meta tags can be updated
- [ ] Changes apply immediately without code deployment
- [ ] Only admins can access settings
- [ ] Settings are cached for performance
- [ ] Images are optimized automatically

---

## 📸 UI Mockup

```
┌─────────────────────────────────────────────────────┐
│ Website Settings                                     │
├─────────────────────────────────────────────────────┤
│ [Branding] [Icons] [Pages] [Footer] [SEO] [General] │
├─────────────────────────────────────────────────────┤
│                                                       │
│ Branding Settings                                    │
│                                                       │
│ Website Name: [TEKMS Listing Manager        ]        │
│ Header Title: [Multi-Platform Product Manager]       │
│ Tagline:      [Manage products across platforms]     │
│                                                       │
│ Website Logo:                                         │
│ ┌─────────┐                                          │
│ │ [Upload]│  [Current logo preview]                  │
│ └─────────┘                                          │
│                                                       │
│ Favicon:                                              │
│ ┌─────────┐                                          │
│ │ [Upload]│  [Current favicon preview]               │
│ └─────────┘                                          │
│                                                       │
│                              [Cancel] [Save Changes] │
└─────────────────────────────────────────────────────┘
```

---

## 🔐 Security Considerations

1. **Admin-Only Access**
   - Check `session.user.role === 'ADMIN'`
   - Redirect non-admins

2. **File Upload Security**
   - Validate file types
   - Scan for malware
   - Limit file sizes
   - Sanitize filenames

3. **XSS Prevention**
   - Sanitize HTML content
   - Escape user input
   - CSP headers

4. **Input Validation**
   - Validate URLs
   - Validate JSON
   - Length limits

---

## 🚀 Future Enhancements

- [ ] Theme customization (colors, fonts)
- [ ] Email template customization
- [ ] Multi-language support
- [ ] Import/Export settings
- [ ] Settings versioning/rollback
- [ ] Settings API for integrations
- [ ] Custom domain mapping
- [ ] SSL certificate management

---

## 💡 Benefits

1. **No Code Deployment Needed**
   - Change branding instantly
   - Update content without developer

2. **Consistent Branding**
   - Centralized management
   - Apply everywhere automatically

3. **SEO Friendly**
   - Easy meta tag updates
   - Better search rankings

4. **Professional Look**
   - Custom logos and icons
   - Branded everywhere

5. **Time Savings**
   - 10 minutes vs. 2 hours for code changes
   - No git commits needed

---

**Estimated Development Time**: 4 hours  
**Estimated Business Value**: High (saves hours of dev time)  
**Priority**: Medium-High (nice to have, improves UX)