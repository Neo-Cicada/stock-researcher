# Kabuka （株価）

A stock-research app with a Japanese woodblock-print (浮世絵) aesthetic. Kabuka surfaces **trending tickers** from Reddit chatter and renders **live market data** for individual stocks — candlestick charts, fundamentals, a Five-Petal scorecard, institutional ownership, and sentiment — all drawn as hand-tuned SVG on a rice-paper canvas. It also ships an economic-events calendar, an earnings calendar, and a big-institution 13F directory.

- **Real data:** trending mention counts / ranks / velocity from [ApeWisdom](https://apewisdom.io); live prices, OHLC candles, fundamentals, and institutional ownership from Yahoo Finance (via `yfinance`); overall market mood from CNN's Fear & Greed index; market themes, per-ticker headlines, and the earnings calendar from [Finnhub](https://finnhub.io); the economic-events calendar from [FRED](https://fred.stlouisfed.org) (St. Louis Fed); and big-institution 13F holdings from [SEC EDGAR](https://www.sec.gov/edgar). The stock-detail Five-Petal scorecard's Value / Growth / Quality / Momentum pillars are computed server-side from real fundamentals + candles.
- **Mock data:** sentiment timelines, mention-volume bars, social posts, and the scorecard's Sentiment pillar are generated from a seeded RNG (deterministic across server and client), pending real sources. Every live surface falls back to this mock data when a provider is unreachable or a ticker has no coverage.

The repo also ships **kabuka-agent**, an autonomous coding agent that wraps the `claude` CLI to plan → execute → verify changes to this codebase.

## Architecture

```
stock-researcher/
├── frontend/        Next.js 16 (App Router, React 19, TS strict) — pure inline styles, SVG charts
├── backend/         FastAPI + async SQLAlchemy + PostgreSQL — ApeWisdom ingest + yfinance
├── agent/           kabuka-agent — plan→approve→execute→verify CLI over `claude`
├── .claude/agents/  Project subagents (backend-api, frontend-ui, data-series, agent-tooling)
└── docker-compose.yml   Postgres + backend
```

**Data flow:** three backend background tasks keep Postgres fresh — ApeWisdom trending every 10 minutes, yfinance prices every 5 minutes, and a CNN Fear & Greed market-season snapshot every hour. The dashboard (`/`) is a server component that reads `/api/reddit/trending` and `/api/market/*` at render time (falling back to mock rows if the backend is down). The stock detail page (`/stock/[ticker]`) fetches live candles + fundamentals + a computed scorecard from `/api/stocks/{ticker}/history` (yfinance), recent headlines from `/api/stocks/{ticker}/news` (Finnhub), and institutional ownership from `/api/stocks/{ticker}/institutional` (Yahoo Finance), falling back per-field to mock data when a ticker is unknown or a provider is unreachable. The `/events`, `/earnings`, and `/institutions` pages fetch their calendars / directory the same way (FRED, Finnhub, and SEC EDGAR respectively), each with mock fallback.

**Pages:** `/` (dashboard) · `/events` (economic-events almanac) · `/earnings` (earnings almanac) · `/institutions` + `/institutions/[slug]` (13F directory + per-institution holdings) · `/stock/[ticker]` (stock detail).

## Tech stack

| | |
|---|---|
| **Frontend** | Next.js 16, React 19, TypeScript (strict), pure inline styles, hand-rolled SVG charts |
| **Backend** | Python 3.12+, FastAPI, SQLAlchemy 2.0 (async) + asyncpg, Alembic, PostgreSQL 16, `httpx` (ApeWisdom / CNN / Finnhub / FRED / SEC EDGAR), `yfinance`, `slowapi` (rate limiting), managed with `uv` |
| **Agent** | Python + `rich`, wraps the `claude` CLI (uses your Claude subscription — no API key) |

## Getting started

### Prerequisites

- Node.js 20+ and npm
- Python 3.12+ and [`uv`](https://docs.astral.sh/uv/)
- PostgreSQL 16 (local via Homebrew, or use Docker below)

### Option A — Docker for the database + backend

```bash
docker compose up --build      # starts Postgres (:5432) and the backend (:8000)
```

Then run the frontend locally (it is not containerized):

```bash
cd frontend && npm install && npm run dev   # http://localhost:3000
```

### Option B — All local

**1. Database** (Homebrew example):

```bash
brew services start postgresql@16
createdb kabuka        # if it doesn't exist
pg_isready             # verify it's accepting connections
```

**2. Backend** (from `backend/`):

```bash
cp .env.example .env                       # then edit if needed
uv sync
uv run alembic upgrade head                # apply migrations
uv run uvicorn app.main:app --reload       # http://localhost:8000
```

**3. Frontend** (from `frontend/`):

```bash
npm install
npm run dev                                # http://localhost:3000
```

Open http://localhost:3000.

## Configuration

**Backend** (`backend/.env`, see `.env.example`):

| Var | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | _(required)_ | Async Postgres DSN, e.g. `postgresql+asyncpg://postgres:postgres@localhost:5432/kabuka`. No source-code default — the credentialed string lives only in `.env` / your secret manager |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | Allowed frontend origin(s), JSON array. Set your real domain in production; never `["*"]` |
| `DEBUG` | `false` | Debug mode; also gates the interactive docs (`/docs`, `/openapi.json`) |
| `FINNHUB_API_KEY` | _(empty)_ | Free [Finnhub](https://finnhub.io) key powering market themes, per-ticker news, and the earnings calendar; endpoints return empty (frontend falls back to mock) when unset |
| `FRED_API_KEY` | _(empty)_ | Free [FRED](https://fredaccount.stlouisfed.org/apikeys) key powering the `/events` economic calendar; without it `/events` falls back to mock |
| `SEC_USER_AGENT` | _(generic default)_ | Descriptive `User-Agent` with contact info that SEC EDGAR requires for the `/api/institutions` 13F fetches; set your own name/email |
| `RATE_LIMIT_DEFAULT` | `120/minute` | Per-client API rate limit (slowapi syntax) |
| `ADMIN_TOKEN` | _(empty)_ | Shared secret guarding the manual `POST /api/reddit/fetch` trigger (sent as the `X-Admin-Token` header); empty disables the endpoint |

**Frontend:**

| Var | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend base URL |

## API

All endpoints are prefixed with `/api`:

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/stocks/` | List all stocks |
| `GET` | `/api/stocks/{ticker}` | Get a single stock |
| `GET` | `/api/stocks/{ticker}/history` | Live daily OHLC candles + fundamentals + computed Five-Petal scorecard (yfinance); `available:false` for unknown tickers |
| `GET` | `/api/stocks/{ticker}/news` | Recent headlines for a ticker (Finnhub company news; optional `name` hint); empty when unavailable |
| `GET` | `/api/stocks/{ticker}/institutional` | Institutional-ownership summary + top holders (Yahoo Finance); `available:false` when uncovered |
| `GET` | `/api/reddit/trending` | Trending tickers with aggregated mentions/ranks + merged latest price (params: `source`, `limit`) |
| `POST` | `/api/reddit/fetch` | Manually trigger an ApeWisdom fetch (guarded by `ADMIN_TOKEN`) |
| `GET` | `/api/market/season` | Overall market mood — CNN Fear & Greed (+ VIX / put-call / breadth) and a live social bullish % |
| `GET` | `/api/market/themes` | Today's market themes distilled from Finnhub general news; empty when unavailable |
| `GET` | `/api/market/events` | Upcoming economic calendar — CPI, jobs, GDP, PCE, PPI, FOMC (FRED + hardcoded FOMC dates) |
| `GET` | `/api/market/earnings` | Upcoming earnings reports (Finnhub earnings calendar), relevance-ranked then by date |
| `GET` | `/api/institutions/` | Curated big-institution shortlist, each with a 13F portfolio value + reporting period (SEC EDGAR) |
| `GET` | `/api/institutions/{slug}` | One institution's latest 13F top holdings; `available:false` for an unknown slug |
| `GET` | `/api/institutions/{slug}/search?q=` | Search an institution's **entire** 13F for a holding by ticker or issuer name |

### Example: `GET /api/stocks/NVDA/history`

Live daily OHLC candles plus key fundamentals from yfinance, and a computed `scorecard`
(the Value / Growth / Quality / Momentum Five-Petal pillars — `null` when there aren't
enough fundamentals). Unknown or unreachable tickers return
`{"ticker": "...", "available": false}` with an empty `candles` array and `null`
`fundamentals`, so the frontend can fall back to mock data.

```json
{
  "ticker": "NVDA",
  "available": true,
  "name": "NVIDIA Corporation",
  "currency": "USD",
  "price": 174.25,
  "previous_close": 171.30,
  "day_change_pct": 1.72,
  "candles": [
    { "date": "2026-07-10", "open": 168.90, "high": 172.40, "low": 168.10, "close": 171.30, "volume": 182340000 },
    { "date": "2026-07-11", "open": 171.55, "high": 175.00, "low": 170.80, "close": 174.25, "volume": 165220000 }
  ],
  "fundamentals": {
    "market_cap": 4250000000000,
    "trailing_pe": 51.3,
    "forward_pe": 38.7,
    "price_to_book": 62.1,
    "dividend_yield": 0.0002,
    "fifty_two_week_high": 195.62,
    "fifty_two_week_low": 86.62,
    "beta": 1.66,
    "profit_margins": 0.55,
    "return_on_equity": 1.19,
    "debt_to_equity": 12.9,
    "revenue_growth": 0.69,
    "earnings_growth": 0.76
  },
  "scorecard": {
    "value": { "score": 34, "inputs": [ /* P/E, P/B, div yield sub-scores */ ] },
    "growth": { "score": 88, "inputs": [ /* … */ ] },
    "quality": { "score": 91, "inputs": [ /* … */ ] },
    "momentum": { "score": 72, "inputs": [ /* … */ ] }
  }
}
```

## Common commands

**Frontend** (from `frontend/`): `npm run dev` · `npm run build` · `npm run lint`

**Backend** (from `backend/`):

```bash
uv run uvicorn app.main:app --reload                 # dev server
uv run alembic revision --autogenerate -m "message"  # new migration
uv run alembic upgrade head                           # apply migrations
uv run ruff check . && uv run ruff format .           # lint + format
uv run pytest                                         # tests
```

## kabuka-agent

An autonomous coding agent that wraps the `claude` CLI in a plan-then-execute workflow, running on your Claude subscription (no API key needed). It plans read-only, asks for approval, executes with write access, then runs a programmatic verification gate (lints the changed subtrees).

From `agent/`:

```bash
uv sync
uv run python -m agent "Your task description"           # plan → approve → execute → verify
uv run python -m agent --plan-only "Describe the task"   # plan only
uv run python -m agent --model sonnet --budget 5.0 "..." # custom model / budget cap
uv run python -m agent --autonomous --budget 6.0         # pick tasks from AGENT_BACKLOG.md and loop (no gate)
```

In `--autonomous` mode it triages the next task from `AGENT_BACKLOG.md` (or a `--goal`), plans, executes, and verifies with no approval gate — committing green tasks to a work branch and hard-reverting red ones. It stops on budget, `--max-iterations`, a consecutive-failure circuit breaker, an empty backlog, or a `.agent-stop` file, and never pushes.

## Project subagents

`.claude/agents/` defines task-specialized [Claude Code subagents](https://code.claude.com/docs/en/sub-agents) that Claude auto-delegates to based on the files a task touches:

| Subagent | Scope |
|---|---|
| `backend-api` | `backend/app/**` — endpoints, models, schemas, migrations, yfinance/ApeWisdom services |
| `frontend-ui` | `frontend/app/**`, `frontend/components/**` — pages, components, SVG, the woodblock design system |
| `data-series` | `frontend/lib/**` — chart geometry, ticker profiles, API client, seeded-RNG determinism |
| `agent-tooling` | `agent/**` — the kabuka-agent CLI itself |

## License

See [LICENSE](LICENSE).
