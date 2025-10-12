# TEKMS Listing Manager 🚀

A powerful multi-tenant SaaS platform for managing product listings across multiple e-commerce platforms including BigCommerce, Shopify, Etsy, and TikTok Shop.

## 🌟 Features

### Multi-Platform Integration
- **BigCommerce** - Direct API integration
- **Shopify** - OAuth-based store connections
- **Etsy** - OAuth with PKCE security
- **TikTok Shop** - OAuth integration
- Seamless product sync across all platforms

### User Features
- 🔐 **Secure Authentication** - Email/password + Google OAuth
- 🏪 **Multi-Store Management** - Connect unlimited stores
- 📦 **Product Management** - Centralized dashboard for all products
- 🔍 **Advanced Search** - Fast product search with filtering
- 💰 **Per-Store Billing** - Automatic tier upgrades based on product count
- 📊 **Analytics** - Track sync jobs and product statistics

### Admin Features
- ⚙️ **System Settings** - Database-driven configuration (no code changes needed)
- 👥 **User Management** - Manage roles and permissions
- 💵 **Pricing Tiers** - Flexible per-store pricing management
- 📄 **Page Management** - Edit footer pages and legal docs
- 🔑 **API Credentials** - Secure credential storage with AES-256-GCM encryption

### Subscription Tiers
- **Free** - 0-10 products ($0/month)
- **Starter** - 11-100 products ($10/month)
- **Growth** - 101-500 products ($25/month)
- **Business** - 501-2,000 products ($50/month)
- **Professional** - 2,001-10,000 products ($100/month)
- **Advanced** - 10,001+ products ($200/month)

## 🛠️ Tech Stack

- **Framework**: Next.js 15.2.4 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (DigitalOcean)
- **ORM**: Prisma
- **Authentication**: NextAuth.js v5
- **Payments**: Stripe
- **UI**: Tailwind CSS + shadcn/ui
- **Email**: Nodemailer (SMTP)

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Stripe account
- Email service (SMTP)
- Platform developer accounts (Shopify, Etsy, TikTok)

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/tekms-listing-manager.git
cd tekms-listing-manager
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/tekms"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
ENCRYPTION_KEY="generate-with-openssl-rand-hex-32"
```

### 4. Setup Database
```bash
# Run migrations
npx prisma migrate dev

# Seed pricing tiers
npx tsx prisma/seed-pricing-tiers.ts

# Seed footer pages
npx tsx prisma/seed-pages.ts
```

### 5. Start Development Server
```bash
npm run dev
```

Visit http://localhost:3000

### 6. Create Admin User

Register a user, then promote to admin:
```bash
npx prisma studio
# Find your user and change role to "ADMIN"
```

## 📁 Project Structure

```
tekms-listing-manager/
├── app/                    # Next.js app directory
│   ├── admin/             # Admin panel pages
│   ├── api/               # API routes
│   ├── products/          # Product management
│   └── stores/            # Store connections
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── auth/             # Auth components
├── lib/                   # Utility functions
│   ├── auth/             # Authentication
│   ├── platforms/        # Platform integrations
│   └── stripe/           # Stripe integration
├── prisma/               # Database schema & migrations
└── docs/                 # Documentation
```

## 🔧 Configuration

### Admin Panel Configuration
All system settings are managed via the admin panel at `/admin`:

1. **System Settings** (`/admin/settings`)
   - Stripe API keys
   - Email SMTP settings
   - OAuth credentials (Shopify, Etsy, TikTok)
   - AI provider settings

2. **Pricing Tiers** (`/admin/pricing`)
   - Manage subscription tiers
   - Configure Stripe price IDs
   - Set product ranges and features

3. **User Management** (`/admin/users`)
   - View all users
   - Manage roles and permissions
   - Grant legacy feature access

4. **Page Management** (`/admin/pages`)
   - Edit footer pages
   - Manage legal documents
   - SEO settings

## 🔐 Security Features

- **AES-256-GCM Encryption** - All API credentials encrypted at rest
- **Database-Driven Secrets** - No sensitive data in code or env vars
- **PKCE OAuth** - Etsy integration uses PKCE for enhanced security
- **Rate Limiting** - API endpoints protected
- **CSRF Protection** - Built into NextAuth.js
- **SQL Injection Prevention** - Prisma ORM parameterized queries

## 📊 API Endpoints

### Public APIs
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/callback/[provider]` - OAuth callbacks

### Protected APIs
- `GET /api/stores` - User's store connections
- `GET /api/products` - User's products with search/filter
- `POST /api/stores/connect` - Connect new store
- `GET /api/usage` - Usage statistics

### Admin APIs
- `GET/POST /api/admin/settings` - System settings
- `GET/PUT/DELETE /api/admin/pricing` - Pricing tiers
- `GET/PUT/DELETE /api/admin/users` - User management
- `GET/POST /api/admin/pages` - Page management

## 🧪 Testing

```bash
# Run tests (if configured)
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📦 Deployment

See [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

Quick deploy to Vercel:
```bash
vercel --prod
```

## 🎯 Roadmap

- [ ] Real-time product sync
- [ ] Advanced analytics dashboard
- [ ] Bulk product operations
- [ ] AI-powered SEO optimization
- [ ] Multi-language support
- [ ] White-label options
- [ ] API for third-party integrations
- [ ] Mobile app

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is proprietary software. All rights reserved.

## 💬 Support

- **Documentation**: [docs/](docs/)
- **Email**: support@tekms.com
- **Issues**: [GitHub Issues](https://github.com/yourusername/tekms/issues)

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components by [shadcn/ui](https://ui.shadcn.com/)
- Icons by [Lucide](https://lucide.dev/)
- Payments by [Stripe](https://stripe.com/)

---

**Made with ❤️ by the TEKMS Team**

Version: 1.0.0 | Last Updated: 2025-10-12