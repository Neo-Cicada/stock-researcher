import logging
import time
from datetime import date, timedelta

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

FINNHUB_NEWS_URL = "https://finnhub.io/api/v1/news"
FINNHUB_COMPANY_NEWS_URL = "https://finnhub.io/api/v1/company-news"

# In-process TTL cache (mirrors price_fetcher._detail_cache): Finnhub's free tier
# is 60 req/min, and general market news barely changes minute to minute.
_CACHE_TTL_SECONDS = 600  # 10 minutes
_themes_cache: dict = {"data": None, "ts": 0.0}

# Per-ticker company-news cache: {ticker: {"data": [...], "ts": float}}.
_company_news_cache: dict[str, dict] = {}

MAX_THEMES = 5
MAX_COMPANY_NEWS = 8
# How far back to ask Finnhub for company headlines.
COMPANY_NEWS_LOOKBACK_DAYS = 14


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
