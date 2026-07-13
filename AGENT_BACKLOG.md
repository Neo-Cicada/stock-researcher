# Agent Backlog

Tasks for the autonomous agent (`uv run python -m agent --autonomous`). It works
the top **unchecked** item first. Keep each item **small and independently
verifiable** — one item = one plan→execute→verify→commit cycle.

- `- [ ]` — todo (the agent will pick these up top-to-bottom)
- `- [x]` — done

Edit freely: add, reorder, or remove items. You can also skip the backlog and
just give a goal: `--autonomous --goal "..."`.

## Todo

<!-- (empty) -->

## Done

<!-- The agent does not check these off automatically; move items here yourself
     after reviewing the commits it produced. -->

- [x] Add a `type="button"` attribute to the refresh button in `frontend/components/TrendingTable.tsx` (done in commit 7c7727c).
- [x] Add a `GET /api/stocks/{ticker}/history` response example to the README API table with a sample JSON payload (commit d13b9f1).
- [x] Add a backend pytest that calls the `_fetch_ticker_detail` NaN/empty-history guards with a fake ticker and asserts it returns `None` (commit c01caa4).
- [x] Show the real company `name` from the history endpoint in the stock detail header (commit cbf65f1).
- [x] Add a small loading/`aria-busy` state to the trending refresh button so screen readers announce the refresh (commit fa443e6).
