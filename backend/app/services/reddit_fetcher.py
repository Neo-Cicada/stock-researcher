import asyncio
import logging
from datetime import UTC, datetime

import httpx
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.reddit import RedditPost, StockMention
from app.services.known_tickers import KNOWN_TICKERS
from app.services.ticker_extractor import extract_tickers

logger = logging.getLogger(__name__)

SUBREDDITS = ["wallstreetbets", "investing", "daytrading"]

USER_AGENT = "Kabuka/1.0 (stock research app)"


async def fetch_subreddit_posts(
    client: httpx.AsyncClient,
    subreddit: str,
    limit: int = 50,
) -> list[dict]:
    """Fetch hot posts from a subreddit using Reddit's public JSON API."""
    url = f"https://www.reddit.com/r/{subreddit}/hot.json"
    resp = await client.get(
        url,
        params={"limit": limit, "raw_json": 1},
        headers={"User-Agent": USER_AGENT},
    )
    resp.raise_for_status()
    data = resp.json()
    return [child["data"] for child in data.get("data", {}).get("children", [])]


async def process_and_store_posts(
    db: AsyncSession,
    subreddit: str,
    posts: list[dict],
) -> int:
    """Extract tickers from posts, upsert posts, and insert mentions.

    Returns the number of new mentions inserted.
    """
    mention_count = 0

    for post_data in posts:
        reddit_id = post_data.get("id", "")
        title = post_data.get("title", "")
        selftext = post_data.get("selftext", "")
        author = post_data.get("author", "[deleted]")
        url = post_data.get("url", "")
        score = post_data.get("score", 0)
        num_comments = post_data.get("num_comments", 0)
        created_utc = datetime.fromtimestamp(
            post_data.get("created_utc", 0), tz=UTC
        )

        # Skip pinned/stickied mod posts
        if post_data.get("stickied", False):
            continue

        # Extract tickers from title + body
        text = f"{title} {selftext}"
        tickers = extract_tickers(text, KNOWN_TICKERS)
        if not tickers:
            continue

        # Upsert the post (update score/comments on conflict)
        post_stmt = (
            pg_insert(RedditPost)
            .values(
                reddit_id=reddit_id,
                subreddit=subreddit,
                title=title,
                selftext=selftext[:5000],  # truncate very long posts
                author=author,
                url=url,
                score=score,
                num_comments=num_comments,
                created_utc=created_utc,
            )
            .on_conflict_do_update(
                index_elements=["reddit_id"],
                set_={"score": score, "num_comments": num_comments},
            )
            .returning(RedditPost.id)
        )
        result = await db.execute(post_stmt)
        post_id = result.scalar_one()

        # Insert mentions (skip duplicates)
        for ticker in tickers:
            mention_stmt = (
                pg_insert(StockMention)
                .values(
                    post_id=post_id,
                    ticker=ticker,
                    subreddit=subreddit,
                    mentioned_at=created_utc,
                    score=score,
                )
                .on_conflict_do_nothing(constraint="uq_post_ticker")
            )
            result = await db.execute(mention_stmt)
            if result.rowcount > 0:
                mention_count += 1

    await db.commit()
    return mention_count


async def fetch_all_subreddits(db: AsyncSession) -> dict[str, int]:
    """Fetch posts from all tracked subreddits. Returns mention counts per sub."""
    results: dict[str, int] = {}

    async with httpx.AsyncClient(timeout=30) as client:
        for sub in SUBREDDITS:
            try:
                posts = await fetch_subreddit_posts(client, sub)
                count = await process_and_store_posts(db, sub, posts)
                results[sub] = count
                logger.info(
                    "r/%s: %d posts, %d new mentions",
                    sub, len(posts), count,
                )
            except httpx.HTTPStatusError as e:
                logger.warning(
                    "r/%s: HTTP %d", sub, e.response.status_code,
                )
                results[sub] = 0
            except Exception:
                logger.exception("r/%s: unexpected error", sub)
                results[sub] = 0

            # Be polite to Reddit's rate limits
            await asyncio.sleep(2)

    return results
