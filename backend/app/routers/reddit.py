from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.reddit import RedditPost, StockMention
from app.schemas.reddit import (
    RedditFetchResponse,
    RedditFetchResult,
    StockMentionOut,
    TrendingTickerOut,
)
from app.services.reddit_fetcher import fetch_all_subreddits

router = APIRouter(prefix="/api/reddit", tags=["reddit"])


@router.get("/mentions", response_model=list[StockMentionOut])
async def list_mentions(
    subreddit: str | None = Query(None),
    ticker: str | None = Query(None),
    hours: int = Query(24, ge=1, le=168),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    cutoff = datetime.now(UTC) - timedelta(hours=hours)

    stmt = (
        select(
            StockMention,
            RedditPost.title.label("post_title"),
        )
        .join(RedditPost, StockMention.post_id == RedditPost.id)
        .where(StockMention.mentioned_at >= cutoff)
        .order_by(StockMention.mentioned_at.desc())
        .limit(limit)
    )

    if subreddit:
        stmt = stmt.where(StockMention.subreddit == subreddit)
    if ticker:
        stmt = stmt.where(StockMention.ticker == ticker.upper())

    result = await db.execute(stmt)
    rows = result.all()

    return [
        StockMentionOut(
            id=mention.id,
            ticker=mention.ticker,
            subreddit=mention.subreddit,
            mentioned_at=mention.mentioned_at,
            score=mention.score,
            post_title=post_title,
        )
        for mention, post_title in rows
    ]


@router.get("/mentions/{ticker}", response_model=list[StockMentionOut])
async def get_ticker_mentions(
    ticker: str,
    hours: int = Query(24, ge=1, le=168),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    cutoff = datetime.now(UTC) - timedelta(hours=hours)

    stmt = (
        select(
            StockMention,
            RedditPost.title.label("post_title"),
        )
        .join(RedditPost, StockMention.post_id == RedditPost.id)
        .where(StockMention.ticker == ticker.upper())
        .where(StockMention.mentioned_at >= cutoff)
        .order_by(StockMention.mentioned_at.desc())
        .limit(limit)
    )

    result = await db.execute(stmt)
    rows = result.all()

    return [
        StockMentionOut(
            id=mention.id,
            ticker=mention.ticker,
            subreddit=mention.subreddit,
            mentioned_at=mention.mentioned_at,
            score=mention.score,
            post_title=post_title,
        )
        for mention, post_title in rows
    ]


@router.get("/trending", response_model=list[TrendingTickerOut])
async def trending_tickers(
    subreddit: str | None = Query(None),
    hours: int = Query(24, ge=1, le=168),
    limit: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    cutoff = datetime.now(UTC) - timedelta(hours=hours)

    stmt = (
        select(
            StockMention.ticker,
            func.count(StockMention.id).label("mention_count"),
            func.sum(StockMention.score).label("total_score"),
            func.array_agg(func.distinct(StockMention.subreddit)).label(
                "subreddits"
            ),
        )
        .where(StockMention.mentioned_at >= cutoff)
        .group_by(StockMention.ticker)
        .order_by(func.count(StockMention.id).desc())
        .limit(limit)
    )

    if subreddit:
        stmt = stmt.where(StockMention.subreddit == subreddit)

    result = await db.execute(stmt)
    rows = result.all()

    return [
        TrendingTickerOut(
            ticker=row.ticker,
            mention_count=row.mention_count,
            total_score=row.total_score or 0,
            subreddits=row.subreddits or [],
        )
        for row in rows
    ]


@router.post("/fetch", response_model=RedditFetchResponse)
async def trigger_fetch(db: AsyncSession = Depends(get_db)):
    counts = await fetch_all_subreddits(db)
    return RedditFetchResponse(
        status="ok",
        results=[
            RedditFetchResult(subreddit=sub, new_mentions=count)
            for sub, count in counts.items()
        ],
    )
