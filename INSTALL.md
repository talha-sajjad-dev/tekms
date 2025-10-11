# Quick Installation Guide

## Run These Commands in Order:

### 1. Install Dependencies
```bash
npm install
```
⏱️ Takes ~2-3 minutes

### 2. Generate Prisma Client
```bash
npx prisma generate
```
⏱️ Takes ~30 seconds
✅ This fixes all TypeScript errors

### 3. Setup Environment
```bash
cp .env.example .env
```
Then edit `.env` and add your `DATABASE_URL`

**For local testing with Docker:**
```bash
docker run --name tekms-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=tekms_db \
  -p 5432:5432 \
  -d postgres:16
```

Then use this in `.env`:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/tekms_db"
```

### 4. Generate NextAuth Secret
```bash
openssl rand -base64 32
```
Copy the output and add to `.env` as:
```
NEXTAUTH_SECRET="paste-output-here"
```

### 5. Run Database Migrations
```bash
npx prisma migrate dev --name init
```
⏱️ Takes ~10 seconds

### 6. Seed Database
```bash
npx prisma db seed
```
Creates admin user and pricing plans

### 7. Start Development Server
```bash
npm run dev
```

Visit: http://localhost:3000

## ✅ You'll Know It Worked When:

- No TypeScript errors in VS Code
- `npm run dev` starts without errors
- You can visit http://localhost:3000
- Prisma Studio works: `npx prisma studio`

## 🔐 Admin Credentials

After seeding:
- Email: gokhansancar@gmail.com
- Password: 123456789Gs_

## 📝 Let me know when you're done!

Reply with "done" or "installed" and I'll continue with the next phase: building the UI!