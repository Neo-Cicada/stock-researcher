import logging
import time

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

FINNHUB_NEWS_URL = "https://finnhub.io/api/v1/news"

# In-process TTL cache (mirrors price_fetcher._detail_cache): Finnhub's free tier
# is 60 req/min, and general market news barely changes minute to minute.
_CACHE_TTL_SECONDS = 600  # 10 minutes
_themes_cache: dict = {"data": None, "ts": 0.0}

MAX_THEMES = 5


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
