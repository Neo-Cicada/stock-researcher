import numpy as np
import pandas as pd

from app.services import price_fetcher
from app.services.price_fetcher import (
    _close_series,
    _download_prices,
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


# ---- Close-column normalisation / batch download -----------------------------

_DAYS = pd.to_datetime(["2026-07-13", "2026-07-14"])


def _flat_frame(closes: list[float]) -> pd.DataFrame:
    """Single-ticker frame with flat columns (older yfinance layout)."""
    return pd.DataFrame({"Open": closes, "Close": closes}, index=_DAYS)


def _multi_frame(closes: dict[str, list[float]]) -> pd.DataFrame:
    """MultiIndex (field, ticker) frame — what yf.download returns for a list."""
    tickers = list(closes)
    columns = pd.MultiIndex.from_product([["Close", "Open"], tickers])
    values = [closes[t] for t in tickers] * 2
    return pd.DataFrame(dict(zip(columns, values)), index=_DAYS, columns=columns)


def test_close_series_flat_single_ticker():
    got = _close_series(_flat_frame([10.0, 11.0]), "NVDA")
    assert list(got) == [10.0, 11.0]


def test_close_series_single_ticker_multiindex():
    """A one-ticker download can still come back MultiIndexed; not a Series."""
    got = _close_series(_multi_frame({"NVDA": [10.0, 11.0]}), "NVDA")
    assert list(got) == [10.0, 11.0]
    assert float(got.iloc[-1]) == 11.0  # would raise TypeError on a DataFrame


def test_close_series_picks_the_requested_ticker():
    frame = _multi_frame({"NVDA": [10.0, 11.0], "AMD": [5.0, 6.0]})
    assert list(_close_series(frame, "AMD")) == [5.0, 6.0]


def test_close_series_drops_nan_and_missing_columns():
    frame = _multi_frame({"NVDA": [np.nan, 11.0]})
    assert list(_close_series(frame, "NVDA")) == [11.0]
    # Unknown ticker in a multi-column frame -> None, not a stray column.
    frame2 = _multi_frame({"NVDA": [10.0, 11.0], "AMD": [5.0, 6.0]})
    assert _close_series(frame2, "GME") is None
    assert _close_series(pd.DataFrame({"Open": [1.0]}), "NVDA") is None


def _patch_download(monkeypatch, frame: pd.DataFrame) -> None:
    monkeypatch.setattr(price_fetcher.yf, "download", lambda *a, **k: frame)
    monkeypatch.setattr(price_fetcher, "_enrich_extended", lambda results: None)


def test_download_prices_single_ticker_multiindex_frame(monkeypatch):
    """Regression: single-ticker MultiIndex Close used to raise TypeError."""
    _patch_download(monkeypatch, _multi_frame({"NVDA": [100.0, 110.0]}))
    assert _download_prices(["NVDA"]) == {
        "NVDA": {"price": 110.0, "previous_close": 100.0, "day_change_pct": 10.0}
    }


def test_download_prices_single_ticker_flat_frame(monkeypatch):
    _patch_download(monkeypatch, _flat_frame([100.0, 110.0]))
    assert _download_prices(["NVDA"]) == {
        "NVDA": {"price": 110.0, "previous_close": 100.0, "day_change_pct": 10.0}
    }


def test_download_prices_multi_ticker_and_single_close(monkeypatch):
    frame = _multi_frame({"NVDA": [100.0, 110.0], "AMD": [np.nan, 6.0]})
    _patch_download(monkeypatch, frame)
    got = _download_prices(["NVDA", "AMD", "JUNK"])
    assert got["NVDA"]["day_change_pct"] == 10.0
    # Only one valid close -> flat row, no fake day change.
    assert got["AMD"] == {
        "price": 6.0,
        "previous_close": 6.0,
        "day_change_pct": 0.0,
    }
    assert "JUNK" not in got  # no column at all -> skipped, not an exception


def test_download_prices_zero_previous_close(monkeypatch):
    """A 0.00 previous close must not raise ZeroDivisionError."""
    _patch_download(monkeypatch, _multi_frame({"NVDA": [0.0, 110.0]}))
    assert _download_prices(["NVDA"])["NVDA"]["day_change_pct"] == 0.0


# ---- multitasking thread reaping ------------------------------------------
#
# yf.download(threads=True) spawns one thread per ticker via `multitasking`,
# which appends every one to a module-level list it never prunes ("Completed
# tasks remain in this list until program termination"). Left alone that
# stranded ~2 dead Thread objects per ticker per 5-minute cycle — measured at
# ~90 MB/hour in production, which walked the 1 GB container into the OOM
# killer roughly every eleven hours.


class _FakeThread:
    def __init__(self, alive: bool):
        self._alive = alive

    def is_alive(self) -> bool:
        return self._alive


def test_reap_finished_threads_drops_dead_keeps_running(monkeypatch):
    live = _FakeThread(True)
    registry = [_FakeThread(False), live, _FakeThread(False)]
    monkeypatch.setattr(
        price_fetcher.multitasking, "get_list_of_tasks", lambda: registry
    )

    price_fetcher._reap_finished_threads()

    # Pruned in place (the accessor hands back the real list, so rebinding a
    # local would leave the library still holding the dead threads).
    assert registry == [live]


def test_reap_finished_threads_survives_registry_errors(monkeypatch):
    def _boom():
        raise RuntimeError("multitasking internals changed")

    monkeypatch.setattr(price_fetcher.multitasking, "get_list_of_tasks", _boom)
    # Bookkeeping must never break a price fetch.
    price_fetcher._reap_finished_threads()


def test_download_prices_reaps_threads(monkeypatch):
    """The registry must not grow across repeated fetch cycles."""
    registry = []

    def _fake_download(tickers, *a, **k):
        # Stand in for multitasking: one finished worker thread per ticker.
        registry.extend(_FakeThread(False) for _ in tickers)
        return _multi_frame({"NVDA": [100.0, 110.0]})

    monkeypatch.setattr(price_fetcher.yf, "download", _fake_download)
    monkeypatch.setattr(price_fetcher, "_enrich_extended", lambda results: None)
    monkeypatch.setattr(
        price_fetcher.multitasking, "get_list_of_tasks", lambda: registry
    )

    for _ in range(5):
        _download_prices(["NVDA"])

    assert registry == []
