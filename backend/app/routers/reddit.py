from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.price import StockPrice
from app.models.reddit import TrendingSnapshot
from app.schemas.reddit import (
    RedditFetchResponse,
    RedditFetchResult,
    TrendingTickerOut,
)
from app.services.apewisdom_fetcher import fetch_all_filters

router = APIRouter(prefix="/api/reddit", tags=["reddit"])


def require_admin(x_admin_token: str | None = Header(default=None)) -> None:
    """Guard for the manual fetch trigger. Disabled unless ADMIN_TOKEN is set
    (production default), and otherwise requires an exact-match header."""
    if not settings.ADMIN_TOKEN or x_admin_token != settings.ADMIN_TOKEN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


@router.get("/trending", response_model=list[TrendingTickerOut])
async def trending_tickers(
    source: str | None = Query(None),
    limit: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    # Subquery: latest fetched_at per source
    latest_ts = (
        select(func.max(TrendingSnapshot.fetched_at).label("max_ts"))
        .group_by(TrendingSnapshot.source)
        .subquery()
    )

    # Get snapshots from the latest fetch only
    stmt = select(TrendingSnapshot).where(
        TrendingSnapshot.fetched_at.in_(select(latest_ts.c.max_ts))
    )

    if source:
        stmt = stmt.where(TrendingSnapshot.source == source)

    result = await db.execute(stmt)
    snapshots = result.scalars().all()

    # Aggregate across sources by ticker
    ticker_data: dict[str, dict] = {}
    for snap in snapshots:
        if snap.ticker not in ticker_data:
            ticker_data[snap.ticker] = {
                "ticker": snap.ticker,
                "name": snap.name,
                "mention_count": 0,
                "upvotes": 0,
                "rank": snap.rank,
                "rank_24h_ago": snap.rank_24h_ago,
                "mentions_24h_ago": None,
                "sources": [],
            }
        entry = ticker_data[snap.ticker]
        entry["mention_count"] += snap.mentions
        entry["upvotes"] += snap.upvotes
        if snap.mentions_24h_ago is not None:
            entry["mentions_24h_ago"] = (entry["mentions_24h_ago"] or 0) + (
                snap.mentions_24h_ago
            )
        entry["sources"].append(snap.source)
        # Keep the best (lowest) rank
        if snap.rank < entry["rank"]:
            entry["rank"] = snap.rank
            entry["rank_24h_ago"] = snap.rank_24h_ago

    # Fetch prices for all tickers in one query
    all_tickers = list(ticker_data.keys())
    if all_tickers:
        price_stmt = select(StockPrice).where(StockPrice.ticker.in_(all_tickers))
        price_result = await db.execute(price_stmt)
        price_map = {p.ticker: p for p in price_result.scalars().all()}

        for ticker, entry in ticker_data.items():
            sp = price_map.get(ticker)
            if sp:
                entry["price"] = sp.price
                entry["previous_close"] = sp.previous_close
                entry["day_change_pct"] = sp.day_change_pct
                entry["extended_price"] = sp.extended_price
                entry["extended_change_pct"] = sp.extended_change_pct
                entry["market_state"] = sp.market_state

    # Sort by mention_count descending, limit
    sorted_tickers = sorted(
        ticker_data.values(), key=lambda x: x["mention_count"], reverse=True
    )[:limit]

    return [TrendingTickerOut(**t) for t in sorted_tickers]


@router.post(
    "/fetch",
    response_model=RedditFetchResponse,
    dependencies=[Depends(require_admin)],
)
async def trigger_fetch(db: AsyncSession = Depends(get_db)):
    counts = await fetch_all_filters(db)
    return RedditFetchResponse(
        status="ok",
        results=[
            RedditFetchResult(source=src, tickers_stored=count)
            for src, count in counts.items()
        ],
    )
