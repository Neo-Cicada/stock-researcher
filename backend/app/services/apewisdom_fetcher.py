import logging
from datetime import UTC, datetime

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.reddit import TrendingSnapshot

logger = logging.getLogger(__name__)

BASE_URL = "https://apewisdom.io/api/v1.0/filter"

FILTERS = [
    "all-stocks",
    "wallstreetbets",
    "stocks",
    "stockmarket",
    "investing",
    "Daytrading",
    "pennystocks",
    "options",
]

MAX_PAGES = 3  # 100 per page = up to 300 tickers per filter


async def fetch_filter(
    client: httpx.AsyncClient,
    filter_name: str,
    max_pages: int = MAX_PAGES,
) -> list[dict]:
    """Fetch trending tickers for a single ApeWisdom filter, paginating."""
    all_results: list[dict] = []

    for page in range(1, max_pages + 1):
        url = f"{BASE_URL}/{filter_name}/page/{page}"
        try:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
        except httpx.HTTPStatusError as e:
            logger.warning(
                "ApeWisdom %s page %d: HTTP %d",
                filter_name,
                page,
                e.response.status_code,
            )
            break
        except Exception:
            logger.exception("ApeWisdom %s page %d: error", filter_name, page)
            break

        results = data.get("results", [])
        if not results:
            break

        all_results.extend(results)
        logger.debug(
            "ApeWisdom %s page %d: %d tickers", filter_name, page, len(results)
        )

    return all_results


async def store_snapshots(
    db: AsyncSession,
    filter_name: str,
    results: list[dict],
    fetched_at: datetime,
) -> int:
    """Bulk insert trending snapshots for a filter. Returns count inserted."""
    if not results:
        return 0

    # ApeWisdom's paginated results can repeat a ticker across pages. Since every
    # row in a run shares one fetched_at, a duplicate ticker within a filter would
    # violate uq_ticker_source_ts inside the single INSERT batch. Dedupe by ticker,
    # keeping the first (best-ranked) occurrence.
    seen: set[str] = set()
    snapshots = []
    for item in results:
        ticker = item.get("ticker")
        if not ticker or ticker in seen:
            continue
        seen.add(ticker)
        snapshots.append(
            TrendingSnapshot(
                ticker=ticker,
                name=item.get("name", ""),
                rank=item.get("rank", 0),
                mentions=item.get("mentions", 0),
                upvotes=item.get("upvotes", 0),
                rank_24h_ago=item.get("rank_24h_ago"),
                mentions_24h_ago=item.get("mentions_24h_ago"),
                source=filter_name,
                fetched_at=fetched_at,
            )
        )

    db.add_all(snapshots)
    await db.commit()
    return len(snapshots)


async def fetch_all_filters(db: AsyncSession) -> dict[str, int]:
    """Fetch trending data from all ApeWisdom filters.

    Returns a dict of {filter_name: count_inserted}.
    """
    results: dict[str, int] = {}
    fetched_at = datetime.now(UTC)

    async with httpx.AsyncClient(timeout=30) as client:
        for filter_name in FILTERS:
            try:
                items = await fetch_filter(client, filter_name)
                count = await store_snapshots(db, filter_name, items, fetched_at)
                results[filter_name] = count
                logger.info("ApeWisdom %s: %d tickers stored", filter_name, count)
            except Exception:
                logger.exception("ApeWisdom %s: failed", filter_name)
                # Clear the failed transaction so the next filter can commit
                # instead of hitting PendingRollbackError.
                await db.rollback()
                results[filter_name] = 0

    return results
