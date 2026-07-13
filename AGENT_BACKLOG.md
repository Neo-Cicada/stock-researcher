# Agent Backlog

Tasks for the autonomous agent (`uv run python -m agent --autonomous`). It works
the top **unchecked** item first. Keep each item **small and independently
verifiable** — one item = one plan→execute→verify→commit cycle.

- `- [ ]` — todo (the agent will pick these up top-to-bottom)
- `- [x]` — done

Edit freely: add, reorder, or remove items. You can also skip the backlog and
just give a goal: `--autonomous --goal "..."`.

## Todo

- [ ] Add a `type="button"` attribute to the refresh button in `frontend/components/TrendingTable.tsx` (it's a bare `<button>`).
- [ ] Add a `GET /api/stocks/{ticker}/history` response example to the README API table with a sample JSON payload.
- [ ] Add a backend pytest that calls the `_fetch_ticker_detail` NaN/empty-history guards with a fake ticker and asserts it returns `None`.
- [ ] Show the real company `name` from the history endpoint in the stock detail header (currently the header uses the mock profile name even when live data is available).
- [ ] Add a small loading/`aria-busy` state to the trending refresh button so screen readers announce the refresh.

## Done

<!-- The agent does not check these off automatically; move items here yourself
     after reviewing the commits it produced. -->
