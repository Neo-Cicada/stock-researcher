# Agent Backlog

Tasks for the autonomous agent (`uv run python -m agent --autonomous`). It works
the top **unchecked** item first. Keep each item **small and independently
verifiable** — one item = one plan→execute→verify→commit cycle.

- `- [ ]` — todo (the agent will pick these up top-to-bottom)
- `- [x]` — done

Edit freely: add, reorder, or remove items. You can also skip the backlog and
just give a goal: `--autonomous --goal "..."`.

## Todo

### Live verification (must be run where there IS internet — my sandbox has none)

Both features are code-complete, lint-clean, type-checked, and pass the
production build + unit tests, but the *live data path* was never exercised
because this environment has no outbound network. Run these against a real
backend (Postgres up, `FINNHUB_API_KEY` in `backend/.env`):

- [ ] `GET /api/market/season` returns live CNN Fear & Greed data (real gauge score + VIX/Put-Call/Breadth `available: true`), not the fallback. If it 403s, the CNN `User-Agent` header is the thing to check.
- [ ] `GET /api/market/themes` returns real Finnhub headlines (non-empty array with `title`/`source`/`url`).
- [ ] Load the dashboard (`/`) and confirm the Market Season gauge and Today's Themes sidebar show live values, not the mock fallback.

<!-- "Why this sentiment" (per-stock social posts) stays on mock data — dropped
     the Reddit-API tasks since Reddit is the only free source for real
     per-ticker posts and we're avoiding that dependency. -->


## Done

<!-- The agent does not check these off automatically; move items here yourself
     after reviewing the commits it produced. -->

- [x] Add a `type="button"` attribute to the refresh button in `frontend/components/TrendingTable.tsx` (done in commit 7c7727c).
- [x] Add a `GET /api/stocks/{ticker}/history` response example to the README API table with a sample JSON payload (commit d13b9f1).
- [x] Add a backend pytest that calls the `_fetch_ticker_detail` NaN/empty-history guards with a fake ticker and asserts it returns `None` (commit c01caa4).
- [x] Show the real company `name` from the history endpoint in the stock detail header (commit cbf65f1).
- [x] Add a small loading/`aria-busy` state to the trending refresh button so screen readers announce the refresh (commit fa443e6).
- [x] Market Season gauge — **Backend**: `MarketSeason` model + migration, CNN Fear & Greed fetcher, hourly refresh task, `GET /api/market/season` (commit 4bba4d3). *(Committed + lint-clean; not yet verified against live CNN data.)*
- [x] Market Season gauge — **Frontend**: `fetchMarketSeason()` + dashboard gauge wired with mock fallback (commit df56901). *(Committed + lint-clean; not yet verified in the running app.)*
- [x] Today's Themes — **Backend**: `finnhub_fetcher` service (general news → themes, in-process TTL cache), `ThemeOut` schema, `GET /api/market/themes`, `.env.example` entry, unit tests. *(Lint + tests + import all pass; live Finnhub call not exercised — no network in build env.)*
- [x] Today's Themes — **Frontend**: `fetchThemes()`/`apiThemeToView` in `lib/api.ts`, dashboard wired with mock fallback, `ThemesColumn` source link. *(tsc + eslint + production build all pass.)*
