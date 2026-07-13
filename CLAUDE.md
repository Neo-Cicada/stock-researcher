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

PostgreSQL must be running locally (e.g. `brew services start postgresql@16`). Verify with `pg_isready`.

Backend env vars are configured in `backend/.env` (see `.env.example`). Vars: `DATABASE_URL` (default: `postgresql+asyncpg://postgres:postgres@localhost:5432/kabuka`), `CORS_ORIGINS` (JSON array, default: `["http://localhost:3000"]`), `DEBUG` (default: `false`).

Frontend env var: `NEXT_PUBLIC_API_URL` (default: `http://localhost:8000`) — the backend base URL.

## Project Overview

**Kabuka (株価)** is a stock research app with a Japanese woodblock-print aesthetic. The frontend fetches real trending ticker data from the backend API (mention counts, ranks, velocity from ApeWisdom) and uses deterministic mock data (seeded RNG) for price charts, sentiment, and sparklines. The backend ingests pre-aggregated Reddit mention data from the ApeWisdom API via a background task every 10 minutes. The frontend was implemented from an HTML/CSS/JS prototype exported from Claude Design (see `frontend/project/Kabuka.dc.html` and `frontend/chats/` for original design intent).

## Tech Stack

### Frontend
- Next.js 16 with App Router, React 19, TypeScript (strict mode)
- Pure inline styles — no CSS framework. `app/globals.css` has only resets and keyframe animations.
- All charts are pure SVG with pixel geometry pre-computed in `lib/series.ts` — no charting library.
- Path alias: `@/*` maps to `frontend/` root

### Backend
- Python 3.12+, FastAPI, Uvicorn
- SQLAlchemy 2.0 (async) + asyncpg, Alembic migrations
- PostgreSQL 16 (local install via Homebrew)
- Package management: uv (pyproject.toml + uv.lock)
- HTTP client: httpx (for ApeWisdom API calls)

## Architecture

### Frontend Routes

- `/` — Dashboard: trending stocks table (real data from backend), market season branch, themes sidebar
- `/stock/[ticker]` — Stock detail: candlestick chart, sentiment timeline, mention volume, fundamentals, scorecard pillars, social posts

### Backend API Endpoints

All endpoints prefixed with `/api`:

- `GET /api/health` — Health check
- `GET /api/stocks/` — List all stocks
- `GET /api/stocks/{ticker}` — Get single stock
- `GET /api/reddit/trending` — Trending tickers with aggregated mention counts, upvotes, ranks (params: `source`, `limit`)
- `POST /api/reddit/fetch` — Manually trigger ApeWisdom fetch

### Backend Structure

- **`app/main.py`** — FastAPI app with lifespan-managed background task that fetches ApeWisdom data every 10 minutes
- **`app/routers/`** — `stocks.py` (CRUD for stocks) and `reddit.py` (trending, manual fetch trigger)
- **`app/models/`** — SQLAlchemy models: `Stock`, `TrendingSnapshot`
- **`app/schemas/`** — Pydantic response models: `StockOut`, `TrendingTickerOut`, `RedditFetchResponse`
- **`app/services/apewisdom_fetcher.py`** — Fetches trending tickers from ApeWisdom API (`https://apewisdom.io/api/v1.0/filter/{filter}/page/{page}`) for 4 filters (all-stocks, wallstreetbets, investing, Daytrading), paginating up to 3 pages (300 tickers per filter). Bulk inserts `TrendingSnapshot` rows.
- **`app/database.py`** — Async engine + session factory; `get_db()` dependency for endpoint injection
- **`app/config.py`** — Pydantic BaseSettings, reads from `.env`

### Database Models

Two tables, two migrations (`f2d902d1e44e` — initial, `fa9d44ea0aa4` — ApeWisdom switch):

- `stocks` — ticker (unique), name, sector
- `trending_snapshots` — ticker (indexed), name, rank, mentions, upvotes, rank_24h_ago, mentions_24h_ago, source (indexed), fetched_at (timestamptz, indexed); unique constraint on (ticker, source, fetched_at)

### Server vs Client Components

Most components are **server components** — they receive pre-computed data as props and render inline-styled SVG/HTML. Only three components use `"use client"`:

- `Header.tsx` — needs `usePathname()` for active nav highlighting and search form
- `TrendingTable.tsx` — uses `useState` for pagination (20 per page) and subreddit filter tabs; fetches from backend API on filter change
- `ScorecardPillars.tsx` — uses `useState` for pillar card expand/collapse

### Frontend Data Layer (`lib/`)

- **`api.ts`** — Backend API client. `fetchTrending(source?, limit?)` fetches from `GET /api/reddit/trending`. `apiRowToView()` maps API response to `TrendingRowView` by merging real mention data with mock price/sentiment/sparkline data from ticker profiles.
- **`tickers.ts`** — 8 curated tickers (NVDA, SMCI, PLTR, GME, TSLA, COIN, AMD, SOFI) with hardcoded fundamentals, pillars, and posts. Unknown tickers get procedurally generated profiles via `getTickerProfile()` using FNV-1a hash as seed. `TRENDING_TICKERS` exports 120 tickers total (curated + auto-generated sector groups).
- **`series.ts`** — Generates candlestick series (42 candles), sentiment paths, volume bars, sparkline SVG paths, and Market Season Branch blossom/bud data from a ticker profile.
- **`rng.ts`** — Seeded Park-Miller LCG + FNV-1a hash. Ensures identical renders across server and client.
- **`dashboard.ts`** — Assembles mock trending table rows (fallback) and theme data. Exports `MARKET_STATE`.
- **`composite.ts`** — Weighted-average composite score from pillar data.
- **`colors.ts`** — Shared color palette constants.
- **`types.ts`** — TypeScript interfaces: `TickerProfile`, `Candle`, `Pillar`, `Post`, `TrendingRow`, etc.

### Frontend–Backend Integration

The dashboard page (`app/page.tsx`) is an async server component that fetches trending data from the backend at render time. If the backend is unreachable, it falls back to mock data from `dashboard.ts`. The `TrendingTable` client component receives initial rows as props and re-fetches from the backend API when the user clicks a subreddit filter tab (All, r/wallstreetbets, r/investing, r/daytrading).

### Design System

- Fonts: Shippori Mincho (headings), IBM Plex Sans (body), IBM Plex Mono (data)
- Background: `#F5F0E5` (rice paper), text: `#211C15` (sumi ink)
- Bullish: `#4A7C59`, Bearish: `#C3423F`
- `GrainOverlay` renders a fixed SVG `feTurbulence` noise filter for paper texture
- Inside SVG `<text>` elements, use literal font names (e.g., `"IBM Plex Mono, monospace"`) since CSS variables don't work in SVG.
- In React inline styles, don't mix CSS shorthand (`border`) with non-shorthand (`borderColor`) — use separate properties (`borderWidth`, `borderStyle`, `borderColor`) to avoid rerender bugs.

### Key Patterns

- **Adding a new curated ticker**: Add a profile constant in `lib/tickers.ts` and include the ticker string in `TRENDING_TICKERS`.
- **Adding a tracked ApeWisdom filter**: Add to `FILTERS` list in `backend/app/services/apewisdom_fetcher.py`. Update the frontend `FILTERS` array and `FILTER_LABELS` map in `components/TrendingTable.tsx`.
- **BareTwig pattern**: When a ticker has `insufficient: true` (< 60 mentions), render `BareTwig` component instead of charts. The `quietNote` field provides the reason text.
- **Design reference**: When intent is unclear, consult `frontend/project/Kabuka.dc.html` (original prototype) and `frontend/chats/chat1.md` (design conversation). These are excluded from linting.
- **Backend linting**: Ruff configured with `line-length = 88`, rules `E` (errors), `F` (pyflakes), `I` (isort), targeting Python 3.12. `alembic/versions/` is excluded from linting.
- **ApeWisdom ingestion flow**: Fetch trending data per filter (paginated) → bulk insert `TrendingSnapshot` rows with source and timestamp → `/trending` endpoint queries latest snapshots and aggregates across sources by ticker.

## Agent (Claude CLI Wrapper)

An autonomous coding agent that wraps the `claude` CLI in a plan-then-execute workflow. Uses your existing Claude subscription — no API key needed.

### Billing: always the subscription, never the API

The agent invokes the local `claude` CLI, which authenticates via the OAuth **subscription login** (`~/.claude.json` → `oauthAccount`). The CLI only switches to API/cloud billing when it sees a credential env var. To guarantee subscription usage regardless of the parent shell, `runner.py` strips these vars from the subprocess environment before spawning: `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `CLAUDE_CODE_USE_BEDROCK`, `CLAUDE_CODE_USE_VERTEX`, `AWS_BEARER_TOKEN_BEDROCK` (plus `CLAUDECODE`, so the child doesn't think it's nested). The `total_cost_usd` figures the agent prints are usage *estimates* the CLI reports either way — not API charges when running on the subscription.

### Commands

All agent commands must be run from the `agent/` directory:

```bash
cd agent
uv sync                                                 # Install dependencies
uv run python -m agent "Your task description"           # Full plan→approve→execute
uv run python -m agent --plan-only "Describe the task"   # Plan only, no execution
uv run python -m agent --model sonnet --budget 5.0 "Task" # Custom model/budget
uv run python -m agent                                   # Interactive prompt

# Autonomous mode: pick tasks from AGENT_BACKLOG.md / a goal and loop, no gate
uv run python -m agent --autonomous --budget 6.0
uv run python -m agent --autonomous --goal "Improve backend test coverage"
uv run python -m agent --autonomous --max-iterations 3 --branch agent/nightly
```

### Structure

Source code lives in `agent/src/agent/` (src layout, built with hatchling):

- **`cli.py`** — CLI argument parsing + plan→approve→execute→verify orchestration loop (and dispatch to autonomous mode)
- **`autonomous.py`** — `--autonomous` loop: triage (pick next task from `AGENT_BACKLOG.md`/`--goal`) → plan → execute → verify, with no approval gate. Green tasks are committed to a work branch (`agent/auto-<timestamp>`), red/no-op/errored tasks are hard-reverted (`git reset --hard` + `clean -fd`). Stops on budget, `--max-iterations`, consecutive-failure circuit breaker, empty backlog, or a `.agent-stop` file. Never pushes.
- **`git_ops.py`** — git helpers for the loop (branch checkout, HEAD snapshot, commit-all, reset/clean).
- **`state.py`** — autonomous run state (completed/failed tasks, total cost, iterations), persisted in `.git/kabuka-agent-state.json` so it is never committed
- **`runner.py`** — Invokes `claude -p` subprocess with JSON output parsing; strips billing-override env vars (see above); returns `ClaudeResult(result, session_id, cost_usd, model)` (`cost_usd` read from the CLI's `total_cost_usd` field). Handles both blocking (`--output-format json`) and real-time streaming (`--output-format stream-json`, parsing `message.content` text blocks).
- **`prompts.py`** — Builds system prompts from CLAUDE.md + plan/execute instructions
- **`verify.py`** — Programmatic post-execute gate: reads `git status --porcelain`, then runs the matching linter for each changed subtree (`backend/`→ruff, `frontend/`→eslint, `agent/`→ruff). Returns `CheckResult`s the CLI surfaces as pass/fail.
- **`display.py`** — Terminal UI with rich (panels, markdown rendering, approval prompt, verification-gate results)
- **`config.py`** — `AgentConfig` dataclass (repo_root, model, `max_budget_usd`, plan_only, stream). Budget is the only spend limiter — the installed `claude` CLI has no turn-limit flag.

### Flow

1. **Plan phase**: `claude -p --permission-mode plan` (read-only, explores codebase, outputs structured plan)
2. **User review**: Approve / Revise (with feedback) / Reject
3. **Execute phase**: `claude -p --resume SESSION_ID --permission-mode acceptEdits` (implements the approved plan)
4. **Verification gate**: independently lints the changed subtrees (`verify.py`); a lint failure exits non-zero rather than trusting the model's self-report
