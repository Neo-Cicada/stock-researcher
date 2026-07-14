import logging

import httpx
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.market import MarketSeason
from app.models.reddit import TrendingSnapshot

logger = logging.getLogger(__name__)

FEAR_GREED_URL = "https://production.dataviz.cnn.com/index/fearandgreed/graphdata"

# CNN's dataviz endpoint 403s without a realistic browser User-Agent.
BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
}


def _sub(payload: dict, key: str) -> dict:
    """Extract {score, rating} from a CNN sub-indicator, tolerant of shape."""
    node = payload.get(key) or {}
    score = node.get("score")
    return {
        "score": float(score) if isinstance(score, (int, float)) else None,
        "rating": node.get("rating"),
    }


async def fetch_fear_greed() -> dict | None:
    """Fetch CNN's Fear & Greed index (overall + VIX / Put-Call / Breadth).

    Returns a dict with ``score``/``rating`` and ``vix``/``put_call``/``breadth``
    sub-indicator dicts, or ``None`` on any failure so the caller can fall back
    to the last stored snapshot. Parsing is defensive (``.get()`` throughout)
    because the payload may omit a sub-indicator.
    """
    try:
        async with httpx.AsyncClient(headers=BROWSER_HEADERS, timeout=30) as client:
            resp = await client.get(FEAR_GREED_URL)
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        logger.exception("CNN Fear & Greed fetch failed")
        return None

    fg = data.get("fear_and_greed") or {}
    overall_score = fg.get("score")

    return {
        "score": (
            float(overall_score) if isinstance(overall_score, (int, float)) else None
        ),
        "rating": fg.get("rating"),
        "vix": _sub(data, "market_volatility_vix"),
        "put_call": _sub(data, "put_call_options"),
        "breadth": _sub(data, "stock_price_breadth"),
    }


async def compute_social_bullish_pct(db: AsyncSession) -> float | None:
    """Crowd bullishness proxy from the latest ApeWisdom trending snapshots.

    ``trending_snapshots`` has no sentiment column, so bullishness is
    approximated by rank momentum: of the latest-snapshot tickers that have a
    ``rank_24h_ago``, the share that climbed the leaderboard
    (``rank < rank_24h_ago``). Returns ``None`` when there is no comparable
    data.
    """
    # Latest fetched_at per source (mirror routers/reddit.py).
    latest_ts = (
        select(func.max(TrendingSnapshot.fetched_at).label("max_ts"))
        .group_by(TrendingSnapshot.source)
        .subquery()
    )
    stmt = select(TrendingSnapshot).where(
        TrendingSnapshot.fetched_at.in_(select(latest_ts.c.max_ts))
    )
    result = await db.execute(stmt)
    snapshots = result.scalars().all()

    # Best (lowest) current rank + its paired rank_24h_ago per ticker.
    best: dict[str, tuple[int, int | None]] = {}
    for snap in snapshots:
        current = best.get(snap.ticker)
        if current is None or snap.rank < current[0]:
            best[snap.ticker] = (snap.rank, snap.rank_24h_ago)

    climbers = 0
    decliners = 0
    for rank, rank_24h_ago in best.values():
        if rank_24h_ago is None:
            continue
        if rank < rank_24h_ago:
            climbers += 1
        elif rank > rank_24h_ago:
            decliners += 1

    total = climbers + decliners
    if total == 0:
        return None
    return round(100 * climbers / total, 1)


async def refresh_market_season(db: AsyncSession) -> MarketSeason | None:
    """Fetch CNN Fear & Greed, compute social bullish %, store a new row.

    Returns the stored ``MarketSeason`` row, or ``None`` when CNN is
    unreachable (no row is written so the last stored snapshot remains the
    fallback).
    """
    fg = await fetch_fear_greed()
    if fg is None:
        return None

    social = await compute_social_bullish_pct(db)

    row = MarketSeason(
        score=fg["score"],
        rating=fg["rating"],
        vix_score=fg["vix"]["score"],
        vix_rating=fg["vix"]["rating"],
        put_call_score=fg["put_call"]["score"],
        put_call_rating=fg["put_call"]["rating"],
        breadth_score=fg["breadth"]["score"],
        breadth_rating=fg["breadth"]["rating"],
        social_bullish_pct=social,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row
