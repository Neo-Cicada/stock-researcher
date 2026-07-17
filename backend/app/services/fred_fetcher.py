"""FRED (Federal Reserve Economic Data) economic-calendar client.

Finnhub's economic calendar is a premium endpoint that 403s on a free key, so
we source the US macro release schedule from FRED instead — a free St. Louis Fed
API (key from https://fredaccount.stlouisfed.org/apikeys).

FRED gives us the real *release dates* (and names) for the major indicators —
CPI, the Employment Situation, GDP, PCE, PPI, retail sales, jobless claims. It
does not carry analyst consensus estimates, and its release values are raw
indices/levels rather than the headline YoY figures people quote, so we surface
dates + names + an assigned impact and leave the numeric columns empty (the
frontend renders "—"). FOMC decisions aren't a FRED "release", so they're merged
in from the Fed's published meeting schedule (``_FOMC_2026``).

Everything degrades gracefully: no key, an upstream error, or an unparsable body
all yield ``[]`` so the frontend can fall back to its mock calendar.
"""

import logging
import time
from datetime import date, timedelta

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

FRED_RELEASES_DATES_URL = "https://api.stlouisfed.org/fred/releases/dates"

# How far ahead to populate the calendar. Monthly releases (CPI, jobs) can be
# ~4-5 weeks out, so look ~a month. FRED's /releases/dates caps limit at 1000
# rows (~37 days of the full firehose sorted ascending from today), so keeping
# this at 30 stays safely inside one un-truncated page.
LOOKAHEAD_DAYS = 30
MAX_EVENTS = 30
_TTL_SECONDS = 3600  # 1 hour
_cache: dict = {"data": None, "ts": 0.0}

# FRED release-name (lower-cased) substring -> (display label, impact). First
# match wins. Matching by name keeps us robust to FRED's numeric release ids
# changing/being mis-remembered.
_CURATED: list[tuple[str, str, str]] = [
    ("consumer price index", "CPI · Consumer Price Index", "high"),
    ("employment situation", "Employment Situation · Jobs", "high"),
    ("gross domestic product", "GDP", "high"),
    ("personal income and outlays", "PCE · Personal Income & Outlays", "high"),
    ("producer price index", "PPI · Producer Price Index", "medium"),
    ("advance monthly sales for retail", "Retail Sales", "medium"),
    ("unemployment insurance weekly claims", "Initial Jobless Claims", "medium"),
]

# Fed's published 2026 FOMC meeting schedule (decision announced on the 2nd day).
# Verify/refresh annually against federalreserve.gov/monetarypolicy/fomccalendars.
_FOMC_2026: list[date] = [
    date(2026, 1, 28),
    date(2026, 3, 18),
    date(2026, 4, 29),
    date(2026, 6, 17),
    date(2026, 7, 29),
    date(2026, 9, 16),
    date(2026, 10, 28),
    date(2026, 12, 9),
]


def _match_release(release_name: str) -> tuple[str, str] | None:
    """Map a FRED release name to a (display label, impact), or None to skip.

    Prefix (not substring) match so we don't catch adjacent releases like "Debt
    to Gross Domestic Product Ratios" or "Research Consumer Price Index".
    """
    low = (release_name or "").strip().lower()
    for needle, label, impact in _CURATED:
        if low.startswith(needle):
            return label, impact
    return None


def _event(label: str, day: date, impact: str, country: str = "US") -> dict:
    """Build an EconomicEventOut-shaped dict (date-only, no numeric columns)."""
    return {
        "event": label,
        "country": country,
        "time": day.isoformat(),  # date only; the frontend shows no time-of-day
        "impact": impact,
        "actual": None,
        "estimate": None,
        "previous": None,
        "unit": "",
    }


def _fred_events_from_release_dates(
    release_dates: list[dict], today: date, horizon: date
) -> list[dict]:
    """Filter FRED release-date rows to the curated set within [today, horizon].

    Pure (no I/O) so it is unit-testable. Each row looks like
    ``{"release_id": 10, "release_name": "Consumer Price Index", "date": "..."}``.
    """
    events: list[dict] = []
    for row in release_dates:
        raw = (row.get("date") or "").strip()
        try:
            day = date.fromisoformat(raw)
        except ValueError:
            continue
        if day < today or day > horizon:
            continue
        matched = _match_release(row.get("release_name") or "")
        if matched is None:
            continue
        label, impact = matched
        events.append(_event(label, day, impact))
    return events


def _fomc_events(today: date, horizon: date) -> list[dict]:
    """FOMC decisions within [today, horizon] from the hardcoded schedule."""
    return [
        _event("FOMC Rate Decision", day, "high")
        for day in _FOMC_2026
        if today <= day <= horizon
    ]


async def get_economic_events() -> list[dict]:
    """Upcoming US economic-calendar events (CPI, jobs, GDP, PCE, FOMC, …).

    Sourced from FRED release dates + the Fed's FOMC schedule, ordered by date.
    Cached in-process for ``_TTL_SECONDS``. Returns ``[]`` (so the frontend uses
    mock) when ``FRED_API_KEY`` is unset or on any upstream/parse failure; the
    last good list is served if a later refresh fails.
    """
    now = time.time()
    cached = _cache["data"]
    if cached is not None and now - _cache["ts"] < _TTL_SECONDS:
        return cached

    api_key = settings.FRED_API_KEY
    if not api_key:
        logger.warning("FRED_API_KEY not set; economic calendar will use mock")
        return cached or []

    today = date.today()
    horizon = today + timedelta(days=LOOKAHEAD_DAYS)
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                FRED_RELEASES_DATES_URL,
                params={
                    "api_key": api_key,
                    "file_type": "json",
                    # realtime_end must reach into the future or FRED only
                    # returns releases published *today*, not the upcoming
                    # schedule. include_release_dates_with_no_data surfaces
                    # future releases that have no published value yet. Results
                    # are the full firehose sorted ascending from today; we
                    # window-filter to [today, horizon] below (limit caps at
                    # 1000, ~37 days — see LOOKAHEAD_DAYS).
                    "realtime_start": today.isoformat(),
                    "realtime_end": "9999-12-31",
                    "include_release_dates_with_no_data": "true",
                    "sort_order": "asc",
                    "limit": 1000,
                },
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        logger.exception("FRED release-dates fetch failed")
        return cached or []

    release_dates = data.get("release_dates") if isinstance(data, dict) else None
    if not isinstance(release_dates, list):
        return cached or []

    events = _fred_events_from_release_dates(release_dates, today, horizon)
    events.extend(_fomc_events(today, horizon))
    events.sort(key=lambda e: e["time"])
    events = events[:MAX_EVENTS]

    _cache["data"] = events
    _cache["ts"] = now
    return events
