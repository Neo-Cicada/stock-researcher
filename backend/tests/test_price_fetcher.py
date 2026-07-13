import numpy as np
import pandas as pd

from app.services import price_fetcher
from app.services.price_fetcher import _fetch_ticker_detail


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
