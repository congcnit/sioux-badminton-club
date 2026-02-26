# Sioux Badminton Club

Club management web app built with:

- Next.js App Router
- MongoDB + Prisma
- NextAuth (credentials + JWT)
- Tailwind CSS + shadcn/ui

## Current implementation

- **Auth:** NextAuth credentials, Prisma adapter, JWT session, role-based access (ADMIN / MEMBER / COACH)
- **Modules:** Members, Sessions & Attendance, Budget (monthly + transactions), Fund (income/expense + category charts), **Arena** (monthly competition events, points, challenges, leaderboard), Courts (admin), Settings (profile + password)
- **Club rules:** Modal with schedule, participation rules, guest policy, fund transfer QR; versioned so users see updates
- **RBAC:** Admin-only mutations for budget, fund, sessions, members, courts, arena; members have read-only where applicable

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy env template:
   ```bash
   cp .env.example .env
   ```
   On Windows PowerShell:
   ```powershell
   Copy-Item .env.example .env
   ```

3. Fill `.env` values:
   - `DATABASE_URL` – MongoDB connection string
   - `NEXTAUTH_URL` – Full URL of the app (e.g. `http://localhost:3000` for dev)
   - `NEXTAUTH_SECRET` – Long random string (e.g. `openssl rand -base64 32`)

4. Generate Prisma client and sync schema:
   ```bash
   npm run db:generate
   npm run db:push
   ```

5. (Optional) Seed an admin user – see [Seed a user](#seed-a-user).

6. Start development server:
   ```bash
   npm run dev
   ```

## Project routes

| Route | Description |
|-------|-------------|
| `/` | Dashboard (stats, attendance ranking, fine ranking, charts) |
| `/sessions` | Sessions & attendance |
| `/budget` | Monthly budget (current month); `/budget/[year]/[month]` for a specific month |
| `/fund` | Club fund (transactions, income/expense by category charts) |
| `/members` | Member management |
| `/arena` | Arena (monthly competition events, leaderboard, challenges) |
| `/courts` | Court management (admin only) |
| `/settings/profile` | Profile settings |
| `/settings/password` | Change password |
| `/login` | Sign in |

## Production deployment

1. **Environment**
   - Set `NEXTAUTH_URL` to your production URL (e.g. `https://your-domain.com`). Required for auth callbacks.
   - Set `NEXTAUTH_SECRET` to a strong random value (do not use the example).
   - Set `DATABASE_URL` to your production MongoDB.

2. **Build and run**
   ```bash
   npm run db:generate
   npm run build
   npm start
   ```

3. **Checks**
   - Ensure `.env` is not committed (it is in `.gitignore`).
   - Run `db:seed` once in production if you need the initial admin user (or create users via your own process).
   - For MongoDB Atlas, allow the deployment host IP in the network access list (or use VPC peering if applicable).

### Deploying to Vercel (MongoDB Atlas)

Vercel uses dynamic IPs, so Atlas must allow connections from anywhere:

- In **MongoDB Atlas** → **Network Access** → **Add IP Address** → choose **Allow Access From Anywhere** (`0.0.0.0/0`).
- Without this, you may see "Server selection timeout" or "fatal alert: InternalError" when signing in or loading data on the deployed app.

## Seed a user

1. Ensure `.env` includes:
   - `SEED_USER_EMAIL`
   - `SEED_USER_PASSWORD` (minimum 8 characters)
   - `SEED_USER_NAME`
   - `SEED_USER_ROLE` (`ADMIN`, `MEMBER`, or `COACH`)

2. Run:
   ```bash
   npm run db:seed
   ```

   The seed script upserts by email, so you can rerun it to update the same user.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server (Next.js + webpack) |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to DB (no migrations) |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:seed` | Run seed script |
