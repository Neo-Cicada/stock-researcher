# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend

All frontend commands must be run from the `frontend/` directory:

```bash
cd frontend
npm run dev      # Start Next.js dev server
npm run build    # Production build
npm run lint     # ESLint (flat config, eslint.config.mjs)
```

### Backend

All backend commands must be run from the `backend/` directory:

```bash
cd backend
uv sync                                              # Install dependencies
uv run uvicorn app.main:app --reload                  # Start dev server (port 8000)
uv run alembic revision --autogenerate -m "message"   # Generate migration
uv run alembic upgrade head                           # Apply migrations
uv run ruff check .                                   # Lint
uv run ruff format .                                  # Format
uv run pytest                                         # Run tests (none exist yet)
```

PostgreSQL must be running. Start services via Docker from repo root:

```bash
docker compose up db -d        # DB only (for local dev)
docker compose up              # Full stack (DB + backend)
```

Backend env vars are configured in `backend/.env` (see `.env.example`). Vars: `DATABASE_URL` (default: `postgresql+asyncpg://postgres:postgres@localhost:5432/kabuka`), `CORS_ORIGINS` (JSON array, default: `["http://localhost:3000"]`), `DEBUG` (default: `false`).

## Project Overview

**Kabuka (株価)** is a stock research app with a Japanese woodblock-print aesthetic. The frontend uses deterministic mock data (seeded RNG) — it does **not** call the backend API. The backend independently ingests real Reddit data via a background task. The two layers are not yet integrated. The frontend was implemented from an HTML/CSS/JS prototype exported from Claude Design (see `frontend/project/Kabuka.dc.html` and `frontend/chats/` for original design intent).

## Tech Stack

### Frontend
- Next.js 16 with App Router, React 19, TypeScript (strict mode)
- Pure inline styles — no CSS framework. `app/globals.css` has only resets and keyframe animations.
- All charts are pure SVG with pixel geometry pre-computed in `lib/series.ts` — no charting library.
- Path alias: `@/*` maps to `frontend/` root

### Backend
- Python 3.12+, FastAPI, Uvicorn
- SQLAlchemy 2.0 (async) + asyncpg, Alembic migrations
- PostgreSQL 16 (via Docker)
- Package management: uv (pyproject.toml + uv.lock)
- HTTP client: httpx (for Reddit API calls)

## Architecture

### Frontend Routes

- `/` — Dashboard: trending stocks table, market season branch, themes sidebar
- `/stock/[ticker]` — Stock detail: candlestick chart, sentiment timeline, mention volume, fundamentals, scorecard pillars, social posts

### Backend API Endpoints

All endpoints prefixed with `/api`:

- `GET /api/health` — Health check
- `GET /api/stocks/` — List all stocks
- `GET /api/stocks/{ticker}` — Get single stock
- `GET /api/reddit/mentions` — List mentions (filters: subreddit, ticker, hours, limit)
- `GET /api/reddit/mentions/{ticker}` — Ticker-specific mentions
- `GET /api/reddit/trending` — Trending tickers with aggregated mention counts and scores
- `POST /api/reddit/fetch` — Manually trigger Reddit fetch

### Backend Structure

- **`app/main.py`** — FastAPI app with lifespan-managed background task that fetches Reddit posts every 10 minutes
- **`app/routers/`** — `stocks.py` (CRUD for stocks) and `reddit.py` (mentions, trending, manual fetch trigger)
- **`app/models/`** — SQLAlchemy models: `Stock`, `RedditPost`, `StockMention` (junction table with unique constraint on post_id+ticker)
- **`app/schemas/`** — Pydantic response models: `StockOut`, `StockMentionOut`, `TrendingTickerOut`, `RedditFetchResponse`
- **`app/services/reddit_fetcher.py`** — Fetches hot posts from Reddit's public JSON API for 3 subreddits (wallstreetbets, investing, daytrading) with 2s rate-limit sleep between subs. Uses PostgreSQL `ON CONFLICT` for upserts.
- **`app/services/ticker_extractor.py`** — Extracts tickers from text: cashtags (`$TICKER`) always accepted, bare uppercase words only if in known_tickers set. Has comprehensive `FALSE_POSITIVES` exclusion list.
- **`app/services/known_tickers.py`** — Set of ~120 tracked ticker symbols (mirrors frontend's `TRENDING_TICKERS`)
- **`app/database.py`** — Async engine + session factory; `get_db()` dependency for endpoint injection
- **`app/config.py`** — Pydantic BaseSettings, reads from `.env`

### Database Models

Three tables, one migration (`f2d902d1e44e` — initial):

- `stocks` — ticker (unique), name, sector
- `reddit_posts` — reddit_id (unique), subreddit, title, selftext, author, score, num_comments, created_utc
- `stock_mentions` — post_id (FK → reddit_posts, cascade delete), ticker, subreddit, mentioned_at, score; unique constraint on (post_id, ticker)

`RedditPost` → `StockMention` is one-to-many with cascade delete.

### Server vs Client Components

Most components are **server components** — they receive pre-computed data as props and render inline-styled SVG/HTML. Only three components use `"use client"`:

- `Header.tsx` — needs `usePathname()` for active nav highlighting and search form
- `TrendingTable.tsx` — uses `useState`/`useEffect` for loading skeleton, pagination (20 per page), and subreddit filter tabs
- `ScorecardPillars.tsx` — uses `useState` for pillar card expand/collapse

### Frontend Data Layer (`lib/`)

All frontend data is deterministic mock data (no API calls):

- **`tickers.ts`** — 8 curated tickers (NVDA, SMCI, PLTR, GME, TSLA, COIN, AMD, SOFI) with hardcoded fundamentals, pillars, and posts. Unknown tickers get procedurally generated profiles via `getTickerProfile()` using FNV-1a hash as seed. `TRENDING_TICKERS` exports 120 tickers total (curated + auto-generated sector groups).
- **`series.ts`** — Generates candlestick series (42 candles), sentiment paths, volume bars, sparkline SVG paths, and Market Season Branch blossom/bud data from a ticker profile.
- **`rng.ts`** — Seeded Park-Miller LCG + FNV-1a hash. Ensures identical renders across server and client.
- **`dashboard.ts`** — Assembles trending table rows and theme data. Exports `MARKET_STATE`. Deterministically assigns subreddits to each ticker.
- **`composite.ts`** — Weighted-average composite score from pillar data.
- **`colors.ts`** — Shared color palette constants.
- **`types.ts`** — TypeScript interfaces: `TickerProfile`, `Candle`, `Pillar`, `Post`, `TrendingRow`, etc.

### Design System

- Fonts: Shippori Mincho (headings), IBM Plex Sans (body), IBM Plex Mono (data)
- Background: `#F5F0E5` (rice paper), text: `#211C15` (sumi ink)
- Bullish: `#4A7C59`, Bearish: `#C3423F`
- `GrainOverlay` renders a fixed SVG `feTurbulence` noise filter for paper texture
- Inside SVG `<text>` elements, use literal font names (e.g., `"IBM Plex Mono, monospace"`) since CSS variables don't work in SVG.

### Key Patterns

- **Adding a new curated ticker**: Add a profile constant in `lib/tickers.ts` and include the ticker string in `TRENDING_TICKERS`.
- **Adding a tracked subreddit**: Add to `SUBREDDITS` list in `backend/app/services/reddit_fetcher.py`. The frontend subreddit filter tabs in `TrendingTable.tsx` must also be updated.
- **BareTwig pattern**: When a ticker has `insufficient: true` (< 60 mentions), render `BareTwig` component instead of charts. The `quietNote` field provides the reason text.
- **Design reference**: When intent is unclear, consult `frontend/project/Kabuka.dc.html` (original prototype) and `frontend/chats/chat1.md` (design conversation). These are excluded from linting.
- **Backend linting**: Ruff configured with `line-length = 88`, rules `E` (errors), `F` (pyflakes), `I` (isort), targeting Python 3.12.
- **Reddit ingestion flow**: Fetch hot posts → extract tickers from title+selftext → upsert post (ON CONFLICT DO UPDATE on reddit_id) → insert mentions (ON CONFLICT DO NOTHING on post_id+ticker) → commit.
