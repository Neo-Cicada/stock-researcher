import numpy as np
import pandas as pd

from app.services import price_fetcher
from app.services.price_fetcher import (
    _fetch_ticker_detail,
    _institutional_from_frames,
    _session_for_et,
    _session_for_timestamp,
)


class _FakeTicker:
    """Stand-in for yf.Ticker whose .history() returns a prebuilt DataFrame."""

    def __init__(self, hist: pd.DataFrame):
        self._hist = hist

    def history(self, *args, **kwargs) -> pd.DataFrame:
        return self._hist


def _patch_ticker(monkeypatch, hist: pd.DataFrame) -> None:
    monkeypatch.setattr(price_fetcher.yf, "Ticker", lambda ticker: _FakeTicker(hist))


def test_fetch_ticker_detail_empty_history_returns_none(monkeypatch):
    """Empty-history guard: an empty DataFrame yields None (fall back to mock)."""
    _patch_ticker(monkeypatch, pd.DataFrame())

    assert _fetch_ticker_detail("FAKE") is None


def test_fetch_ticker_detail_all_nan_returns_none(monkeypatch):
    """NaN guard: all-NaN Close rows are skipped, leaving < 2 candles -> None."""
    index = pd.to_datetime(["2026-07-13", "2026-07-14"])
    hist = pd.DataFrame(
        {
            "Open": [np.nan, np.nan],
            "High": [np.nan, np.nan],
            "Low": [np.nan, np.nan],
            "Close": [np.nan, np.nan],
            "Volume": [np.nan, np.nan],
        },
        index=index,
    )
    _patch_ticker(monkeypatch, hist)

    assert _fetch_ticker_detail("FAKE") is None


def test_institutional_from_frames_maps_yfinance_shapes():
    """major_holders + institutional_holders frames -> normalized ownership."""
    major = pd.DataFrame(
        {"Value": [0.70754, 7509.0, 0.03984]},
        index=["institutionsPercentHeld", "institutionsCount", "insidersPercentHeld"],
    )
    holders = pd.DataFrame(
        {
            "Holder": ["Blackrock Inc.", "Vanguard", ""],
            "Shares": [1_925_533_174, 1_538_550_382, np.nan],
            "Value": [4.09e11, 3.26e11, np.nan],
            "pctChange": [-0.0094, 1.0, np.nan],
        }
    )
    data = _institutional_from_frames("nvda", major, holders)
    assert data["ticker"] == "NVDA"
    assert data["ownership_pct"] == 70.75  # fraction -> percent
    assert data["institutions_count"] == 7509
    # Blank-name row is skipped; pctChange scaled to percent.
    assert [h["name"] for h in data["holders"]] == ["Blackrock Inc.", "Vanguard"]
    assert data["holders"][0]["change_pct"] == -0.94
    assert data["total_shares"] == 1_925_533_174 + 1_538_550_382


def test_institutional_from_frames_none_when_empty():
    assert _institutional_from_frames("nvda", None, pd.DataFrame()) is None


# ---- Extended-hours session classification ----------------------------------


def test_session_for_et_boundaries():
    # Monday (weekday 0)
    assert _session_for_et(0, 4, 0) == "PRE"  # 04:00 pre-market open
    assert _session_for_et(0, 9, 29) == "PRE"
    assert _session_for_et(0, 9, 30) == "REGULAR"  # bell
    assert _session_for_et(0, 15, 59) == "REGULAR"
    assert _session_for_et(0, 16, 0) == "POST"  # close -> after hours
    assert _session_for_et(0, 19, 59) == "POST"
    assert _session_for_et(0, 20, 0) == "CLOSED"  # after-hours ends
    assert _session_for_et(0, 3, 59) == "CLOSED"  # before pre-market
    assert _session_for_et(0, 2, 0) == "CLOSED"


def test_session_for_et_weekend_always_closed():
    assert _session_for_et(5, 8, 0) == "CLOSED"  # Saturday pre-market hour
    assert _session_for_et(6, 10, 0) == "CLOSED"  # Sunday regular hour


def test_session_for_timestamp_converts_utc_to_eastern():
    # 12:00 UTC on a Monday = 08:00 America/New_York (EDT) -> pre-market.
    ts = pd.Timestamp("2026-07-13 12:00", tz="UTC")
    assert _session_for_timestamp(ts) == "PRE"
    # 20:00 UTC = 16:00 EDT -> post-market.
    ts2 = pd.Timestamp("2026-07-13 20:00", tz="UTC")
    assert _session_for_timestamp(ts2) == "POST"
