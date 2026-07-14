# Agent Backlog

Tasks for the autonomous agent (`uv run python -m agent --autonomous`). It works
the top **unchecked** item first. Keep each item **small and independently
verifiable** — one item = one plan→execute→verify→commit cycle.

- `- [ ]` — todo (the agent will pick these up top-to-bottom)
- `- [x]` — done

Edit freely: add, reorder, or remove items. You can also skip the backlog and
just give a goal: `--autonomous --goal "..."`.

## Todo

### Feature: Today's Themes (real news)

> Note: the autonomous agent attempted the backend task and it **failed its lint
> gate + got hard-reverted**, then the run hit the $10 budget. The
> `FINNHUB_API_KEY` field has since been added to `app/config.py` manually
> (backend was crashing on the `.env` key with `extra_forbidden`), so the
> backend task below should **not re-add that field** — just add it to
> `.env.example`. Both tasks still need doing, and must be **verified against the
> live Finnhub API**, not just linted.

- [ ] **Backend** — Add a Finnhub news fetcher + endpoint for "Today's Themes". Call Finnhub `GET /api/v1/news?category=general` (free tier, 60 req/min) using the existing `FINNHUB_API_KEY` setting (already in `app/config.py`; add it to `.env.example`). Cluster/summarize recent headlines into a handful of themes, cache in-process (or a small table), and expose `GET /api/market/themes` (Pydantic `ThemeOut`). Return an empty/cached list on failure so the frontend can fall back.
- [ ] **Frontend** — Wire the dashboard "Today's Themes" section to `GET /api/market/themes` (client fn in `lib/api.ts`), rendering each theme with its headline/source link. Fall back to the existing mock themes from `lib/dashboard.ts` when unavailable.

### Verification (do after the endpoints exist — the agent only lints)

- [ ] Start the backend and confirm `GET /api/market/season` returns live CNN Fear & Greed data (real gauge score + VIX/Put-Call/Breadth), not the last-stored fallback.
- [ ] Confirm `GET /api/market/themes` returns real Finnhub headlines with the key loaded.

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
