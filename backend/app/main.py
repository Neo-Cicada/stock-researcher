import asyncio
import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select

from app.config import settings
from app.database import async_session, engine
from app.models.reddit import TrendingSnapshot
from app.routers import reddit, stocks
from app.services.apewisdom_fetcher import fetch_all_filters
from app.services.price_fetcher import fetch_prices_async

logger = logging.getLogger(__name__)

FETCH_INTERVAL = 600  # 10 minutes
PRICE_FETCH_INTERVAL = 300  # 5 minutes


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


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    apewisdom_task = asyncio.create_task(periodic_apewisdom_fetch())
    price_task = asyncio.create_task(periodic_price_fetch())
    logger.info("Started periodic ApeWisdom and price fetch tasks")
    try:
        yield
    finally:
        apewisdom_task.cancel()
        price_task.cancel()
        for task in (apewisdom_task, price_task):
            try:
                await task
            except asyncio.CancelledError:
                pass
        await engine.dispose()


app = FastAPI(title="Kabuka API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stocks.router)
app.include_router(reddit.router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
