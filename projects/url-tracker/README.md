# URL Tracker

> Mostly AI-generated.

Track any data from any web page. Give it a URL and CSS selectors — it scrapes the page on demand or on a schedule and charts how values change over time.

Built with **Next.js 16 (App Router) + tRPC v11 + Drizzle ORM + Better Auth + TanStack Query**.

## Stack

| Layer         | Technology                              |
| ------------- | --------------------------------------- |
| Framework     | Next.js 16 (App Router, Turbopack)      |
| Auth          | Better Auth (email/password)            |
| ORM           | Drizzle ORM + Postgres                  |
| API           | tRPC v11 (`@trpc/tanstack-react-query`) |
| Client state  | TanStack Query v5                       |
| Scraper       | cheerio (server-side HTML parsing)      |
| Charts        | lightweight-charts v5                   |
| Validation    | Zod v4                                  |
| Serialization | Superjson                               |

## Prerequisites

- **Node.js** 20.9+
- **PostgreSQL** running locally on port **5433** (password: `admin`)

## Getting Started

```bash
# 1. Create the database
psql -h localhost -p 5433 -U postgres -c "CREATE DATABASE url_tracker"
# Password: admin

# 2. Copy environment config
cp .env.example .env.local

# 3. Install dependencies
npm install

# 4. Apply Drizzle migrations
npm run db:migrate

# 5. Start development
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), register an account, then start adding pages to track.

## How it works

1. **Add a page** — paste a URL (product page, article, API endpoint, anything)
2. **Define fields** — add CSS selectors for each data point you want to track (price, rating, stock status, headline, image, etc.)
3. **Auto-detect** — the scraper scans schema.org JSON-LD, microdata (`[itemprop]`), and common CSS patterns to suggest fields automatically
4. **Scrape** — click "Scrape Now" to fetch the page and extract values; or set an interval (hourly/daily) for automatic scheduled scraping via the cron endpoint
5. **Track over time** — numeric fields get a line chart with previous/current/delta; text fields show a two-panel diff; boolean fields show status indicators

## Features

| Feature               | Description                                                                    |
| --------------------- | ------------------------------------------------------------------------------ |
| URL preview           | Fetches page metadata and auto-detects trackable fields                        |
| Field types           | Number (chart), Text (diff view), Boolean (status)                             |
| Diff view             | Numeric fields show previous/current/delta; text fields show side-by-side diff |
| Scheduled scraping    | Per-page interval (manual/hourly/daily) via cron endpoint                      |
| Field alerts          | Notify on change, alert thresholds (min/max)                                   |
| Folders               | Organize tracked pages into groups                                             |
| Charts                | lightweight-charts line charts for numeric field history                       |
| Batch refresh         | Scrape all pages at once                                                       |
| Responsive sidebar    | Folder navigation, mobile-friendly                                             |
| Robots.txt compliance | Scraper respects robots.txt with 1h hostname cache                             |
| Rate limiting         | 3s delay between requests to the same hostname                                 |
| No external APIs      | Everything runs on your own PostgreSQL + cheerio                               |

## Project Structure

```
src/
  app/
    page.tsx                     # Landing page
    (auth)/login/page.tsx        # Sign in
    (auth)/register/page.tsx     # Sign up
    dashboard/
      layout.tsx                 # Dashboard layout with sidebar + header
      page.tsx                   # Server component — reads ?folder= from searchParams
      dashboard-client.tsx       # Client-side page grid with delayed skeleton
      folder-sidebar.tsx         # Folder navigation with instant active state
      add/page.tsx               # 2-step add page flow
      [id]/page.tsx              # Page detail with fields, charts, diff view, alerts
    api/
      auth/[...all]/route.ts     # Better Auth API handler
      trpc/[trpc]/route.ts       # tRPC fetch adapter
      cron/scrape/route.ts      # Scheduled scraping endpoint
  auth.ts                        # Better Auth configuration
  proxy.ts                       # Next.js 16 proxy: protects /dashboard/*
  server/
    db/
      schema/                    # Drizzle schema definitions
        auth-schema.ts            # User, session, account, verification
        folders.ts                # Folder groups
        tracked_pages.ts          # Tracked URLs
        tracked_fields.ts         # CSS selector definitions per page
        field_history.ts          # Scraped values over time
        relations.ts              # Drizzle relations
      index.ts                    # DB connection
    trpc/routers/
      pages.ts                    # All procedures (folders, pages, scrape, preview)
      _app.ts                     # Router composition
  trpc/
    init.ts                       # tRPC instance (Superjson transformer)
    context.ts                    # tRPC context (db + session)
    query-client.ts               # TanStack QueryClient factory
    server.tsx                    # Server-side prefetch helpers
    client.tsx                    # Client provider + useTRPC hook
  lib/
    auth-client.ts                # Better Auth client
    scraper/
      scraper.ts                  # cheerio HTML scraper + field auto-detection
    hooks/
      usePages.ts                 # TanStack Query hooks for all procedures
    toast.tsx                     # Toast notification system
```

## Available Scripts

| Command               | Description                 |
| --------------------- | --------------------------- |
| `npm run dev`         | Start Next.js dev server    |
| `npm run build`       | Production build            |
| `npm run start`       | Start production server     |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate`  | Apply Drizzle migrations    |
| `npm run db:studio`   | Launch Drizzle Studio       |
| `npm run lint`        | Run ESLint                  |
| `npm run test`        | Run Vitest                  |

For scheduled scraping, configure an external cron job to hit `/api/cron/scrape` periodically (e.g. every 15 minutes, hourly, or however often you like). The code checks each page's own interval and skips pages not yet due.

## Environment Variables

| Variable             | Description                                        |
| -------------------- | -------------------------------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string                       |
| `BETTER_AUTH_SECRET` | Auth secret (≥32 chars, `openssl rand -base64 32`) |

## License

MIT
