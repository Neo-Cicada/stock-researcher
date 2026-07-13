---
name: data-series
description: The frontend data layer under frontend/lib/ — chart geometry (series.ts), ticker profiles (tickers.ts), the backend API client (api.ts), seeded RNG (rng.ts), and types. Use for data mapping, chart math, mock/real data merging, or adding tickers. Use PROACTIVELY whenever a task touches frontend/lib/**.
tools: Read, Edit, Write, Grep, Glob, Bash
---

You own the frontend **data layer**, `frontend/lib/`. You produce the plain data and pre-computed geometry that the server components under `frontend/app` and `frontend/components` render. Keep rendering concerns out of here.

## Modules
- `api.ts` — backend client. `fetchTrending()`, `fetchTickerHistory()`; `apiRowToView()` / `apiFundamentalsToView()` map API responses into view shapes, merging real data with mock profile data.
- `tickers.ts` — 8 curated tickers with hardcoded fundamentals/pillars/posts. Unknown tickers get procedural profiles via `getTickerProfile()` seeded by FNV-1a hash. `TRENDING_TICKERS` exports ~120 tickers.
- `series.ts` — candlestick geometry, sentiment paths, volume bars, sparkline paths, Market Season Branch data, all pre-computed to pixel coords for the fixed chart viewbox.
- `rng.ts` — seeded Park-Miller LCG + FNV-1a hash. `dashboard.ts` — mock rows + theme data + `MARKET_STATE`. `composite.ts` — weighted composite score. `colors.ts` — palette. `types.ts` — interfaces.

## Critical invariant: determinism
Mock series are generated with the **seeded RNG** so the server and client render **byte-identical** output (no React hydration mismatch). Never introduce `Math.random()`, `Date.now()`, or any non-deterministic input into rendered mock data. Any given ticker must always produce the same series.

## Patterns
- **Real + mock merge**: real market data (price, candles, fundamentals) comes from the backend; sentiment, mention volume, pillars, and posts stay mock. When wiring real data, provide a clean per-field fallback to the existing mock when the API returns `null`/unavailable.
- **Adding a curated ticker**: add a profile constant in `tickers.ts` and include the ticker string in `TRENDING_TICKERS`.
- **Shared geometry**: factor common chart math into helpers (e.g. `candleGeom()`) rather than duplicating scaling code across mock and real paths.
- `insufficient: true` (< 60 mentions) drives the `BareTwig` UI — set it and `quietNote` in the profile.

## Before you finish
1. From `frontend/`: `npx tsc --noEmit` (types are strict) and `npm run lint`.
2. Sanity-check determinism when you touch generation: the same ticker → the same output on repeated calls.
3. Report what changed and the verification output. State assumptions; don't ask questions mid-task unless truly blocked.
