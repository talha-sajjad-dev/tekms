# TEKMS Listing Manager - Setup Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database
- npm or pnpm package manager

## Initial Setup Steps

### 1. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

**Required variables to update:**
- `DATABASE_URL` - Your PostgreSQL connection string
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `ENCRYPTION_KEY` - Generate with: `openssl rand -base64 32`

**Optional (for full functionality):**
- Google OAuth credentials
- Stripe API keys
- Resend API key
- Meilisearch credentials

### 3. Generate Prisma Client

```bash
npx prisma generate
```

### 4. Run Database Migrations

```bash
npx prisma migrate dev --name init
```

This will:
- Create all database tables
- Set up relationships and indexes

### 5. Seed the Database

```bash
npx prisma db seed
```

This creates:
- Admin user (gokhansancar@gmail.com / 123456789Gs_)
- Initial pricing plans (Free, Starter, Professional)

### 6. Start Development Server

```bash
npm run dev
```

Visit: http://localhost:3000

## Admin Login

After seeding, you can login with:
- **Email**: gokhansancar@gmail.com
- **Password**: 123456789Gs_

⚠️ **Change this password immediately after first login!**

## Database Commands

### View Database in Prisma Studio
```bash
npx prisma studio
```

### Reset Database (⚠️ Deletes all data)
```bash
npx prisma migrate reset
```

### Create New Migration
```bash
npx prisma migrate dev --name description_of_changes
```

### Generate Prisma Client After Schema Changes
```bash
npx prisma generate
```

## Troubleshooting

### TypeScript Errors After Schema Changes
1. Run `npx prisma generate`
2. Restart your IDE/TypeScript server

### Database Connection Issues
- Verify `DATABASE_URL` in `.env`
- Ensure PostgreSQL is running
- Check database user permissions

### Seed Script Errors
- Ensure migrations have run first
- Check that Prisma client is generated
- Verify environment variables are set

## Next Steps

After setup is complete:

1. Configure Google OAuth (optional)
2. Set up Stripe products and prices
3. Configure Resend email templates
4. Deploy Meilisearch instance
5. Test the application flows

## Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment instructions.