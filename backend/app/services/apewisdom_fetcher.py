import logging
from datetime import UTC, datetime, timedelta

import httpx
from sqlalchemy import delete, func, select
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

# trending_snapshots is append-only: 8 filters x up to 300 tickers every 10
# minutes is ~193k rows (~41 MB) a day, which filled a small managed-Postgres
# volume in eight days and took production down with a DiskFullError. Nothing
# reads beyond the newest snapshot per source -- /api/reddit/trending and
# compute_social_bullish_pct() both select the latest fetched_at, and the "24h
# ago" comparisons use ApeWisdom's own rank_24h_ago / mentions_24h_ago columns
# rather than our history -- so a day of retention is already generous.
RETENTION_HOURS = 24


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


def _prune_stmt(cutoff: datetime, keep: list[datetime]):
    """Build the retention DELETE: everything before ``cutoff``, except the
    snapshot timestamps in ``keep`` (the newest per source). Pure, so the
    retention rule can be asserted without a database."""
    stmt = delete(TrendingSnapshot).where(TrendingSnapshot.fetched_at < cutoff)
    if keep:
        stmt = stmt.where(TrendingSnapshot.fetched_at.notin_(keep))
    return stmt


async def prune_old_snapshots(
    db: AsyncSession, retention_hours: int = RETENTION_HOURS
) -> int:
    """Delete trending snapshots older than the retention window.

    The newest snapshot of every source is always kept, however old it is. That
    matters when upstream is down: pruning by age alone would empty the table
    after a long outage and leave /api/reddit/trending with nothing to serve,
    whereas stale rows at least keep the dashboard rendering.

    Returns the number of rows deleted.
    """
    cutoff = datetime.now(UTC) - timedelta(hours=retention_hours)

    # One timestamp per source (there are only a handful), resolved up front so
    # the DELETE stays a simple indexed range scan instead of a correlated
    # subquery over a table with hundreds of thousands of rows.
    latest = await db.execute(
        select(func.max(TrendingSnapshot.fetched_at)).group_by(TrendingSnapshot.source)
    )
    keep = [ts for (ts,) in latest.all() if ts is not None]

    result = await db.execute(_prune_stmt(cutoff, keep))
    await db.commit()
    return result.rowcount or 0


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
                # instead of hitting PendingRollbackError. A connection killed
                # by the host's idle-timeout proxy raises an InterfaceError that
                # SQLAlchemy recognises as a disconnect, so it invalidates the
                # connection and this rollback is a no-op — but rollback can
                # itself raise in other broken states, and an escaping exception
                # would abandon every remaining filter. Swallow it and close()
                # instead: the session then checks out a fresh connection.
                try:
                    await db.rollback()
                except Exception:
                    logger.warning(
                        "ApeWisdom %s: rollback failed; discarding connection",
                        filter_name,
                    )
                    try:
                        await db.close()
                    except Exception:
                        logger.exception(
                            "ApeWisdom %s: session close failed", filter_name
                        )
                results[filter_name] = 0

    # Prune after storing, so a run that inserted nothing still can't shrink the
    # table below one snapshot per source. Failure here must not fail the fetch.
    try:
        deleted = await prune_old_snapshots(db)
        if deleted:
            logger.info(
                "ApeWisdom prune: %d rows older than %dh deleted",
                deleted,
                RETENTION_HOURS,
            )
    except Exception:
        logger.exception("ApeWisdom prune: failed")
        try:
            await db.rollback()
        except Exception:
            logger.warning("ApeWisdom prune: rollback failed")

    return results
