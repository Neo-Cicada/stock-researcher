import asyncio
import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from sqlalchemy import func, select

from app.config import settings
from app.database import async_session, engine
from app.models.reddit import TrendingSnapshot
from app.routers import institutions, market, reddit, stocks
from app.services.apewisdom_fetcher import fetch_all_filters
from app.services.fear_greed_fetcher import refresh_market_season
from app.services.price_fetcher import fetch_prices_async

logger = logging.getLogger(__name__)


def _client_ip(request: Request) -> str:
    """Rate-limit key: the left-most X-Forwarded-For hop when behind a proxy,
    else the direct peer address. Deployments must run behind a proxy that sets
    a trustworthy X-Forwarded-For for this to identify real clients."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(key_func=_client_ip, default_limits=[settings.RATE_LIMIT_DEFAULT])

FETCH_INTERVAL = 600  # 10 minutes
PRICE_FETCH_INTERVAL = 300  # 5 minutes
MARKET_FETCH_INTERVAL = 3600  # 1 hour


async def periodic_apewisdom_fetch() -> None:
    """Background task: fetch ApeWisdom trending data every 10 minutes."""
    while True:
        try:
            async with async_session() as db:
                results = await fetch_all_filters(db)
                total = sum(results.values())
                logger.info("ApeWisdom fetch: %d tickers stored", total)
        except Exception:
            logger.exception("Periodic ApeWisdom fetch failed")
        await asyncio.sleep(FETCH_INTERVAL)


async def periodic_price_fetch() -> None:
    """Background task: fetch stock prices every 5 minutes."""
    # Wait for first ApeWisdom fetch to populate tickers
    await asyncio.sleep(30)
    while True:
        try:
            async with async_session() as db:
                # Get unique tickers from latest trending snapshots
                latest_ts = (
                    select(func.max(TrendingSnapshot.fetched_at).label("max_ts"))
                    .group_by(TrendingSnapshot.source)
                    .subquery()
                )
                stmt = select(TrendingSnapshot.ticker).where(
                    TrendingSnapshot.fetched_at.in_(select(latest_ts.c.max_ts))
                )
                result = await db.execute(stmt)
                tickers = list({row[0] for row in result.all()})

                if tickers:
                    count = await fetch_prices_async(db, tickers)
                    logger.info("Price fetch: %d tickers updated", count)
                else:
                    logger.info("Price fetch: no tickers to update")
        except Exception:
            logger.exception("Periodic price fetch failed")
        await asyncio.sleep(PRICE_FETCH_INTERVAL)


async def periodic_market_season_fetch() -> None:
    """Background task: refresh the market-season snapshot every hour."""
    while True:
        try:
            async with async_session() as db:
                row = await refresh_market_season(db)
                if row is not None:
                    logger.info("Market season fetch: score=%s", row.score)
                else:
                    logger.info("Market season fetch: upstream unavailable")
        except Exception:
            logger.exception("Periodic market season fetch failed")
        await asyncio.sleep(MARKET_FETCH_INTERVAL)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    # Surface degraded-to-mock conditions at boot so a prod deploy isn't
    # silently serving sample data (see the frontend "SAMPLE DATA" labelling).
    if not settings.FINNHUB_API_KEY:
        logger.warning(
            "FINNHUB_API_KEY unset — themes, company news, and the "
            "events/earnings calendars will serve empty/mock data."
        )
    apewisdom_task = asyncio.create_task(periodic_apewisdom_fetch())
    price_task = asyncio.create_task(periodic_price_fetch())
    market_task = asyncio.create_task(periodic_market_season_fetch())
    logger.info("Started periodic ApeWisdom, price, and market season fetch tasks")
    try:
        yield
    finally:
        apewisdom_task.cancel()
        price_task.cancel()
        market_task.cancel()
        for task in (apewisdom_task, price_task, market_task):
            try:
                await task
            except asyncio.CancelledError:
                pass
        await engine.dispose()


# Interactive docs / OpenAPI schema are only served in DEBUG so the API's
# surface isn't advertised publicly in production.
app = FastAPI(
    title="Kabuka API",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
)

# Per-client rate limiting across every route (default limit from settings).
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    # No cookies/Authorization are used, so credentials stay off — this keeps a
    # wildcard-origin misconfiguration from ever exposing authenticated state.
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(stocks.router)
app.include_router(reddit.router)
app.include_router(market.router)
app.include_router(institutions.router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
