"""Five-Petal scorecard: a transparent fundamental model.

Computes four of the five scorecard pillars — Value, Growth, Quality, and
Momentum — from live data (yfinance fundamentals + daily OHLC candles). Each
raw metric is normalised to a 0-100 sub-score via piecewise-linear curves with
finance-sensible breakpoints, and a pillar's score is the mean of whatever
sub-scores are available. The fifth pillar, Sentiment, has no live source
(Reddit crowd data is always mock) and is supplied by the frontend.

Everything here is pure and deterministic so it can be unit-tested without any
network calls (see ``tests/test_scoring.py``).
"""

from __future__ import annotations

# Pillar weights (percent) — mirror the frontend scorecard so the composite
# adds up to 100 once the mock Sentiment pillar (weight 15) is appended.
WEIGHTS = {"val": 20, "grw": 25, "qlt": 20, "mom": 20}


def _lin(x: float, points: list[tuple[float, float]]) -> float:
    """Piecewise-linear map of ``x`` through ascending ``(input, score)`` knots.

    Clamped to the endpoint scores outside the knot range.
    """
    if x <= points[0][0]:
        return points[0][1]
    if x >= points[-1][0]:
        return points[-1][1]
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        if x <= x1:
            t = (x - x0) / (x1 - x0)
            return y0 + t * (y1 - y0)
    return points[-1][1]


def _mean(scores: list[float]) -> float | None:
    return sum(scores) / len(scores) if scores else None


def _num(v) -> float | None:
    """Coerce to a finite float, or None for missing/NaN/non-numeric values."""
    if v is None:
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return f if f == f else None  # NaN check


def _band(score: float, low: str, mid: str, high: str) -> str:
    if score >= 66:
        return high
    if score >= 40:
        return mid
    return low


def _pct(frac: float | None) -> str:
    """Format a fraction (0.624) as a signed percent string (+62.4%)."""
    return f"{frac * 100:+.1f}%" if frac is not None else "—"


# ---- Normalisation curves (ascending metric value -> sub-score) ----

_PE_PTS = [
    (8, 100),
    (12, 90),
    (18, 72),
    (25, 58),
    (40, 40),
    (60, 25),
    (100, 10),
    (200, 3),
]
_PB_PTS = [(0.8, 100), (1.5, 88), (3, 72), (5, 58), (8, 42), (15, 22), (30, 8)]
_DIV_PTS = [(0, 45), (1, 55), (2, 64), (3.5, 74), (5, 82), (8, 90)]

_GRW_PTS = [
    (-0.2, 10),
    (0, 32),
    (0.08, 50),
    (0.15, 62),
    (0.25, 74),
    (0.4, 86),
    (0.6, 95),
]
_PEC_PTS = [(-0.3, 28), (0, 48), (0.1, 60), (0.25, 74), (0.4, 85), (0.6, 93)]

_PM_PTS = [(-0.1, 8), (0, 32), (0.05, 48), (0.1, 60), (0.18, 74), (0.28, 86), (0.4, 94)]
_ROE_PTS = [
    (-0.1, 12),
    (0, 32),
    (0.08, 50),
    (0.15, 64),
    (0.25, 78),
    (0.4, 90),
    (0.6, 96),
]
_DE_PTS = [(0, 95), (25, 86), (50, 78), (100, 64), (180, 48), (300, 30), (500, 15)]

_DMA_PTS = [(-0.15, 18), (-0.05, 38), (0, 52), (0.05, 66), (0.12, 80), (0.2, 90)]
_RSI_PTS = [(25, 20), (35, 34), (45, 48), (55, 62), (65, 76), (75, 84), (85, 80)]
_RNG_PTS = [(0, 15), (0.25, 38), (0.5, 55), (0.7, 70), (0.85, 82), (1, 92)]
_REL_PTS = [(-0.2, 18), (-0.08, 38), (0, 52), (0.08, 66), (0.18, 80), (0.3, 90)]


def _sma(values: list[float], n: int) -> float | None:
    if len(values) < n or n <= 0:
        return None
    return sum(values[-n:]) / n


def _rsi(closes: list[float], n: int = 14) -> float | None:
    """Classic Wilder-style RSI over the last ``n`` deltas (simple average)."""
    if len(closes) < n + 1:
        return None
    gains, losses = 0.0, 0.0
    for prev, cur in zip(closes[-(n + 1) : -1], closes[-n:]):
        d = cur - prev
        if d >= 0:
            gains += d
        else:
            losses -= d
    if losses == 0:
        return 100.0 if gains > 0 else 50.0
    rs = (gains / n) / (losses / n)
    return 100 - 100 / (1 + rs)


def _value_pillar(f: dict) -> dict | None:
    subs: list[float] = []
    inputs: list[dict] = []
    tpe = _num(f.get("trailing_pe"))
    fpe = _num(f.get("forward_pe"))
    pb = _num(f.get("price_to_book"))
    dy = _num(f.get("dividend_yield"))
    if tpe is not None and tpe > 0:
        subs.append(_lin(tpe, _PE_PTS))
        inputs.append({"k": "P/E (TTM)", "v": f"{tpe:.1f}"})
    if fpe is not None and fpe > 0:
        subs.append(_lin(fpe, _PE_PTS))
        inputs.append({"k": "Fwd P/E", "v": f"{fpe:.1f}"})
    if pb is not None and pb > 0:
        subs.append(_lin(pb, _PB_PTS))
        inputs.append({"k": "P/B", "v": f"{pb:.1f}"})
    if dy is not None:
        subs.append(_lin(dy, _DIV_PTS))
        inputs.append({"k": "Div yield", "v": f"{dy:.2f}%"})
    score = _mean(subs)
    if score is None:
        return None
    return _pillar(
        "val",
        "Valuation",
        score,
        inputs,
        _band(
            score,
            "Richly valued vs. fundamentals",
            "Fairly valued on current multiples",
            "Trading at a discount to the multiple",
        ),
    )


def _growth_pillar(f: dict) -> dict | None:
    subs: list[float] = []
    inputs: list[dict] = []
    rev = _num(f.get("revenue_growth"))
    eps = _num(f.get("earnings_growth"))
    tpe = _num(f.get("trailing_pe"))
    fpe = _num(f.get("forward_pe"))
    if rev is not None:
        subs.append(_lin(rev, _GRW_PTS))
        inputs.append({"k": "Revenue YoY", "v": _pct(rev)})
    if eps is not None:
        subs.append(_lin(eps, _GRW_PTS))
        inputs.append({"k": "Earnings YoY", "v": _pct(eps)})
    if tpe is not None and fpe is not None and tpe > 0 and fpe > 0:
        comp = (tpe - fpe) / tpe  # forward cheaper => earnings expected to grow
        subs.append(_lin(comp, _PEC_PTS))
        inputs.append({"k": "P/E compression", "v": _pct(comp)})
    score = _mean(subs)
    if score is None:
        return None
    return _pillar(
        "grw",
        "Growth",
        score,
        inputs,
        _band(
            score,
            "Growth stalling or contracting",
            "Steady, moderate growth",
            "Revenue and earnings compounding fast",
        ),
    )


def _quality_pillar(f: dict) -> dict | None:
    subs: list[float] = []
    inputs: list[dict] = []
    pm = _num(f.get("profit_margins"))
    roe = _num(f.get("return_on_equity"))
    de = _num(f.get("debt_to_equity"))
    if pm is not None:
        subs.append(_lin(pm, _PM_PTS))
        inputs.append({"k": "Profit margin", "v": _pct(pm)})
    if roe is not None:
        subs.append(_lin(roe, _ROE_PTS))
        inputs.append({"k": "ROE", "v": _pct(roe)})
    if de is not None:
        subs.append(_lin(de, _DE_PTS))
        # yfinance reports debt/equity as a percent number (47.1 => 0.47x).
        inputs.append({"k": "Debt / Equity", "v": f"{de / 100:.2f}"})
    score = _mean(subs)
    if score is None:
        return None
    return _pillar(
        "qlt",
        "Quality",
        score,
        inputs,
        _band(
            score,
            "Thin margins or heavy leverage",
            "Adequate profitability",
            "Strong margins and returns on capital",
        ),
    )


def _momentum_pillar(f: dict, candles: list[dict]) -> dict | None:
    closes = [c["close"] for c in candles if _num(c.get("close")) is not None]
    if len(closes) < 15:
        return None
    subs: list[float] = []
    inputs: list[dict] = []
    price = closes[-1]

    sma = _sma(closes, min(50, len(closes)))
    if sma:
        vs = price / sma - 1
        subs.append(_lin(vs, _DMA_PTS))
        inputs.append({"k": "vs 50-DMA", "v": _pct(vs)})

    rsi = _rsi(closes)
    if rsi is not None:
        subs.append(_lin(rsi, _RSI_PTS))
        inputs.append({"k": "RSI (14d)", "v": f"{rsi:.0f}"})

    hi = _num(f.get("fifty_two_week_high"))
    lo = _num(f.get("fifty_two_week_low"))
    if hi is not None and lo is not None and hi > lo:
        pos = max(0.0, min(1.0, (price - lo) / (hi - lo)))
        subs.append(_lin(pos, _RNG_PTS))
        inputs.append({"k": "52W range", "v": f"{pos * 100:.0f}%"})

    rel = price / closes[0] - 1  # change across the loaded window (~3 months)
    subs.append(_lin(rel, _REL_PTS))
    inputs.append({"k": "3-mo change", "v": _pct(rel)})

    score = _mean(subs)
    if score is None:
        return None
    return _pillar(
        "mom",
        "Momentum",
        score,
        inputs,
        _band(
            score,
            "Under downward price pressure",
            "Range-bound, no clear trend",
            "Trending above key moving averages",
        ),
    )


def _pillar(key: str, name: str, score: float, inputs: list[dict], hint: str) -> dict:
    return {
        "key": key,
        "name": name,
        "score": round(score),
        "weight": WEIGHTS[key],
        "hint_text": hint,
        "inputs": inputs,
    }


def compute_scorecard(fundamentals: dict | None, candles: list[dict]) -> dict | None:
    """Build the live scorecard (Value/Growth/Quality/Momentum) or None.

    Returns None when there isn't enough real data to be meaningful — e.g. an
    ETF or junk ticker with no fundamentals — so the frontend falls back to the
    full mock scorecard. Requires at least the Value pillar plus one other.
    """
    f = fundamentals or {}
    pillars = [
        _value_pillar(f),
        _growth_pillar(f),
        _quality_pillar(f),
        _momentum_pillar(f, candles),
    ]
    present = [p for p in pillars if p is not None]
    has_value = pillars[0] is not None
    if not has_value or len(present) < 2:
        return None
    return {"available": True, "pillars": present}
