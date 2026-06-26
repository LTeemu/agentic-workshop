# Financial Dashboard

> ⚠️ **Experimental AI-assisted project** — built iteratively with agentic coding. The app fetches real-time market data via Finnhub's free tier and performs intraday analysis on current values only.

Search stocks, ETFs, and funds — view real-time quotes, company profiles, news, and simple intraday projections based on current market data.

Built with **Next.js 16 (App Router) + tRPC v11 + Drizzle ORM + Better Auth + TanStack Query**.

## Stack

| Layer         | Technology                               |
| ------------- | ---------------------------------------- |
| Framework     | Next.js 16 (App Router, Turbopack)       |
| Auth          | Better Auth (email/password)             |
| ORM           | Drizzle ORM + Postgres                   |
| API           | tRPC v11 (`@trpc/tanstack-react-query`)  |
| Client state  | TanStack Query v5 + Zustand              |
| Market data   | Finnhub REST API (free tier: 60 req/min) |
| Validation    | Zod v4                                   |
| Serialization | Superjson                                |

## Prerequisites

- **Node.js** 20.9+
- **PostgreSQL** running locally on port **5433** (password: `admin`)
- **Finnhub API key** — [get a free key](https://finnhub.io) (free tier: 60 calls/min)

## Getting Started

```bash
# 1. Create the database
psql -h localhost -p 5433 -U postgres -c "CREATE DATABASE financial_dashboard"
# Password: admin

# 2. Copy environment config
cp .env.example .env.local
# Edit .env.local with your FINNHUB_API_KEY and BETTER_AUTH_SECRET

# 3. Install dependencies
npm install

# 4. Apply Drizzle migrations
npm run db:migrate

# 5. Start development
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), register an account, then search and add symbols like `AAPL`, `VOO`, `MSFT`, `SPY`.

## What it does

| Feature             | Data source             | Notes                                     |
| ------------------- | ----------------------- | ----------------------------------------- |
| Symbol search       | Finnhub `/search`       | 2s debounced, cached 5min, trimmed dedup  |
| Track symbols       | Postgres                | Add/remove from personal watchlist        |
| Real-time quote     | Finnhub `/quote`        | Current price, change, day range          |
| Day analysis        | Computed from quote     | Direction, confidence, day range position |
| Intraday projection | Computed from quote     | Momentum-weighted target within day range |
| Company profile     | Finnhub `/profile2`     | Market cap, industry, exchange            |
| Recent news         | Finnhub `/company-news` | Last 30 days, 1hr cache                   |
| Data freshness      | Cache indicator on page | Shows "X ago" per data type               |

### What it doesn't do (Finnhub free tier limitations)

- ❌ No historical prices (candles/OHLCV)
- ❌ No technical indicators (SMA, RSI, MACD, Bollinger)
- ❌ No candlestick charts
- ❌ No multi-year forecasts

## Project Structure

```
src/
  app/
    page.tsx                    # Landing page (auth-aware, client component)
    (auth)/login/page.tsx
    (auth)/register/page.tsx
    dashboard/
      layout.tsx                # Dashboard layout with nav + sign out
      page.tsx                  # Overview: debounced search + tracked symbols
      [symbol]/
        page.tsx                # Symbol detail: quote, projection, news, profile
        components/
          kpi-cards.tsx         # Price, change, day range, range position, volatility, gap
          projection-panel.tsx  # Intraday projection with visual range bar
          news-feed.tsx         # Recent company news
          fundamentals.tsx      # Company profile card
          cache-indicator.tsx   # "Quote · 23s ago" freshness indicator
    api/
      auth/[...all]/route.ts    # Better Auth API handler
      trpc/[trpc]/route.ts      # tRPC fetch adapter
      cron/refresh/route.ts     # Data freshness ping endpoint
  auth.ts                       # Better Auth configuration (dynamic base URL)
  proxy.ts                      # Next.js 16 proxy: protects /dashboard/*
  server/
    db/
      schema/                   # Drizzle schema definitions
        tracked_symbols.ts
        price_history.ts
        indicators.ts
        data_freshness.ts
        auth-schema.ts
      index.ts                  # DB connection
    trpc/routers/
      stocks.ts                 # Search, add/remove, quote, profile, news, refresh
      analysis.ts               # getTrend, getMomentum, getProjection (live Finnhub data)
      _app.ts                   # Router composition
  trpc/
    init.ts                     # tRPC instance (Superjson transformer)
    context.ts                  # tRPC context (db + session)
    query-client.ts             # TanStack QueryClient factory
    server.tsx                  # Server-side prefetch helpers
    client.tsx                  # Client provider + useTRPC hook
  lib/
    auth-client.ts              # Better Auth client (useSession hook)
    finance/
      finnhub.ts                # Finnhub API client (search, quote, profile, news)
    hooks/                      # TanStack Query hooks
      useSearch.ts
      useStockData.ts
      useDashboard.ts
  stores/                       # Zustand stores
    dashboard.store.ts
    search.store.ts
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

## Database

PostgreSQL runs on **port 5433** with user `postgres` and password `admin`.

| Property | Value                                                          |
| -------- | -------------------------------------------------------------- |
| Host     | `localhost`                                                    |
| Port     | `5433`                                                         |
| User     | `postgres`                                                     |
| Password | `admin`                                                        |
| Database | `financial_dashboard`                                          |
| URL      | `postgres://postgres:admin@localhost:5433/financial_dashboard` |

### Access methods

**Drizzle Studio** (visual table browser):

```bash
npm run db:studio
```

Opens at `https://local.drizzle.studio`.

**psql**:

```bash
psql -h localhost -p 5433 -U postgres -d financial_dashboard
```

Password: `admin`

## Environment Variables

| Variable             | Description                                        |
| -------------------- | -------------------------------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string                       |
| `BETTER_AUTH_SECRET` | Auth secret (≥32 chars, `openssl rand -base64 32`) |
| `FINNHUB_API_KEY`    | Finnhub API key                                    |
| `CRON_SECRET`        | (Optional) Secret to protect `/api/cron/refresh`   |

## API Endpoints (tRPC)

All at `/api/trpc`. Key procedures:

### Stocks

- `stocks.search({ query })` — Search symbols on Finnhub
- `stocks.addSymbol({ symbol, name, type })` — Track a symbol
- `stocks.removeSymbol({ id })` — Stop tracking
- `stocks.getTracked()` — List tracked symbols
- `stocks.getQuote({ symbol })` — Real-time quote (price, change, day range)
- `stocks.getProfile({ symbol })` — Company profile
- `stocks.getNews({ symbol, limit })` — Recent news
- `stocks.refresh({ symbol })` — Update data freshness

### Analysis (computed from live Finnhub data)

- `analysis.getTrend({ symbol })` — Direction (up/down/sideways), confidence
- `analysis.getMomentum({ symbol })` — Market cap, industry, weighted score
- `analysis.getProjection({ symbol })` — Intraday projection (momentum-weighted target)

## Caching Behavior

Each data type has a different stale time. The page shows a `· 23s ago` indicator per section:

| Data           | Stale time | Behind the scenes                 |
| -------------- | ---------- | --------------------------------- |
| Quote          | 1 min      | Re-fetched on page visit if stale |
| Projection     | 1 min      | Computed from quote               |
| Trend/Momentum | 2 min      | Live Finnhub calls                |
| News           | 1 hour     | Cached, background refresh        |
| Profile        | 24 hours   | Company info is static            |
| Search         | 5 min      | Debounced 2s, trimmed dedup       |

## Deployment

### Vercel + Neon

```bash
npm install -g vercel
vercel init
vercel env add DATABASE_URL    # Neon Postgres connection string
vercel env add BETTER_AUTH_SECRET
vercel env add FINNHUB_API_KEY
vercel env add CRON_SECRET
vercel deploy
```

Set up a cron job to hit `https://your-domain.vercel.app/api/cron/refresh` daily using Vercel Cron Jobs (Pro) or cron-job.org.

## License

MIT
