# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start Next.js dev server
- `npm run build` — Production build
- `npm run lint` — Run ESLint (flat config, `eslint.config.mjs`)

There are no tests configured.

## Project Overview

**Kabuka (株価)** is a stock research app with a Japanese woodblock-print aesthetic. The frontend fetches real data from the backend API — trending tickers (ApeWisdom), price candles + fundamentals (yfinance), the market-season gauge (CNN Fear & Greed), and themes + per-ticker news headlines (Finnhub) — falling back to deterministic mock data (seeded RNG) whenever a source is unavailable. Reddit crowd data (sentiment timeline, mention-volume bars, sparklines, scorecard pillars, social posts) is always mock. The app was implemented from HTML/CSS/JS prototypes exported from Claude Design (see `project/Kabuka.dc.html` and `chats/` for original design intent).

## Tech Stack

- Next.js 16 with App Router, React 19, TypeScript (strict mode)
- Pure inline styles throughout — no CSS framework or utility classes. The only CSS file is `app/globals.css` for resets and keyframe animations.
- Path alias: `@/*` maps to the project root

## Architecture

### Routes (App Router)

- `/` — Dashboard with trending stocks table (real data from backend), market season branch visualization, and themes sidebar
- `/events` — Economic-events calendar (CPI/FOMC/jobs) from Finnhub as a paginated, date-grouped almanac (`EventsBoard`) with impact discs (high/medium/low); mock fallback
- `/earnings` — Earnings schedule from Finnhub as a paginated, date-grouped almanac (`EarningsBoard`) with dawn/dusk session discs; rows link to `/stock/[ticker]`; mock fallback
- `/institutions` — Big-institution directory: a grid of hanko-seal cards (`InstitutionsGrid`) with each institution's SEC 13F portfolio value + quarter; mock fallback. `/institutions/[slug]` shows that institution's latest 13F holdings (`HoldingsBoard`: paginated, ticker-first rows, weight-bars, deep-links to `/stock/[ticker]` when the CUSIP resolved) plus a `HoldingSearch` box ("does this fund hold X?" — searches the entire 13F via the backend, falling back to filtering the loaded top rows when offline); mock fallback via `buildInstitutionDetailMock`
- `/stock/[ticker]` — Stock detail page with candlestick chart, sentiment timeline, mention volume, fundamentals grid, institutional ownership (`InstitutionalOwnership`: Yahoo Finance donut + top-holder bars, mock fallback), a composite scorecard section (`ScorecardPillars`, 5 weighted pillars: val/grw/qlt/mom/snt), and social posts

The scorecard is a section inside the stock detail page, not a separate route.

### Data Layer (`lib/`)

- `api.ts` — Backend API client (uses `NEXT_PUBLIC_API_URL`, default `http://localhost:8000`; every fetch degrades to `null`/mock on failure). `fetchTrending(source?, limit?)` → `GET /api/reddit/trending` (`apiRowToView()` merges real mentions with mock price/sentiment/sparkline). `fetchTickerHistory(ticker)` → `/history` (candles + fundamentals). `fetchTickerNews(ticker, name?)` → `/news`. `fetchMarketSeason()` → `/api/market/season`. `fetchThemes()` → `/api/market/themes`. `fetchEconomicEvents()` → `/api/market/events`. `fetchEarnings()` → `/api/market/earnings`. `fetchInstitutionalOwnership(ticker)` → `/api/stocks/{ticker}/institutional` (Yahoo Finance ownership; mock fallback via `buildInstitutionalMock`). `fetchInstitutions()` → `/api/institutions/` (13F big-holder list; mock fallback `INSTITUTIONS_MOCK`), `fetchInstitutionHoldings(slug)` → `/api/institutions/{slug}` (13F holdings; mock fallback `buildInstitutionDetailMock`), and `searchInstitutionHoldings(slug, q)` → `/api/institutions/{slug}/search` (whole-portfolio "do they hold X?"; `available:false` when offline so the caller filters loaded rows instead). Each has a paired `api*ToView()` mapper.
- `tickers.ts` — Central data source. Contains curated profiles for 8 tickers (NVDA, SMCI, PLTR, GME, TSLA, COIN, AMD, SOFI) with hardcoded fundamentals, pillars, and posts. Any other ticker gets procedurally generated data via `getTickerProfile()`.
- `series.ts` — Generates candlestick price series, sentiment paths, volume bars, and sparkline SVG paths from a ticker profile. Also contains the "Market Season Branch" blossom/bud logic and `buildInstitutionalMock` (deterministic institutional-ownership fallback).
- `dashboard.ts` — Assembles mock trending table rows (used as fallback when backend is unreachable) and theme data for the home page. Exports `MARKET_STATE` (mock fear/greed, VIX, etc.).
- `composite.ts` — Weighted-average composite score from pillar data.
- `rng.ts` — Seeded LCG (Park-Miller) and FNV-1a hash. Used everywhere to make renders deterministic across server/client.
- `colors.ts` — Shared color palette constants (paper, ink, bullish green, bearish vermilion, blossom pink, etc.).
- `types.ts` — Shared TypeScript interfaces: `TickerProfile`, `Candle`, `Pillar`, `Post`, `TrendingRow`, etc.

### Frontend–Backend Integration

The dashboard page (`app/page.tsx`) is an async server component that fetches trending data, the market season (`MarketSeasonBranch`), and themes (`ThemesColumn`) from the backend at render time via `lib/api.ts`, each falling back to mock (`dashboard.ts` / `MARKET_STATE`) when unreachable. The `/events` and `/earnings` pages fetch their calendars the same way (`fetchEconomicEvents` / `fetchEarnings`), with mock fallback. The `TrendingTable` client component receives initial rows as props and re-fetches from the backend when the user clicks a subreddit filter tab (All, r/wallstreetbets, r/investing, r/daytrading) or changes the sort. The stock detail page (`app/stock/[ticker]/page.tsx`) fetches real candles/fundamentals (`/history`), headlines (`/news`, feeding `WhyThisSentiment`), and institutional ownership (`/institutional`, feeding `InstitutionalOwnership`), each falling back to mock; sentiment and mention-volume charts are always mock.

### Components

Most components are server components receiving pre-computed data as props. Seven components use `"use client"`: `Header` (for `usePathname` active nav + search), `TrendingTable` (for filter tabs and pagination), `ScorecardPillars` (for expand/collapse state), `EarningsBoard` / `EventsBoard` (for `/earnings` and `/events` pagination + date grouping), `HoldingsBoard` (for `/institutions/[slug]` holdings pagination), and `HoldingSearch` (for the "do they hold X?" query on `/institutions/[slug]`). Key visual components:

- `MarketSeasonBranch` — SVG cherry blossom branch where bloom count reflects the fear/greed index
- `CandlestickChart` — SVG candlestick chart with pre-computed geometry
- `PetalMeter` / `BlossomFlower` — Flower-shaped sentiment visualizations
- `ScorecardPillars` — Five-pillar score breakdown with fill-level bars
- `ThemesColumn` — Dashboard "Today's Themes" sidebar (real Finnhub news, falls back to mock)
- `EventsBoard` — Paginated, date-grouped economic-calendar "almanac" for the `/events` page; vermilion/ink/open-ring impact discs (high/medium/low) and a staggered `kabuka-rise` reveal
- `EarningsBoard` — Paginated, date-grouped earnings "almanac" for the `/earnings` page; vermilion/ink session discs (before open / after close), a staggered `kabuka-rise` reveal, and rows linking to the stock detail page
- `WhyThisSentiment` — Stock-detail panel showing real per-ticker headlines from `/news`
- `InstitutionalOwnership` — Stock-detail section: an SVG ownership donut (institutional %) + horizontal top-holder bars, from Yahoo Finance (`/institutional`) with deterministic mock fallback
- `InstitutionsGrid` — `/institutions` directory: a responsive grid of hanko-seal cards (stamped kanji, name, category, 13F portfolio value + quarter) linking to each institution's holdings page
- `HoldingsBoard` — `/institutions/[slug]` holdings almanac: paginated 13F positions, ticker-first (symbol leads, issuer as subtitle; ETFs/unresolved CUSIPs fall back to issuer), green weight-bars (share of portfolio); rows deep-link to `/stock/[ticker]` when the CUSIP resolved to a ticker
- `HoldingSearch` — `/institutions/[slug]` "does this fund hold X?" box: queries the backend across the institution's entire 13F (`searchInstitutionHoldings`), renders a hit (ticker/value/weight/rank, linking to the stock) or a definitive miss; falls back to filtering the loaded top holdings when SEC is offline
- `TrendingSkeleton` — Loading skeleton with ink-fade animation

### Design System

- Fonts: Shippori Mincho (headings/decorative), IBM Plex Sans (body), IBM Plex Mono (data)
- Background: `#F5F0E5` (rice paper), text: `#211C15` (sumi ink)
- Bullish: `#4A7C59` (green), Bearish: `#C3423F` (vermilion)
- `GrainOverlay` adds a subtle paper-grain texture over the viewport
- All colors are in `lib/colors.ts`
- In React inline styles, don't mix CSS shorthand (`border`) with non-shorthand (`borderColor`) — use separate properties (`borderWidth`, `borderStyle`, `borderColor`) to avoid rerender bugs.

### Design Reference

The `project/` directory contains the original HTML prototype (`Kabuka.dc.html`) and `chats/` has the design conversation transcript. These are excluded from linting. When the design intent is unclear, reference these files.
