# BigCommerce "Get a Quote" App 🛍️💬

A complete BigCommerce app that replaces "Add to Cart" with "Get a Quote" functionality, allowing customers to request quotes for products directly from your storefront.

## 🎯 What This App Does

- **Replaces "Add to Cart"** with customizable "Get a Quote" buttons
- **Captures quote requests** from customers (name, email, phone, quantity)
- **Admin dashboard** embedded in BigCommerce admin panel
- **Track quote lifecycle**: Pending → Contacted → Completed
- **Zero external dependencies** - no database or paid services required
- **Modern UI** with beautiful modal forms
- **Mobile responsive** - works on all devices

## ✨ Features

### For Customers
- Click "Get a Quote" button on product pages
- Fill out simple quote request form
- Get instant confirmation
- Professional, mobile-friendly interface

### For Store Owners  
- View all quotes in BigCommerce admin
- Filter by status (pending, contacted, completed)
- Update quote status with one click
- See customer contact info and product details
- No monthly fees or external services

### Technical Features
- OAuth 2.0 authentication
- Secure JWT tokens
- JSON file storage (easy to migrate to database)
- Fully typed with TypeScript
- Built with Next.js 15 and React 19

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── callback/route.ts      # OAuth callback
│   │   ├── load/route.ts              # Load admin panel
│   │   ├── uninstall/route.ts         # Handle uninstall
│   │   └── bc/quotes/
│   │       ├── list/route.ts          # Get all quotes
│   │       ├── submit/route.ts        # Submit new quote
│   │       └── [id]/route.ts          # Update quote status
│   └── bc-admin/
│       └── page.tsx                   # Admin dashboard UI
│
├── lib/
│   └── bigcommerce-app/
│       ├── auth.ts                    # OAuth & JWT utilities
│       └── storage.ts                 # JSON file storage
│
├── types/
│   └── bigcommerce-app.ts             # TypeScript types
│
├── public/
│   └── widgets/
│       ├── quote-widget.js            # Storefront JavaScript
│       └── quote-widget.css           # Widget styles
│
├── data/                              # Created automatically
│   ├── stores.json                    # Installed stores
│   └── quotes.json                    # Quote requests
│
└── docs/
    ├── SETUP_GUIDE.md                 # Complete setup instructions
    ├── bigcommerce-app-development-guide.md
    ├── bigcommerce-app-implementation-plan.md
    └── zero-dependency-approach.md
```

## 🚀 Quick Start

### Prerequisites

- BigCommerce store
- Node.js 18+ installed
- Vercel account (free)
- GitHub account

### Step 1: Clone & Install

```bash
cd bigcommerce-api
npm install
```

### Step 2: Register App in BigCommerce

1. Go to https://devtools.bigcommerce.com
2. Create an app
3. Get your Client ID and Client Secret
4. Save for next step

### Step 3: Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
BIGCOMMERCE_CLIENT_ID=your_client_id
BIGCOMMERCE_CLIENT_SECRET=your_client_secret
BIGCOMMERCE_APP_URL=https://your-app.vercel.app
JWT_SECRET=generate_random_32_char_string
```

Generate JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 4: Deploy to Vercel

```bash
# Push to GitHub
git add .
git commit -m "Initial BigCommerce quote app"
git push

# Or deploy directly
vercel
```

### Step 5: Update BigCommerce DevTools

Update callback URLs with your Vercel URL:
```
https://your-app.vercel.app/api/auth/callback
https://your-app.vercel.app/api/load
https://your-app.vercel.app/api/uninstall
```

### Step 6: Install on Your Store

Visit:
```
https://login.bigcommerce.com/app/{YOUR_CLIENT_ID}/install
```

### Step 7: Add to Storefront

Edit your theme's `product.html`:

```html
<!-- Add before </body> -->
<link rel="stylesheet" href="https://your-app.vercel.app/widgets/quote-widget.css">
<script>
  window.QUOTE_WIDGET_API_URL = 'https://your-app.vercel.app';
  window.QUOTE_WIDGET_STORE_HASH = '{{settings.store_hash}}';
</script>
<script src="https://your-app.vercel.app/widgets/quote-widget.js"></script>

<!-- Replace Add to Cart -->
<button 
  data-quote-button
  data-product-id="{{product.id}}"
  data-product-name="{{product.title}}"
  data-product-sku="{{product.sku}}"
  data-product-price="{{product.price.without_tax.value}}"
  data-product-image="{{getImage product.main_image 'product_size'}}"
>
  Get a Quote
</button>
```

## 📖 Documentation

- **[Complete Setup Guide](docs/SETUP_GUIDE.md)** - Detailed step-by-step instructions
- **[Development Guide](docs/bigcommerce-app-development-guide.md)** - How BigCommerce apps work
- **[Implementation Plan](docs/bigcommerce-app-implementation-plan.md)** - Architecture details
- **[Zero Dependency Approach](docs/zero-dependency-approach.md)** - No external services needed

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BIGCOMMERCE_CLIENT_ID` | ✅ | From BigCommerce DevTools |
| `BIGCOMMERCE_CLIENT_SECRET` | ✅ | From BigCommerce DevTools |
| `BIGCOMMERCE_APP_URL` | ✅ | Your deployed Vercel URL |
| `JWT_SECRET` | ✅ | Random 32+ character string |
| `BIGCOMMERCE_STORE_HASH` | ⚠️ | For existing API (optional) |
| `BIGCOMMERCE_ACCESS_TOKEN` | ⚠️ | For existing API (optional) |

### Customization

**Change button text:**
```javascript
// In your theme
<button data-quote-button>Request Pricing</button>
```

**Customize colors:**
```css
/* Override in your theme CSS */
.quote-btn-submit {
  background: #your-brand-color;
}
```

## 🎨 Features in Detail

### Admin Dashboard

Built with shadcn/ui components:
- Stats cards showing total/pending/contacted/completed quotes
- Filter tabs for easy navigation
- Quote cards with full customer and product details
- One-click status updates
- Responsive design

### Storefront Widget

Modern modal interface:
- Clean, professional design
- Product info display with image
- Form validation
- Success/error messaging
- Mobile responsive
- Smooth animations

### Data Storage

Simple JSON files (easy to migrate):
```json
// data/quotes.json
{
  "quotes": [
    {
      "id": "quote_123",
      "customer": { "name": "John Doe", "email": "..." },
      "product": { "id": 456, "name": "..." },
      "quantity": 10,
      "status": "pending"
    }
  ]
}
```

## 🔐 Security

- OAuth 2.0 authentication
- Signed payload verification
- JWT tokens for session management
- HMAC signature validation
- Environment variable protection
- Input validation

## 📊 Scaling Considerations

### Current Setup (Good for)
- ✅ 1-10 stores
- ✅ Up to 1000 quotes/month
- ✅ Personal/small business use

### When to Upgrade
- 🔄 High volume (1000+ quotes/day)
- 🔄 Multiple concurrent stores
- 🔄 Advanced features needed
- 🔄 Planning to sell on marketplace

### Migration Path
```typescript
// Easy to migrate from JSON to database
// Current: Read from JSON
const quotes = await readFromJSON()

// Future: Read from database
const quotes = await db.quotes.findMany()
```

## 🐛 Troubleshooting

### App Won't Install
- Verify callback URLs match your Vercel deployment
- Check Client ID and Secret are correct
- Ensure all OAuth scopes are selected

### Quotes Not Submitting
- Check browser console for errors
- Verify `QUOTE_WIDGET_API_URL` is correct
- Ensure CORS is enabled (already configured)

### Admin Dashboard Blank
- Check `/api/load` endpoint logs
- Verify OAuth token was saved
- Try reinstalling the app

## 📈 Future Enhancements

Potential additions:
- [ ] Email notifications (Resend, SendGrid)
- [ ] PDF quote generation
- [ ] Customer quote history portal
- [ ] WhatsApp/SMS notifications
- [ ] Multiple product quotes (cart-like)
- [ ] Price negotiation workflow
- [ ] Quote templates
- [ ] Export to CSV/Excel
- [ ] Analytics dashboard

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **UI**: React 19 + shadcn/ui
- **Auth**: OAuth 2.0 + Jose (JWT)
- **Storage**: JSON files (filesystem)
- **Deployment**: Vercel
- **Styling**: Tailwind CSS

## 📝 License

This is a custom implementation for your BigCommerce store. Feel free to modify and extend as needed.

## 🤝 Support

For issues or questions:
1. Check the [Setup Guide](docs/SETUP_GUIDE.md)
2. Review BigCommerce API docs
3. Check Vercel deployment logs

## ⚡ Quick Commands

```bash
# Development
npm run dev

# Build
npm run build

# Deploy to Vercel
vercel --prod

# Generate new JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# View quotes (local)
cat data/quotes.json
```

## 🎉 Success!

You now have a fully functional "Get a Quote" system integrated with BigCommerce!

**What you've built:**
- ✅ Professional quote request system
- ✅ BigCommerce admin integration
- ✅ Beautiful storefront widget
- ✅ Complete quote management
- ✅ Zero monthly fees
- ✅ Fully customizable

Start collecting quote requests from your customers today! 🚀