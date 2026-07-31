import asyncio
from datetime import UTC, datetime, timedelta

from sqlalchemy.dialects import postgresql

from app.services.apewisdom_fetcher import RETENTION_HOURS, _prune_stmt, store_snapshots


def _sql(stmt) -> str:
    return str(
        stmt.compile(
            dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True}
        )
    )


CUTOFF = datetime(2026, 7, 31, 0, 0, tzinfo=UTC)


def test_prune_deletes_only_before_cutoff():
    sql = _sql(_prune_stmt(CUTOFF, []))
    assert "DELETE FROM trending_snapshots" in sql
    assert "fetched_at < " in sql
    assert "2026-07-31 00:00:00+00:00" in sql
    # With nothing to keep there must be no exclusion clause at all.
    assert "NOT IN" not in sql


def test_prune_always_spares_the_newest_snapshot_per_source():
    """The guard that matters: a long upstream outage must not empty the table."""
    keep = [
        datetime(2026, 7, 20, 3, 0, tzinfo=UTC),  # older than the cutoff
        datetime(2026, 7, 21, 4, 0, tzinfo=UTC),
    ]
    sql = _sql(_prune_stmt(CUTOFF, keep))
    assert "NOT IN" in sql
    for ts in keep:
        assert str(ts) in sql


def test_retention_window_is_a_day():
    assert timedelta(hours=RETENTION_HOURS) == timedelta(days=1)


def test_store_snapshots_dedupes_repeated_tickers():
    """ApeWisdom repeats tickers across pages; every row in a run shares one
    fetched_at, so a duplicate would violate uq_ticker_source_ts mid-INSERT."""
    added: list = []

    class FakeSession:
        def add_all(self, rows):
            added.extend(rows)

        async def commit(self):
            pass

    results = [
        {"ticker": "GME", "name": "GameStop", "rank": 1, "mentions": 10},
        {"ticker": "GME", "name": "GameStop", "rank": 7, "mentions": 3},
        {"ticker": "AMC", "name": "AMC", "rank": 2, "mentions": 5},
        {"ticker": None, "name": "junk"},
    ]
    ts = datetime.now(UTC)
    # The suite has no async plugin, so drive the coroutine directly.
    count = asyncio.run(store_snapshots(FakeSession(), "wallstreetbets", results, ts))

    assert count == 2
    assert [r.ticker for r in added] == ["GME", "AMC"]
    # The first (best-ranked) occurrence wins.
    assert added[0].rank == 1
