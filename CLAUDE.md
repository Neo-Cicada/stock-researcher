# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands must be run from the `frontend/` directory:

```bash
cd frontend
npm run dev      # Start Next.js dev server
npm run build    # Production build
npm run lint     # ESLint (flat config, eslint.config.mjs)
```

No tests are configured. No environment variables are needed.

## Project Overview

**Kabuka (株価)** is a stock research app with a Japanese woodblock-print aesthetic. It uses deterministic mock data (seeded RNG) — no backend, no API, no database. The app was implemented from an HTML/CSS/JS prototype exported from Claude Design (see `frontend/project/Kabuka.dc.html` and `frontend/chats/` for original design intent).

## Tech Stack

- Next.js 16 with App Router, React 19, TypeScript (strict mode)
- Pure inline styles — no CSS framework. `app/globals.css` has only resets and keyframe animations.
- All charts are pure SVG with pixel geometry pre-computed in `lib/series.ts` — no charting library.
- Path alias: `@/*` maps to `frontend/` root

## Architecture

### Routes

- `/` — Dashboard: trending stocks table, market season branch, themes sidebar
- `/stock/[ticker]` — Stock detail: candlestick chart, sentiment timeline, mention volume, fundamentals, social posts
- `/stock/[ticker]/scorecard` — Five-petal scorecard with 5 weighted pillars (val/grw/qlt/mom/snt)

### Server vs Client Components

Most components are **server components** — they receive pre-computed data as props and render inline-styled SVG/HTML. Only three components use `"use client"`:

- `Header.tsx` — needs `usePathname()` for active nav highlighting
- `TrendingTable.tsx` — uses `useState`/`useEffect` for simulated loading skeleton
- `ScorecardPillars.tsx` — uses `useState` for pillar card expand/collapse

### Data Layer (`lib/`)

All data is deterministic mock data:

- **`tickers.ts`** — Central data source. 8 curated tickers (NVDA, SMCI, PLTR, GME, TSLA, COIN, AMD, SOFI) with hardcoded fundamentals, pillars, and posts. Unknown tickers get procedurally generated profiles via `getTickerProfile()` using FNV-1a hash as seed. `TRENDING_TICKERS` array controls the dashboard ticker list.
- **`series.ts`** — Generates candlestick series (42 candles), sentiment paths, volume bars, sparkline SVG paths, and Market Season Branch blossom/bud data from a ticker profile.
- **`rng.ts`** — Seeded Park-Miller LCG + FNV-1a hash. Ensures identical renders across server and client.
- **`dashboard.ts`** — Assembles trending table rows and theme data. Exports `MARKET_STATE`.
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
- **BareTwig pattern**: When a ticker has `insufficient: true`, render `BareTwig` component instead of charts. The `quietNote` field provides the reason text.
- **Design reference**: When intent is unclear, consult `frontend/project/Kabuka.dc.html` (original prototype) and `frontend/chats/chat1.md` (design conversation). These are excluded from linting.
