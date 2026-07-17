"""Unit tests for the Five-Petal fundamental scorecard (pure, no network)."""

from app.services.scoring import (
    WEIGHTS,
    _lin,
    _rsi,
    compute_scorecard,
)


def _rising_candles(n: int = 63, start: float = 100.0, step: float = 1.0) -> list[dict]:
    """A steadily rising close series (strong momentum)."""
    return [{"close": start + i * step} for i in range(n)]


def _flat_candles(n: int = 63, price: float = 100.0) -> list[dict]:
    return [{"close": price} for _ in range(n)]


# ---- _lin (piecewise-linear normaliser) ----


def test_lin_clamps_below_and_above_range():
    pts = [(10, 100), (40, 40), (100, 5)]
    assert _lin(0, pts) == 100  # below first knot -> first score
    assert _lin(500, pts) == 5  # above last knot -> last score


def test_lin_interpolates_midpoint():
    pts = [(0, 0), (10, 100)]
    assert _lin(5, pts) == 50


# ---- _rsi ----


def test_rsi_all_gains_is_100():
    closes = [100 + i for i in range(20)]
    assert _rsi(closes) == 100.0


def test_rsi_insufficient_data_returns_none():
    assert _rsi([1, 2, 3]) is None


# ---- compute_scorecard: happy path ----


def _quality_fundamentals() -> dict:
    """A cheap, fast-growing, high-quality profile -> high pillar scores."""
    return {
        "trailing_pe": 11.0,
        "forward_pe": 9.0,
        "price_to_book": 1.2,
        "dividend_yield": 2.0,
        "revenue_growth": 0.42,
        "earnings_growth": 0.5,
        "profit_margins": 0.3,
        "return_on_equity": 0.45,
        "debt_to_equity": 20.0,
        "fifty_two_week_high": 130.0,
        "fifty_two_week_low": 90.0,
    }


def test_scorecard_returns_four_pillars_in_order():
    card = compute_scorecard(_quality_fundamentals(), _rising_candles())
    assert card is not None
    assert card["available"] is True
    keys = [p["key"] for p in card["pillars"]]
    assert keys == ["val", "grw", "qlt", "mom"]


def test_scorecard_weights_match_constants():
    card = compute_scorecard(_quality_fundamentals(), _rising_candles())
    for p in card["pillars"]:
        assert p["weight"] == WEIGHTS[p["key"]]


def test_scorecard_scores_in_range_and_high_quality_scores_high():
    card = compute_scorecard(_quality_fundamentals(), _rising_candles())
    by_key = {p["key"]: p for p in card["pillars"]}
    for p in card["pillars"]:
        assert 0 <= p["score"] <= 100
    # Cheap multiples, strong growth, fat margins, uptrend -> all comfortably high.
    assert by_key["val"]["score"] >= 70
    assert by_key["grw"]["score"] >= 80
    assert by_key["qlt"]["score"] >= 80
    assert by_key["mom"]["score"] >= 70


def test_expensive_lowquality_scores_low():
    f = {
        "trailing_pe": 120.0,
        "forward_pe": 110.0,
        "price_to_book": 25.0,
        "revenue_growth": -0.1,
        "earnings_growth": -0.2,
        "profit_margins": -0.05,
        "return_on_equity": -0.08,
        "debt_to_equity": 400.0,
        "fifty_two_week_high": 200.0,
        "fifty_two_week_low": 150.0,
    }
    # Falling price near the 52w low -> weak momentum too.
    falling = [{"close": 200 - i} for i in range(63)]
    card = compute_scorecard(f, falling)
    by_key = {p["key"]: p for p in card["pillars"]}
    assert by_key["val"]["score"] <= 30
    assert by_key["grw"]["score"] <= 35
    assert by_key["qlt"]["score"] <= 30
    assert by_key["mom"]["score"] <= 40


def test_pillar_inputs_are_populated():
    card = compute_scorecard(_quality_fundamentals(), _rising_candles())
    by_key = {p["key"]: p for p in card["pillars"]}
    assert any(i["k"] == "P/E (TTM)" for i in by_key["val"]["inputs"])
    assert any(i["k"] == "Revenue YoY" for i in by_key["grw"]["inputs"])
    assert any(i["k"] == "ROE" for i in by_key["qlt"]["inputs"])
    assert any(i["k"] == "RSI (14d)" for i in by_key["mom"]["inputs"])


# ---- compute_scorecard: degradation ----


def test_no_fundamentals_returns_none():
    # An ETF/junk ticker: no fundamentals at all -> fall back to mock.
    assert compute_scorecard(None, _rising_candles()) is None
    assert compute_scorecard({}, _rising_candles()) is None


def test_value_required_for_scorecard():
    # Momentum alone (no value multiples) is not enough to publish a scorecard.
    f = {"fifty_two_week_high": 130.0, "fifty_two_week_low": 90.0}
    assert compute_scorecard(f, _rising_candles()) is None


def test_value_plus_one_other_is_enough():
    f = {"trailing_pe": 15.0, "profit_margins": 0.2}
    card = compute_scorecard(f, [])  # no candles -> momentum absent
    assert card is not None
    keys = [p["key"] for p in card["pillars"]]
    assert "val" in keys and "qlt" in keys and "mom" not in keys


def test_nan_and_bad_values_are_ignored():
    f = {
        "trailing_pe": float("nan"),
        "forward_pe": 0.0,  # non-positive -> skipped
        "price_to_book": 2.0,
        "profit_margins": 0.15,
    }
    card = compute_scorecard(f, [])
    by_key = {p["key"]: p for p in card["pillars"]}
    # Only P/B fed value; NaN P/E and zero fwd P/E dropped, but pillar still valid.
    val_inputs = {i["k"] for i in by_key["val"]["inputs"]}
    assert val_inputs == {"P/B"}
