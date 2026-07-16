import asyncio
from datetime import date, timedelta

from app.services import finnhub_fetcher
from app.services.finnhub_fetcher import (
    _to_earnings_event,
    _to_economic_event,
    _to_search_item,
    _to_theme,
    get_earnings_calendar,
    get_economic_events,
    get_todays_themes,
    search_symbols,
)


def test_to_theme_maps_fields_and_splits_tickers():
    article = {
        "headline": "Chip stocks rally",
        "summary": "AI demand strong.",
        "source": "Reuters",
        "url": "https://example.com/a",
        "related": "NVDA,AMD, SMCI",
        "datetime": 1720000000,
    }
    theme = _to_theme(article)
    assert theme["title"] == "Chip stocks rally"
    assert theme["tickers"] == ["NVDA", "AMD", "SMCI"]
    assert theme["source"] == "Reuters"
    assert theme["url"] == "https://example.com/a"


def test_to_theme_skips_empty_headline():
    assert _to_theme({"headline": "  "}) is None


def _reset_cache(monkeypatch):
    monkeypatch.setattr(finnhub_fetcher, "_themes_cache", {"data": None, "ts": 0.0})


def test_get_todays_themes_empty_on_fetch_failure(monkeypatch):
    """Upstream failure with no cache -> empty list (frontend falls back)."""
    _reset_cache(monkeypatch)

    async def _none():
        return None

    monkeypatch.setattr(finnhub_fetcher, "_fetch_general_news", _none)
    assert asyncio.run(get_todays_themes()) == []


def test_get_todays_themes_prefers_ticker_tagged(monkeypatch):
    """Ticker-tagged stories sort ahead of untagged ones."""
    _reset_cache(monkeypatch)

    async def _fake():
        return [
            {"headline": "General macro note", "related": ""},
            {"headline": "NVDA earnings beat", "related": "NVDA"},
        ]

    monkeypatch.setattr(finnhub_fetcher, "_fetch_general_news", _fake)
    themes = asyncio.run(get_todays_themes())

    assert [t["title"] for t in themes] == ["NVDA earnings beat", "General macro note"]


# ---- Economic calendar ----


def test_to_economic_event_maps_and_coerces_numbers():
    row = {
        "event": "CPI m/m",
        "country": "US",
        "time": "2026-07-16 12:30:00",
        "impact": "high",
        "actual": "",
        "estimate": "0.3",
        "prev": 0.4,
        "unit": "%",
    }
    ev = _to_economic_event(row)
    assert ev["event"] == "CPI m/m"
    assert ev["country"] == "US"
    assert ev["actual"] is None  # blank string -> None
    assert ev["estimate"] == 0.3
    assert ev["previous"] == 0.4


def test_to_economic_event_skips_empty_event():
    assert _to_economic_event({"event": "  ", "country": "US"}) is None


def test_get_economic_events_empty_on_fetch_failure(monkeypatch):
    """Upstream failure / premium-gated key with no cache -> empty list."""
    monkeypatch.setattr(finnhub_fetcher, "_economic_cache", {"data": None, "ts": 0.0})

    async def _none(*args, **kwargs):
        return None

    monkeypatch.setattr(finnhub_fetcher, "_fetch_calendar", _none)
    assert asyncio.run(get_economic_events()) == []


def test_get_economic_events_sorts_by_time(monkeypatch):
    monkeypatch.setattr(finnhub_fetcher, "_economic_cache", {"data": None, "ts": 0.0})

    async def _fake(*args, **kwargs):
        return {
            "economicCalendar": [
                {"event": "FOMC Rate Decision", "time": "2026-07-18 18:00:00"},
                {"event": "CPI m/m", "time": "2026-07-16 12:30:00"},
            ]
        }

    monkeypatch.setattr(finnhub_fetcher, "_fetch_calendar", _fake)
    events = asyncio.run(get_economic_events())
    assert [e["event"] for e in events] == ["CPI m/m", "FOMC Rate Decision"]


# ---- Earnings calendar ----


def test_to_earnings_event_maps_and_uppercases_symbol():
    row = {
        "symbol": "nvda",
        "date": "2026-07-17",
        "hour": "amc",
        "epsEstimate": "1.25",
        "epsActual": None,
        "revenueEstimate": 4.2e10,
    }
    ev = _to_earnings_event(row)
    assert ev["symbol"] == "NVDA"
    assert ev["hour"] == "amc"
    assert ev["eps_estimate"] == 1.25
    assert ev["eps_actual"] is None
    assert ev["revenue_actual"] is None


def test_to_earnings_event_skips_empty_symbol():
    assert _to_earnings_event({"symbol": "", "date": "2026-07-17"}) is None


def test_get_earnings_calendar_empty_on_fetch_failure(monkeypatch):
    monkeypatch.setattr(finnhub_fetcher, "_earnings_cache", {"data": None, "ts": 0.0})

    async def _none(*args, **kwargs):
        return None

    monkeypatch.setattr(finnhub_fetcher, "_fetch_calendar", _none)
    assert asyncio.run(get_earnings_calendar()) == []


def test_get_earnings_calendar_sorts_by_date(monkeypatch):
    monkeypatch.setattr(finnhub_fetcher, "_earnings_cache", {"data": None, "ts": 0.0})

    async def _fake(*args, **kwargs):
        return {
            "earningsCalendar": [
                {"symbol": "TSLA", "date": "2026-07-20"},
                {"symbol": "NVDA", "date": "2026-07-17"},
            ]
        }

    monkeypatch.setattr(finnhub_fetcher, "_fetch_calendar", _fake)
    events = asyncio.run(get_earnings_calendar())
    assert [e["symbol"] for e in events] == ["NVDA", "TSLA"]


def test_get_earnings_calendar_keeps_relevant_then_orders_by_date(monkeypatch):
    """Over the cap, high-revenue/estimate names survive; a no-estimate microcap
    on an earlier date is dropped, and the kept slice is returned by date."""
    monkeypatch.setattr(finnhub_fetcher, "_earnings_cache", {"data": None, "ts": 0.0})
    monkeypatch.setattr(finnhub_fetcher, "MAX_EARNINGS_EVENTS", 2)

    async def _fake(*args, **kwargs):
        return {
            "earningsCalendar": [
                {"symbol": "TINY", "date": "2026-07-16"},  # no estimates -> dropped
                {"symbol": "BIG", "date": "2026-07-20", "revenueEstimate": 1.2e10},
                {"symbol": "MID", "date": "2026-07-17", "epsEstimate": 0.5},
            ]
        }

    monkeypatch.setattr(finnhub_fetcher, "_fetch_calendar", _fake)
    events = asyncio.run(get_earnings_calendar())
    # TINY (earliest date but no coverage) is cut; kept pair ordered by date.
    assert [e["symbol"] for e in events] == ["MID", "BIG"]


def test_get_earnings_calendar_window_includes_yesterday(monkeypatch):
    """The requested window starts a day before today so an after-close US-time
    report stays visible once the server (UTC) clock rolls over."""
    monkeypatch.setattr(finnhub_fetcher, "_earnings_cache", {"data": None, "ts": 0.0})
    captured: dict = {}

    async def _fake(url, params):
        captured.update(params)
        return {"earningsCalendar": []}

    monkeypatch.setattr(finnhub_fetcher, "_fetch_calendar", _fake)
    asyncio.run(get_earnings_calendar())
    today = date.today()
    assert captured["from"] == (today - timedelta(days=1)).isoformat()
    assert (
        captured["to"]
        == (today + timedelta(days=finnhub_fetcher.EARNINGS_LOOKAHEAD_DAYS)).isoformat()
    )


# ---- Symbol search ----


def test_to_search_item_maps_and_uppercases_symbol():
    item = _to_search_item(
        {"symbol": "aapl", "description": "APPLE INC", "type": "Common Stock"}
    )
    assert item["symbol"] == "AAPL"
    assert item["description"] == "APPLE INC"


def test_to_search_item_drops_non_plain_symbols():
    # Dotted / exchange-suffixed / non-alpha symbols are filtered out.
    assert _to_search_item({"symbol": "RY.TO", "description": "Royal Bank"}) is None
    assert _to_search_item({"symbol": "", "description": "Blank"}) is None


def _reset_search_cache(monkeypatch):
    monkeypatch.setattr(finnhub_fetcher, "_search_cache", {})


def test_search_symbols_empty_query_returns_empty(monkeypatch):
    _reset_search_cache(monkeypatch)
    assert asyncio.run(search_symbols("   ")) == []


def test_search_symbols_ranks_prefix_matches_first(monkeypatch):
    _reset_search_cache(monkeypatch)
    monkeypatch.setattr(finnhub_fetcher.settings, "FINNHUB_API_KEY", "test-key")

    class _FakeResp:
        def raise_for_status(self):
            pass

        def json(self):
            return {
                "result": [
                    {"symbol": "GOOGL", "description": "ALPHABET INC", "type": "CS"},
                    {"symbol": "AL", "description": "AIR LEASE", "type": "CS"},
                    {"symbol": "AAPL", "description": "APPLE INC", "type": "CS"},
                    {"symbol": "AAPL", "description": "APPLE INC (dup)", "type": "CS"},
                ]
            }

    class _FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def get(self, *args, **kwargs):
            return _FakeResp()

    monkeypatch.setattr(
        finnhub_fetcher.httpx, "AsyncClient", lambda **kw: _FakeClient()
    )

    results = asyncio.run(search_symbols("aa"))
    # AA-prefix match leads; duplicate symbol collapsed; non-matches follow.
    assert [r["symbol"] for r in results] == ["AAPL", "AL", "GOOGL"]
