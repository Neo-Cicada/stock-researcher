import asyncio
import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import async_session, engine
from app.routers import reddit, stocks
from app.services.reddit_fetcher import fetch_all_subreddits

logger = logging.getLogger(__name__)

FETCH_INTERVAL = 600  # 10 minutes


async def periodic_reddit_fetch() -> None:
    """Background task: fetch Reddit posts every 10 minutes."""
    while True:
        try:
            async with async_session() as db:
                results = await fetch_all_subreddits(db)
                total = sum(results.values())
                logger.info("Periodic fetch complete: %d new mentions", total)
        except Exception:
            logger.exception("Periodic Reddit fetch failed")
        await asyncio.sleep(FETCH_INTERVAL)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    task = asyncio.create_task(periodic_reddit_fetch())
    logger.info("Started periodic Reddit fetch task")
    try:
        yield
    finally:
        task.cancel()
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
