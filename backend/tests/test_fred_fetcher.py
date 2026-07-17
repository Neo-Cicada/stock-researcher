from datetime import date

from app.services.fred_fetcher import (
    _fomc_events,
    _fred_events_from_release_dates,
    _match_release,
)


def test_match_release_maps_known_indicators():
    assert _match_release("Consumer Price Index") == (
        "CPI · Consumer Price Index",
        "high",
    )
    assert _match_release("Employment Situation")[1] == "high"
    assert _match_release("Producer Price Index")[1] == "medium"


def test_match_release_returns_none_for_noise():
    assert _match_release("Some Obscure Regional Survey") is None
    assert _match_release("") is None


def test_fred_events_filters_by_window_and_curation():
    today = date(2026, 8, 1)
    horizon = date(2026, 9, 15)
    rows = [
        {
            "release_id": 10,
            "release_name": "Consumer Price Index",
            "date": "2026-08-12",
        },
        # Out of window (before today) — dropped.
        {
            "release_id": 10,
            "release_name": "Consumer Price Index",
            "date": "2026-07-11",
        },
        # Out of window (after horizon) — dropped.
        {
            "release_id": 50,
            "release_name": "Employment Situation",
            "date": "2026-10-02",
        },
        # In window but not a curated indicator — dropped.
        {
            "release_id": 999,
            "release_name": "Regional Fed Survey",
            "date": "2026-08-20",
        },
        # Unparseable date — dropped.
        {"release_id": 53, "release_name": "Gross Domestic Product", "date": "n/a"},
        {
            "release_id": 50,
            "release_name": "Employment Situation",
            "date": "2026-09-05",
        },
    ]
    events = _fred_events_from_release_dates(rows, today, horizon)
    labels = {(e["event"], e["time"]) for e in events}
    assert ("CPI · Consumer Price Index", "2026-08-12") in labels
    assert ("Employment Situation · Jobs", "2026-09-05") in labels
    assert len(events) == 2
    # Shape: date-only, US, empty numeric columns.
    cpi = next(e for e in events if e["time"] == "2026-08-12")
    assert cpi["country"] == "US"
    assert cpi["impact"] == "high"
    assert cpi["estimate"] is None and cpi["previous"] is None


def test_fomc_events_within_window():
    events = _fomc_events(date(2026, 7, 1), date(2026, 8, 1))
    assert [e["time"] for e in events] == ["2026-07-29"]
    assert events[0]["event"] == "FOMC Rate Decision"
    assert events[0]["impact"] == "high"


def test_fomc_events_empty_outside_window():
    assert _fomc_events(date(2026, 8, 2), date(2026, 8, 20)) == []
