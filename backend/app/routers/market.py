from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.market import MarketSeason
from app.schemas.market import (
    EarningsEventOut,
    EconomicEventOut,
    MarketSeasonOut,
    SubIndicator,
    ThemeOut,
)
from app.services.fear_greed_fetcher import (
    compute_social_bullish_pct,
    refresh_market_season,
)
from app.services.finnhub_fetcher import (
    get_earnings_calendar,
    get_todays_themes,
)
from app.services.finnhub_fetcher import (
    get_economic_events as get_finnhub_economic_events,
)
from app.services.fred_fetcher import get_economic_events as get_fred_economic_events

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/season", response_model=MarketSeasonOut)
async def market_season(db: AsyncSession = Depends(get_db)):
    """Overall market mood: CNN Fear & Greed + a social bullish % from crowd data.

    Serves the most recently stored snapshot (falling back across an upstream
    CNN failure). The social bullish % is recomputed live from our own
    ``trending_snapshots`` so it stays fresh even when CNN is unreachable.
    """
    stmt = select(MarketSeason).order_by(MarketSeason.fetched_at.desc()).limit(1)
    row = (await db.execute(stmt)).scalar_one_or_none()

    # Cold start: no snapshot stored yet — try once on demand.
    if row is None:
        row = await refresh_market_season(db)

    live_social = await compute_social_bullish_pct(db)

    if row is None:
        return MarketSeasonOut(available=False, social_bullish_pct=live_social)

    return MarketSeasonOut(
        available=True,
        score=row.score,
        rating=row.rating,
        vix=SubIndicator(score=row.vix_score, rating=row.vix_rating),
        put_call=SubIndicator(score=row.put_call_score, rating=row.put_call_rating),
        breadth=SubIndicator(score=row.breadth_score, rating=row.breadth_rating),
        social_bullish_pct=(
            live_social if live_social is not None else row.social_bullish_pct
        ),
        fetched_at=row.fetched_at,
    )


@router.get("/themes", response_model=list[ThemeOut])
async def market_themes():
    """Today's market themes, distilled from Finnhub general news.

    Returns an empty list when Finnhub is unreachable or no key is configured,
    so the frontend falls back to its mock themes.
    """
    return await get_todays_themes()


@router.get("/events", response_model=list[EconomicEventOut])
async def market_events():
    """Upcoming economic-calendar events (CPI, jobs, GDP, PCE, FOMC, …).

    Prefers FRED (free release schedule); falls back to Finnhub's premium
    calendar when FRED isn't configured, and to an empty list when neither is
    available, so the frontend can render its mock events.
    """
    events = await get_fred_economic_events()
    if events:
        return events
    return await get_finnhub_economic_events()


@router.get("/earnings", response_model=list[EarningsEventOut])
async def market_earnings():
    """Upcoming earnings reports from Finnhub's earnings calendar.

    Returns an empty list when Finnhub is unreachable or no key is configured,
    so the frontend falls back to its mock earnings schedule.
    """
    return await get_earnings_calendar()
