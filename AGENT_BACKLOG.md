# Agent Backlog

Tasks for the autonomous agent (`uv run python -m agent --autonomous`). It works
the top **unchecked** item first. Keep each item **small and independently
verifiable** — one item = one plan→execute→verify→commit cycle.

- `- [ ]` — todo (the agent will pick these up top-to-bottom)
- `- [x]` — done

Edit freely: add, reorder, or remove items. You can also skip the backlog and
just give a goal: `--autonomous --goal "..."`.

## Todo

### Feature: Market Season gauge (real data)

- [ ] **Backend** — Add a market-sentiment fetcher + endpoint for the Market Season gauge. Fetch the CNN Fear & Greed Index from `https://production.dataviz.cnn.com/index/fearandgreed/graphdata` (free, no key; send a browser `User-Agent` header or it 403s). Parse the overall `fear_and_greed` score (the `68 /100` "SEASON GAUGE" + `greed` rating) and the sub-indicators `market_volatility` (VIX), `put_call_options` (Put/Call), and `market_breadth` (Breadth adv %). Also compute a "Social aggregate" bullish % from the ApeWisdom sentiment already ingested in `trending_snapshots`. Store one latest-row via a `MarketSeason` model + Alembic migration, refresh from a background task (hourly is plenty), and expose `GET /api/market/season` (Pydantic `MarketSeasonOut`). Return the last-stored value if the upstream call fails.
- [ ] **Frontend** — Wire the dashboard "The Market Season" gauge to `GET /api/market/season` (add a client fn in `lib/api.ts`). Render the season label (`花盛り Bloom` + mood word), the `68 /100` gauge, and the four metrics (VIX `14.2 −0.8`, Put/Call `0.62`, Breadth `71%`, Social aggregate `62 bullish`). Fall back to the mock `MARKET_STATE` from `lib/dashboard.ts` when the endpoint is unavailable. Map the 0–100 score to the woodblock season labels.

### Feature: Today's Themes (real news)

- [ ] **Backend** — Add a Finnhub news fetcher + endpoint for "Today's Themes". Call Finnhub `GET /api/v1/news?category=general` (free tier, 60 req/min) using a `FINNHUB_API_KEY` env var (add to `app/config.py` + `.env.example`). Cluster/summarize recent headlines into a handful of themes, cache in-process (or a small table), and expose `GET /api/market/themes` (Pydantic `ThemeOut`). Return an empty/cached list on failure so the frontend can fall back.
- [ ] **Frontend** — Wire the dashboard "Today's Themes" section to `GET /api/market/themes` (client fn in `lib/api.ts`), rendering each theme with its headline/source link. Fall back to the existing mock themes from `lib/dashboard.ts` when unavailable.

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
