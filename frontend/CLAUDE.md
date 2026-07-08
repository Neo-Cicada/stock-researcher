# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start Next.js dev server
- `npm run build` — Production build
- `npm run lint` — Run ESLint (flat config, `eslint.config.mjs`)

There are no tests configured.

## Project Overview

**Kabuka (株価)** is a stock research app with a Japanese woodblock-print aesthetic. It uses deterministic mock data (seeded RNG) — there is no backend or real API. The app was implemented from HTML/CSS/JS prototypes exported from Claude Design (see `project/Kabuka.dc.html` and `chats/` for original design intent).

## Tech Stack

- Next.js 16 with App Router, React 19, TypeScript (strict mode)
- Pure inline styles throughout — no CSS framework or utility classes. The only CSS file is `app/globals.css` for resets and keyframe animations.
- Path alias: `@/*` maps to the project root

## Architecture

### Routes (App Router)

- `/` — Dashboard with trending stocks table, market season branch visualization, and themes sidebar
- `/stock/[ticker]` — Stock detail page with candlestick chart, sentiment timeline, mention volume, fundamentals grid, and social posts
- `/stock/[ticker]/scorecard` — Five-petal scorecard showing composite score across 5 weighted pillars (val/grw/qlt/mom/snt)

### Data Layer (`lib/`)

All data is deterministic mock data with no external fetching:

- `tickers.ts` — Central data source. Contains curated profiles for 8 tickers (NVDA, SMCI, PLTR, GME, TSLA, COIN, AMD, SOFI) with hardcoded fundamentals, pillars, and posts. Any other ticker gets procedurally generated data via `getTickerProfile()`.
- `series.ts` — Generates candlestick price series, sentiment paths, volume bars, and sparkline SVG paths from a ticker profile. Also contains the "Market Season Branch" blossom/bud logic.
- `dashboard.ts` — Assembles trending table rows and theme data for the home page. Exports `MARKET_STATE` (mock fear/greed, VIX, etc.).
- `composite.ts` — Weighted-average composite score from pillar data.
- `rng.ts` — Seeded LCG (Park-Miller) and FNV-1a hash. Used everywhere to make renders deterministic across server/client.
- `colors.ts` — Shared color palette constants (paper, ink, bullish green, bearish vermilion, blossom pink, etc.).
- `types.ts` — Shared TypeScript interfaces: `TickerProfile`, `Candle`, `Pillar`, `Post`, `TrendingRow`, etc.

### Components

Most components are server components receiving pre-computed data as props. Three components use `"use client"`: `Header` (for `usePathname`), `TrendingTable` (for loading skeleton state), and `ScorecardPillars` (for expand/collapse state). Key visual components:

- `MarketSeasonBranch` — SVG cherry blossom branch where bloom count reflects the fear/greed index
- `CandlestickChart` — SVG candlestick chart with pre-computed geometry
- `PetalMeter` / `BlossomFlower` — Flower-shaped sentiment visualizations
- `ScorecardPillars` — Five-pillar score breakdown with fill-level bars
- `TrendingSkeleton` — Loading skeleton with ink-fade animation

### Design System

- Fonts: Shippori Mincho (headings/decorative), IBM Plex Sans (body), IBM Plex Mono (data)
- Background: `#F5F0E5` (rice paper), text: `#211C15` (sumi ink)
- Bullish: `#4A7C59` (green), Bearish: `#C3423F` (vermilion)
- `GrainOverlay` adds a subtle paper-grain texture over the viewport
- All colors are in `lib/colors.ts`

### Design Reference

The `project/` directory contains the original HTML prototype (`Kabuka.dc.html`) and `chats/` has the design conversation transcript. These are excluded from linting. When the design intent is unclear, reference these files.
