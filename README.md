# JokeHub 😂

The world's funniest corner of the internet. A multilingual joke-sharing platform with community voting, self-moderation, and Liquid Glass design.

## Features

| Feature | Description |
|---|---|
| **Joke Feed** | Infinite scroll, skeleton loading, sorted by popular/newest/oldest |
| **Time Filters** | Today, This Week, This Month, This Year, All Time |
| **70+ Languages** | Full language selector with flags and search |
| **Hashtag Topics** | Tag jokes with #doctors, #animals, etc. Filter by topic |
| **Trending Tags** | Shows most-voted tags in the last 24h |
| **Thumbs Up/Down** | Cookie-based voting, no sign-up required |
| **Auto-Removal** | Jokes with 20+ thumbs down are auto-removed |
| **Emoji Reactions** | 😂 🤣 😐 🙄 💀 (non-intrusive) |
| **Share** | Copy, WhatsApp, Twitter, Facebook per joke |
| **Report/Flag** | Flag inappropriate content for admin review |
| **Submit Jokes** | With language, hashtags, rate limiting, duplicate detection |
| **Approval Queue** | New jokes: approved after 8h OR 10+ thumbs up |
| **Joke of the Day** | Auto-featured top joke in sidebar |
| **Random Joke** | 🎲 button for surprise jokes |
| **Dark/Light Theme** | Toggle with persistence, defaults to light |
| **Visitor Tracker** | Country breakdown in footer |
| **Admin Panel** | Discrete access, bulk approve/reject/delete, stats dashboard |
| **SEO** | Individual joke pages, tag pages, sitemap, robots.txt, llms.txt |
| **PWA** | Installable as mobile app |

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL 16 (Neon) |
| ORM | Prisma 6 |
| Hosting | Vercel |
| Design | Apple Liquid Glass, DM Sans |

## Deployment Guide

### Step 1: Create Neon Database

1. Go to [neon.tech](https://neon.tech) → Sign in
2. Click **New Project** → Name it `jokehub`
3. Copy the **connection string** (starts with `postgresql://`)

### Step 2: Create GitHub Repository

```bash
cd ~/Desktop
# Copy the jokehub folder here first
cd jokehub

git init
git add .
git commit -m "Initial commit: JokeHub"
```

Then on GitHub:
1. Go to github.com → **New Repository** → Name: `jokehub` → **Create**
2. Back in terminal:

```bash
git remote add origin https://github.com/YOUR_USERNAME/jokehub.git
git branch -M main
git push -u origin main
```

### Step 3: Push Database Schema

Create a `.env` file locally:

```bash
cp .env.example .env
```

Edit `.env` and paste your Neon connection string for `DATABASE_URL`.
Set `ADMIN_SECRET` to a strong random string.

Then:

```bash
npx prisma db push
npm run db:seed
```

### Step 4: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New → Project**
2. Import `jokehub` from GitHub
3. Before clicking Deploy, add **Environment Variables**:
   - `DATABASE_URL` = your Neon connection string
   - `ADMIN_SECRET` = your chosen admin password
4. Click **Deploy**

### Step 5: Connect Domain (optional)

In Vercel: **Settings → Domains** → Add your domain.

## Admin Access

The admin panel is hidden. To access it:
1. Click the invisible "admin" text in the footer (after "Made with 😂")
2. Enter your `ADMIN_SECRET`

Admin features:
- View pending/approved/flagged/removed jokes
- Bulk approve, reject, or delete
- Stats dashboard (total, pending, votes today, top languages, visits)

## Auto-Moderation Rules

- **Auto-approve**: Pending jokes are approved after 8 hours (via Vercel Cron, runs every 2h)
- **Fast-track**: Pending jokes with 10+ thumbs up are approved immediately
- **Auto-remove**: Approved jokes with 20+ thumbs down are auto-removed
- **Rate limit**: Max 5 joke submissions per hour per IP
- **Duplicate detection**: Rejects identical or >80% similar jokes

## File Structure

```
jokehub/
├── app/
│   ├── JokeHubApp.tsx        # Main client app (sidebar + feed)
│   ├── layout.tsx             # Root layout, fonts, PWA
│   ├── globals.css            # Light/dark theme variables
│   ├── page.tsx               # Home page
│   ├── not-found.tsx          # 404
│   ├── sitemap.xml/route.ts   # Dynamic sitemap
│   ├── joke/[id]/page.tsx     # Individual joke (SEO)
│   ├── tag/[name]/page.tsx    # Tag page (SEO)
│   └── api/
│       ├── jokes/route.ts     # GET list, POST submit
│       ├── jokes/[id]/route.ts # GET single joke
│       ├── vote/route.ts      # POST vote
│       ├── react/route.ts     # POST emoji reaction
│       ├── flag/route.ts      # POST report
│       ├── tags/route.ts      # GET tags + trending
│       ├── random/route.ts    # GET random joke
│       ├── visit/route.ts     # GET stats, POST log visit
│       └── admin/
│           ├── jokes/route.ts      # GET/PATCH/DELETE admin
│           ├── stats/route.ts      # GET dashboard stats
│           └── auto-approve/route.ts # Cron auto-approve
├── lib/
│   ├── prisma.ts              # Prisma singleton
│   └── constants.ts           # Languages, emojis, flag reasons
├── prisma/
│   ├── schema.prisma          # DB schema
│   └── seed.ts                # Seed initial tags
├── public/
│   ├── favicon.svg
│   ├── manifest.json
│   ├── robots.txt
│   └── llms.txt
├── vercel.json                # Cron config
├── package.json
└── tsconfig.json
```
