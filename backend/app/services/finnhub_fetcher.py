import logging
import time
from datetime import date, timedelta

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

FINNHUB_NEWS_URL = "https://finnhub.io/api/v1/news"
FINNHUB_COMPANY_NEWS_URL = "https://finnhub.io/api/v1/company-news"
FINNHUB_ECONOMIC_CALENDAR_URL = "https://finnhub.io/api/v1/calendar/economic"
FINNHUB_EARNINGS_CALENDAR_URL = "https://finnhub.io/api/v1/calendar/earnings"
FINNHUB_SEARCH_URL = "https://finnhub.io/api/v1/search"
FINNHUB_PROFILE_URL = "https://finnhub.io/api/v1/stock/profile2"

# In-process TTL cache (mirrors price_fetcher._detail_cache): Finnhub's free tier
# is 60 req/min, and general market news barely changes minute to minute.
_CACHE_TTL_SECONDS = 600  # 10 minutes
_themes_cache: dict = {"data": None, "ts": 0.0}

# Per-ticker company-news cache: {ticker: {"data": [...], "ts": float}}.
_company_news_cache: dict[str, dict] = {}

# Per-query symbol-search cache: {query: {"data": [...], "ts": float}}.
_search_cache: dict[str, dict] = {}

# Per-ticker company-profile-name cache: {ticker: {"data": str, "ts": float}}.
_profile_cache: dict[str, dict] = {}

# Calendars change at most a few times a day, so a longer TTL is fine.
_CALENDAR_TTL_SECONDS = 3600  # 1 hour
_economic_cache: dict = {"data": None, "ts": 0.0}
_earnings_cache: dict = {"data": None, "ts": 0.0}

MAX_THEMES = 5
MAX_COMPANY_NEWS = 8
# How far back to ask Finnhub for company headlines.
COMPANY_NEWS_LOOKBACK_DAYS = 14
# How far ahead to look on the calendars.
ECONOMIC_LOOKAHEAD_DAYS = 14
EARNINGS_LOOKAHEAD_DAYS = 7
# Also include yesterday on the earnings calendar: a report scheduled "after
# market close" in US time is still current/relevant to a US user when the
# server clock (typically UTC) has already rolled to the next calendar day.
EARNINGS_LOOKBACK_DAYS = 1
MAX_ECONOMIC_EVENTS = 20
MAX_EARNINGS_EVENTS = 30
MAX_SEARCH_RESULTS = 8


async def _fetch_general_news() -> list[dict] | None:
    """Fetch Finnhub general market news, or ``None`` on any failure.

    Returns ``None`` (rather than raising) when the key is missing or the
    request fails, so the caller can fall back to the last cached list.
    """
    api_key = settings.FINNHUB_API_KEY
    if not api_key:
        logger.warning("FINNHUB_API_KEY not set; skipping Finnhub news fetch")
        return None
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                FINNHUB_NEWS_URL,
                params={"category": "general", "token": api_key},
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        logger.exception("Finnhub news fetch failed")
        return None

    if not isinstance(data, list):
        return None
    return data


def _to_theme(article: dict) -> dict | None:
    """Map a Finnhub news article into a theme dict, or ``None`` if unusable."""
    headline = (article.get("headline") or "").strip()
    if not headline:
        return None
    related = article.get("related") or ""
    tickers = [t.strip() for t in related.split(",") if t.strip()][:4]
    return {
        "title": headline,
        "summary": (article.get("summary") or "").strip(),
        "source": article.get("source") or "",
        "url": article.get("url") or "",
        "tickers": tickers,
        "published_at": article.get("datetime"),
    }


async def get_todays_themes() -> list[dict]:
    """Return a handful of current market themes from Finnhub general news.

    Deduplicates by headline and surfaces ticker-tagged stories first (more
    relevant to a stock-research app). Cached in-process for
    ``_CACHE_TTL_SECONDS``; on an upstream failure the last good list is served
    (empty list if we never fetched successfully) so the frontend can fall back.
    """
    now = time.time()
    cached = _themes_cache["data"]
    if cached is not None and now - _themes_cache["ts"] < _CACHE_TTL_SECONDS:
        return cached

    articles = await _fetch_general_news()
    if articles is None:
        return cached or []

    themes: list[dict] = []
    seen: set[str] = set()
    for article in articles:
        theme = _to_theme(article)
        if theme is None:
            continue
        key = theme["title"].lower()
        if key in seen:
            continue
        seen.add(key)
        themes.append(theme)

    # Ticker-tagged themes first (stable), then truncate to a handful.
    themes.sort(key=lambda t: 0 if t["tickers"] else 1)
    themes = themes[:MAX_THEMES]

    _themes_cache["data"] = themes
    _themes_cache["ts"] = now
    return themes


async def _fetch_company_news(ticker: str) -> list[dict] | None:
    """Fetch Finnhub company news for a single ticker, or ``None`` on failure.

    Returns ``None`` (rather than raising) when the key is missing or the
    request fails, so the caller can fall back to the last cached list.
    """
    api_key = settings.FINNHUB_API_KEY
    if not api_key:
        logger.warning("FINNHUB_API_KEY not set; skipping Finnhub company-news fetch")
        return None
    to = date.today()
    frm = to - timedelta(days=COMPANY_NEWS_LOOKBACK_DAYS)
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                FINNHUB_COMPANY_NEWS_URL,
                params={
                    "symbol": ticker.upper(),
                    "from": frm.isoformat(),
                    "to": to.isoformat(),
                    "token": api_key,
                },
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        logger.exception("Finnhub company-news fetch failed for %s", ticker)
        return None

    if not isinstance(data, list):
        return None
    return data


def _to_news_item(article: dict) -> dict | None:
    """Map a Finnhub company-news article into a news item, or ``None``."""
    headline = (article.get("headline") or "").strip()
    url = (article.get("url") or "").strip()
    if not headline or not url:
        return None
    return {
        "title": headline,
        "summary": (article.get("summary") or "").strip(),
        "source": article.get("source") or "",
        "url": url,
        "published_at": article.get("datetime"),
    }


# Company-name words this short or this generic don't signal relevance.
_NAME_STOPWORDS = {
    "inc",
    "inc.",
    "corp",
    "corp.",
    "corporation",
    "company",
    "co",
    "co.",
    "ltd",
    "the",
    "group",
    "holdings",
    "plc",
    "&",
}


def _relevance_terms(ticker: str, name: str | None) -> set[str]:
    """Lowercase terms that mark a headline as genuinely about this company."""
    terms = {ticker.lower()}
    for word in (name or "").split():
        w = word.strip(".,").lower()
        if len(w) >= 3 and w not in _NAME_STOPWORDS:
            terms.add(w)
    return terms


def _relevance(item: dict, terms: set[str]) -> int:
    """1 if the headline/summary mentions the ticker or a company-name word."""
    text = f"{item['title']} {item['summary']}".lower()
    return 1 if any(t in text for t in terms) else 0


async def get_ticker_news(ticker: str, name: str | None = None) -> list[dict]:
    """Return recent headlines for a single ticker from Finnhub company news.

    Finnhub's ``symbol`` filter is loose — it tags many general-market stories
    to a ticker — so results are re-ranked to surface headlines that actually
    name the company (by ticker symbol or a company-name word) first, then by
    recency. Deduplicated by headline. Cached per-ticker in-process for
    ``_CACHE_TTL_SECONDS``; on an upstream failure the last good list is served
    (empty list if we never fetched successfully) so the frontend can fall back.
    """
    key = ticker.upper()
    now = time.time()
    entry = _company_news_cache.get(key)
    if entry is not None and now - entry["ts"] < _CACHE_TTL_SECONDS:
        return entry["data"]

    articles = await _fetch_company_news(key)
    if articles is None:
        return entry["data"] if entry is not None else []

    items: list[dict] = []
    seen: set[str] = set()
    for article in articles:
        item = _to_news_item(article)
        if item is None:
            continue
        dedup = item["title"].lower()
        if dedup in seen:
            continue
        seen.add(dedup)
        items.append(item)

    # Rank: on-topic (names the company) first, then newest first. Sort is
    # stable, so ties fall back to Finnhub's own ordering.
    terms = _relevance_terms(key, name)
    items.sort(
        key=lambda it: (_relevance(it, terms), it.get("published_at") or 0),
        reverse=True,
    )
    items = items[:MAX_COMPANY_NEWS]

    _company_news_cache[key] = {"data": items, "ts": now}
    return items


async def _fetch_calendar(url: str, params: dict) -> dict | None:
    """GET a Finnhub calendar endpoint, or ``None`` on any failure.

    Returns ``None`` (rather than raising) when the key is missing or the
    request fails — including when the free tier 403s on a premium calendar —
    so the caller can fall back to the last cached list.
    """
    api_key = settings.FINNHUB_API_KEY
    if not api_key:
        logger.warning("FINNHUB_API_KEY not set; skipping Finnhub calendar fetch")
        return None
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url, params={**params, "token": api_key})
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        logger.exception("Finnhub calendar fetch failed (%s)", url)
        return None

    if not isinstance(data, dict):
        return None
    return data


def _as_float(value) -> float | None:
    """Coerce a Finnhub numeric field to float, or ``None`` if missing/blank."""
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _to_economic_event(row: dict) -> dict | None:
    """Map a Finnhub economic-calendar row into an event dict, or ``None``."""
    event = (row.get("event") or "").strip()
    if not event:
        return None
    return {
        "event": event,
        "country": (row.get("country") or "").strip(),
        "time": (row.get("time") or "").strip(),
        "impact": (row.get("impact") or "").strip(),
        "actual": _as_float(row.get("actual")),
        "estimate": _as_float(row.get("estimate")),
        "previous": _as_float(row.get("prev")),
        "unit": (row.get("unit") or "").strip(),
    }


async def get_economic_events() -> list[dict]:
    """Return upcoming economic-calendar events (CPI, FOMC, jobs, …) from Finnhub.

    Covers today through ``ECONOMIC_LOOKAHEAD_DAYS`` ahead, ordered by time.
    Cached in-process for ``_CALENDAR_TTL_SECONDS``; on an upstream failure the
    last good list is served (empty list if we never fetched successfully) so
    the frontend can fall back to mock. Note the economic calendar is a Finnhub
    premium endpoint — on a free key the request 403s and this returns ``[]``.
    """
    now = time.time()
    cached = _economic_cache["data"]
    if cached is not None and now - _economic_cache["ts"] < _CALENDAR_TTL_SECONDS:
        return cached

    frm = date.today()
    to = frm + timedelta(days=ECONOMIC_LOOKAHEAD_DAYS)
    data = await _fetch_calendar(
        FINNHUB_ECONOMIC_CALENDAR_URL,
        {"from": frm.isoformat(), "to": to.isoformat()},
    )
    if data is None:
        return cached or []

    rows = data.get("economicCalendar") or []
    events: list[dict] = []
    for row in rows:
        event = _to_economic_event(row)
        if event is not None:
            events.append(event)

    events.sort(key=lambda e: e["time"])
    events = events[:MAX_ECONOMIC_EVENTS]

    _economic_cache["data"] = events
    _economic_cache["ts"] = now
    return events


def _to_earnings_event(row: dict) -> dict | None:
    """Map a Finnhub earnings-calendar row into an event dict, or ``None``."""
    symbol = (row.get("symbol") or "").strip().upper()
    if not symbol:
        return None
    return {
        "symbol": symbol,
        "date": (row.get("date") or "").strip(),
        # amc (after market close) / bmo (before market open) / dmh (during).
        "hour": (row.get("hour") or "").strip(),
        "eps_estimate": _as_float(row.get("epsEstimate")),
        "eps_actual": _as_float(row.get("epsActual")),
        "revenue_estimate": _as_float(row.get("revenueEstimate")),
        "revenue_actual": _as_float(row.get("revenueActual")),
    }


def _earnings_relevance(event: dict) -> tuple:
    """Descending-sort key that surfaces well-covered, larger companies first.

    A single week's earnings calendar carries hundreds of reports, the vast
    majority tiny names with no analyst coverage. Events that carry an EPS or
    revenue estimate rank above those that don't, then by revenue-estimate size
    — a company-size proxy that needs no hardcoded ticker allowlist, so a
    household name like NFLX clears the ``MAX_EARNINGS_EVENTS`` cut instead of
    being truncated away by a naive date sort.
    """
    rev = event.get("revenue_estimate") or 0.0
    eps = event.get("eps_estimate")
    has_estimate = rev > 0 or eps is not None
    return (1 if has_estimate else 0, rev, abs(eps) if eps is not None else 0.0)


async def get_earnings_calendar() -> list[dict]:
    """Return upcoming earnings reports from Finnhub's earnings calendar.

    Covers yesterday (see ``EARNINGS_LOOKBACK_DAYS``) through
    ``EARNINGS_LOOKAHEAD_DAYS`` ahead. The window is ranked by relevance and
    capped at ``MAX_EARNINGS_EVENTS``, then the kept slice is ordered by date
    for the almanac. Cached in-process for ``_CALENDAR_TTL_SECONDS``; on an
    upstream failure the last good list is served (empty list if we never
    fetched successfully) so the frontend can fall back to mock.
    """
    now = time.time()
    cached = _earnings_cache["data"]
    if cached is not None and now - _earnings_cache["ts"] < _CALENDAR_TTL_SECONDS:
        return cached

    frm = date.today() - timedelta(days=EARNINGS_LOOKBACK_DAYS)
    to = date.today() + timedelta(days=EARNINGS_LOOKAHEAD_DAYS)
    data = await _fetch_calendar(
        FINNHUB_EARNINGS_CALENDAR_URL,
        {"from": frm.isoformat(), "to": to.isoformat()},
    )
    if data is None:
        return cached or []

    rows = data.get("earningsCalendar") or []
    events: list[dict] = []
    for row in rows:
        event = _to_earnings_event(row)
        if event is not None:
            events.append(event)

    # Keep the most relevant slice, then present it chronologically.
    events.sort(key=_earnings_relevance, reverse=True)
    events = events[:MAX_EARNINGS_EVENTS]
    events.sort(key=lambda e: e["date"])

    _earnings_cache["data"] = events
    _earnings_cache["ts"] = now
    return events


def _to_search_item(row: dict) -> dict | None:
    """Map a Finnhub symbol-search row into a compact result, or ``None``.

    Keeps only plain, US-listed common-stock symbols (no dots/colons, so no
    exchange-suffixed or non-US listings) — the search box routes to
    ``/stock/{ticker}`` which is yfinance-backed, so a clean symbol is what we
    want.
    """
    symbol = (row.get("symbol") or "").strip().upper()
    if not symbol or not symbol.isalpha():
        return None
    return {
        "symbol": symbol,
        "description": (row.get("description") or "").strip(),
        "type": (row.get("type") or "").strip(),
    }


async def get_company_name(ticker: str) -> str:
    """Resolve a ticker to its company name via Finnhub ``profile2`` (cached).

    Used to bridge a ticker the user typed (e.g. ``AAOI``) to the company name a
    13F reports (``APPLIED OPTOELECTRONICS INC``) so institution-holdings search
    can find small-caps whose CUSIP isn't in our ticker map. Returns ``""`` when
    the key is missing, the symbol is unknown, or Finnhub is unreachable, so the
    caller just proceeds without a name hint.
    """
    key = (ticker or "").strip().upper()
    if not key:
        return ""

    now = time.time()
    entry = _profile_cache.get(key)
    if entry is not None and now - entry["ts"] < _CACHE_TTL_SECONDS:
        return entry["data"]

    api_key = settings.FINNHUB_API_KEY
    if not api_key:
        return ""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                FINNHUB_PROFILE_URL, params={"symbol": key, "token": api_key}
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        logger.exception("Finnhub profile fetch failed for %s", key)
        return entry["data"] if entry is not None else ""

    name = (data.get("name") or "").strip() if isinstance(data, dict) else ""
    _profile_cache[key] = {"data": name, "ts": now}
    return name


async def search_symbols(query: str) -> list[dict]:
    """Return matching stock symbols for a search query, live from Finnhub.

    Backs the header search autocomplete so it can suggest any listed symbol,
    not just a hardcoded shortlist. Results are cleaned to plain US-listed
    common-stock symbols and ranked so a symbol-prefix match surfaces first.
    Cached per-query in-process for ``_CACHE_TTL_SECONDS``; returns an empty
    list (not an error) when the key is missing or Finnhub is unreachable, so
    the frontend can fall back to its local ticker list.
    """
    q = query.strip().upper()
    if not q:
        return []

    now = time.time()
    entry = _search_cache.get(q)
    if entry is not None and now - entry["ts"] < _CACHE_TTL_SECONDS:
        return entry["data"]

    api_key = settings.FINNHUB_API_KEY
    if not api_key:
        logger.warning("FINNHUB_API_KEY not set; skipping Finnhub symbol search")
        return []
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                FINNHUB_SEARCH_URL,
                params={"q": q, "exchange": "US", "token": api_key},
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        logger.exception("Finnhub symbol search failed for %s", q)
        return entry["data"] if entry is not None else []

    rows = data.get("result") if isinstance(data, dict) else None
    if not isinstance(rows, list):
        return entry["data"] if entry is not None else []

    items: list[dict] = []
    seen: set[str] = set()
    for row in rows:
        item = _to_search_item(row)
        if item is None or item["symbol"] in seen:
            continue
        seen.add(item["symbol"])
        items.append(item)

    # Symbol-prefix matches first (what the user is typing), then by symbol
    # length so the tightest match leads, then alphabetically. Sort is stable.
    items.sort(
        key=lambda it: (
            not it["symbol"].startswith(q),
            len(it["symbol"]),
            it["symbol"],
        )
    )
    items = items[:MAX_SEARCH_RESULTS]

    _search_cache[q] = {"data": items, "ts": now}
    return items
