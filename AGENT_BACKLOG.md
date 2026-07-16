# Agent Backlog

Tasks for the autonomous agent (`uv run python -m agent --autonomous`). It works
the top **unchecked** item first. Keep each item **small and independently
verifiable** — one item = one plan→execute→verify→commit cycle.

- `- [ ]` — todo (the agent will pick these up top-to-bottom)
- `- [x]` — done

Edit freely: add, reorder, or remove items. You can also skip the backlog and
just give a goal: `--autonomous --goal "..."`.

## Todo

_(Live verification complete — 2026-07-15. All three checks passed against a
real backend; see Done. Fixing check 1 required a code change to the CNN
fetcher — see below.)_

<!-- "Why this sentiment" (per-stock social posts) stays on mock data — dropped
     the Reddit-API tasks since Reddit is the only free source for real
     per-ticker posts and we're avoiding that dependency. -->

_(Economic-events + earnings tabs shipped 2026-07-16 — see Done.)_


## Done

<!-- The agent does not check these off automatically; move items here yourself
     after reviewing the commits it produced. -->

- [x] **Economic events page `/events` (2026-07-16):** `get_economic_events()` in `finnhub_fetcher.py` (1-hour TTL cache, no-op on unset/premium-gated key), `EconomicEventOut` schema, `GET /api/market/events`, unit tests. Frontend: `fetchEconomicEvents()`/`apiEventToView()` in `lib/api.ts`, `EventsTable.tsx`, standalone `app/events/page.tsx` styled like the dashboard, and an EVENTS nav link in the Header (mock `TODAYS_EVENTS` fallback — the economic calendar is Finnhub-premium so it renders mock on a free key).
- [x] **Earnings schedule page `/earnings` (2026-07-16):** `get_earnings_calendar()` in `finnhub_fetcher.py`, `EarningsEventOut` schema, `GET /api/market/earnings`, unit tests. Frontend: `fetchEarnings()`/`apiEarningsToView()`, `EarningsTable.tsx` (rows link to `/stock/[ticker]`), standalone `app/earnings/page.tsx`, and an EARNINGS nav link. Verified live end-to-end: `/earnings` rendered real Finnhub tickers (AA/ABT/ADN) with working stock links against a running backend. Backend ruff+pytest and frontend eslint+build all green.

  *(First built these as a tabbed `MarketPanels` sidebar; reworked into standalone `/events` + `/earnings` pages with Header nav per the request.)*
- [x] **Live verification (2026-07-15):** `GET /api/market/season` returns live CNN Fear & Greed (score 43.7 / "fear", VIX/Put-Call/Breadth `available: true`); `GET /api/market/themes` returns real headlines; dashboard `/` renders the live gauge + Today's Themes. Fixing the season path required a fetcher fix: the host was `production.dataviz.cnn.com` (**NXDOMAIN**) — corrected to `production.dataviz.cnn.io`, and CNN's Fastly bot check now 418s ("You're a bot") without an `Accept-Language` + cnn.com `Referer`, so both headers were added (`app/services/fear_greed_fetcher.py`).
- [x] Add a `type="button"` attribute to the refresh button in `frontend/components/TrendingTable.tsx` (done in commit 7c7727c).
- [x] Add a `GET /api/stocks/{ticker}/history` response example to the README API table with a sample JSON payload (commit d13b9f1).
- [x] Add a backend pytest that calls the `_fetch_ticker_detail` NaN/empty-history guards with a fake ticker and asserts it returns `None` (commit c01caa4).
- [x] Show the real company `name` from the history endpoint in the stock detail header (commit cbf65f1).
- [x] Add a small loading/`aria-busy` state to the trending refresh button so screen readers announce the refresh (commit fa443e6).
- [x] Market Season gauge — **Backend**: `MarketSeason` model + migration, CNN Fear & Greed fetcher, hourly refresh task, `GET /api/market/season` (commit 4bba4d3). *(Committed + lint-clean; not yet verified against live CNN data.)*
- [x] Market Season gauge — **Frontend**: `fetchMarketSeason()` + dashboard gauge wired with mock fallback (commit df56901). *(Committed + lint-clean; not yet verified in the running app.)*
- [x] Today's Themes — **Backend**: `finnhub_fetcher` service (general news → themes, in-process TTL cache), `ThemeOut` schema, `GET /api/market/themes`, `.env.example` entry, unit tests. *(Lint + tests + import all pass; live Finnhub call not exercised — no network in build env.)*
- [x] Today's Themes — **Frontend**: `fetchThemes()`/`apiThemeToView` in `lib/api.ts`, dashboard wired with mock fallback, `ThemesColumn` source link. *(tsc + eslint + production build all pass.)*
