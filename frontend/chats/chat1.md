# Kabuka: Japanese stock research design

_Started 2026-07-08 05:57 UTC_

---

## User

Design "Kabuka" — a stock research web app with a Japanese woodblock-print / sakura
aesthetic. Conceptual anchor: candlestick charts were invented by 18th-century
Japanese rice traders, so this design returns market data to its visual homeland.
It must NOT look like a typical dark SaaS dashboard or an AI-generated app.

HARD BANS (things that make it look generic):
- No Inter or default system fonts, no rounded-xl floating cards with drop shadows,
  no glassmorphism, no purple/blue gradients, no near-black background with a
  single neon accent, no centered hero layouts.

AESTHETIC DIRECTION
- Background: warm washi-paper off-white with a subtle paper-grain texture, like
  an unrolled scroll. (Optional alt theme: deep sumi-ink charcoal, but paper is primary.)
- Ink: near-black sumi ink for text, borders, and chart linework — hairline
  brush-stroke dividers, not CSS gray borders.
- Semantic colors, botanical not neon: bullish = matcha/moss green (~#4A7C59 range),
  bearish = vermilion/persimmon red (~#C3423F range). These appear ONLY as blossom
  petals, candles, and gain/loss numbers — never as decorative fills.
- One tiny supporting accent: pale blossom-pink, used extremely sparingly.
- Typography: a high-contrast serif with calligraphic character for display
  (e.g. Shippori Mincho or Zen Old Mincho feel), a quiet humanist body face, and
  tabular monospaced figures for all numeric data. Occasional vertical text labels
  on section edges, like a hanging scroll.
- Layout: asymmetric, generous negative space (ma) around a dense data core —
  the data tables themselves stay tight and terminal-dense, but they sit on the
  page like a print composition, off-axis, not a centered grid of cards.
- Badges/labels: red hanko seal-stamp style for key markers (e.g. "TRENDING").

SIGNATURE ELEMENT (the one memorable thing — spend the boldness here):
The Market Season Branch. At the top of the dashboard, a single hand-drawn ink
branch spanning the width. Its state IS the market sentiment gauge: bare branch =
extreme fear, budding = neutral, full bloom = extreme greed. Petals are green in
bullish markets, red in bearish ones. One or two petals drift down slowly as
ambient motion — subtle, respects reduced-motion. Numeric components (VIX,
put/call, breadth, social aggregate) sit in a small ink-lined table beside it.

SCREEN 1 — DASHBOARD
- The Market Season Branch (above)
- Trending tickers table: ticker, price, day %, mentions, mention velocity,
  sentiment shown as a small 5-petal glyph (petals filled green or red by score),
  7-day sentiment sparkline drawn as a thin ink brushstroke
- "Today's Themes" column styled as short scroll fragments with a hanko stamp,
  each with a 2-line summary and ticker chips

SCREEN 2 — STOCK DETAIL (e.g. NVDA)
- Header: ticker in large calligraphic serif, price, day change, composite
  sentiment shown as a single branch sprig glyph
- Candlestick price chart in green/red with a sentiment timeline beneath it,
  sharing the x-axis, and mention-volume bars under that — visually correlate
  sentiment spikes with price moves
- Right rail: "Why this sentiment" — representative Reddit/StockTwits posts, each
  with its own petal-glyph sentiment label
- Fundamentals snapshot as an ink-ruled stat grid (P/E, PEG, growth, margins, ROE)

SCREEN 3 — SCORECARD
- Five pillars (Valuation, Growth, Quality, Momentum, Sentiment) each rendered as
  a blossom with 0–100 fill; expandable to show exact inputs. Composite score at
  top with visible weights. Microcopy: "Research, not investment advice."

STATES: skeleton loading (ink strokes fading in), and an "insufficient data"
state as a bare twig with the line "Too quiet to read" — this state shows often,
make it beautiful.

Density note: the aesthetic is airy, but the DATA is dense — small type, tight
rows, tabular numbers. Poetry in the frame, terminal in the table.

## Assistant

_[tool: list_files]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: set_project_title]_

_[tool: update_todos]_

_[tool: dc_write]_

_[tool: update_todos]_

_[tool: ready_for_verification]_

Done. The design is live — try the fear/greed slider in Tweaks to watch the branch go from bare to full bloom, and flip direction to bearish to see the petals turn vermilion.

## User

Found issues — fixing…

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: ready_for_verification]_

Both fixed: pillar cards now expand via a shared click handler keyed off `data-pillar`, and the blossom fill is a single ink rect clipped to the petal shape, so the 0–100 fill rises bottom-up and Valuation 38 vs Growth 92 read clearly different.

