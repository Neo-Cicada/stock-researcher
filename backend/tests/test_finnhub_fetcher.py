import asyncio

from app.services import finnhub_fetcher
from app.services.finnhub_fetcher import _to_theme, get_todays_themes


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
