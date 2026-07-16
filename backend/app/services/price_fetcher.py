import asyncio
import logging
import time
from datetime import UTC, datetime
from functools import partial

import yfinance as yf
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.price import StockPrice
from app.services.scoring import compute_scorecard

logger = logging.getLogger(__name__)

# ApeWisdom trending data feeds us plenty of junk/delisted symbols (WFH, FI, OG,
# …), and yfinance logs a noisy "possibly delisted; no price data found" ERROR
# for each one. We already detect missing data and fall back gracefully, so
# those messages are pure log noise — quiet the yfinance logger above ERROR.
logging.getLogger("yfinance").setLevel(logging.CRITICAL)

BATCH_SIZE = 50

# In-process TTL cache for single-ticker detail (ticker -> (expires_at, payload)).
DETAIL_CACHE_TTL = 600  # 10 minutes
_detail_cache: dict[str, tuple[float, dict | None]] = {}

# Institutional ownership changes only quarterly (13F/N-PORT), so cache longer.
INSTITUTIONAL_CACHE_TTL = 3600  # 1 hour
_institutional_cache: dict[str, tuple[float, dict | None]] = {}
MAX_HOLDERS = 8


def _download_prices(tickers: list[str]) -> dict[str, dict]:
    """Synchronous yfinance download. Run in executor."""
    if not tickers:
        return {}

    results: dict[str, dict] = {}

    for i in range(0, len(tickers), BATCH_SIZE):
        batch = tickers[i : i + BATCH_SIZE]
        try:
            data = yf.download(
                batch,
                period="5d",
                interval="1d",
                progress=False,
                threads=True,
            )
            if data.empty:
                continue

            # yf.download returns MultiIndex columns when multiple tickers
            if len(batch) == 1:
                ticker = batch[0]
                close_col = data["Close"]
                if len(close_col.dropna()) >= 2:
                    last_close = float(close_col.dropna().iloc[-1])
                    prev_close = float(close_col.dropna().iloc[-2])
                    pct = ((last_close - prev_close) / prev_close) * 100
                    results[ticker] = {
                        "price": round(last_close, 2),
                        "previous_close": round(prev_close, 2),
                        "day_change_pct": round(pct, 2),
                    }
                elif len(close_col.dropna()) == 1:
                    last_close = float(close_col.dropna().iloc[-1])
                    results[ticker] = {
                        "price": round(last_close, 2),
                        "previous_close": round(last_close, 2),
                        "day_change_pct": 0.0,
                    }
            else:
                for ticker in batch:
                    try:
                        close_col = data["Close"][ticker]
                        valid = close_col.dropna()
                        if len(valid) >= 2:
                            last_close = float(valid.iloc[-1])
                            prev_close = float(valid.iloc[-2])
                            pct = ((last_close - prev_close) / prev_close) * 100
                            results[ticker] = {
                                "price": round(last_close, 2),
                                "previous_close": round(prev_close, 2),
                                "day_change_pct": round(pct, 2),
                            }
                        elif len(valid) == 1:
                            last_close = float(valid.iloc[-1])
                            results[ticker] = {
                                "price": round(last_close, 2),
                                "previous_close": round(last_close, 2),
                                "day_change_pct": 0.0,
                            }
                    except (KeyError, IndexError):
                        continue
        except Exception:
            logger.exception(
                "yfinance batch download failed for %d tickers", len(batch)
            )

    return results


async def fetch_prices_async(db: AsyncSession, tickers: list[str]) -> int:
    """Fetch prices for tickers via yfinance and upsert into stock_prices."""
    if not tickers:
        return 0

    loop = asyncio.get_event_loop()
    prices = await loop.run_in_executor(None, partial(_download_prices, tickers))

    if not prices:
        return 0

    now = datetime.now(UTC)
    count = 0

    for ticker, data in prices.items():
        stmt = select(StockPrice).where(StockPrice.ticker == ticker)
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            existing.price = data["price"]
            existing.previous_close = data["previous_close"]
            existing.day_change_pct = data["day_change_pct"]
            existing.updated_at = now
        else:
            db.add(
                StockPrice(
                    ticker=ticker,
                    price=data["price"],
                    previous_close=data["previous_close"],
                    day_change_pct=data["day_change_pct"],
                    updated_at=now,
                )
            )
        count += 1

    await db.commit()
    return count


def _fetch_ticker_detail(ticker: str) -> dict | None:
    """Synchronous single-ticker detail fetch via yfinance. Run in executor.

    Returns None on any failure or when the ticker has no history (unknown /
    delisted symbol), so the caller can fall back to mock data gracefully.
    """
    try:
        tk = yf.Ticker(ticker)
        hist = tk.history(period="3mo", interval="1d")
        if hist.empty:
            return None

        candles: list[dict] = []
        for idx, row in hist.iterrows():
            close = row.get("Close")
            if close is None or close != close:  # skip NaN rows
                continue
            vol = row["Volume"]
            candles.append(
                {
                    "date": idx.date().isoformat(),
                    "open": round(float(row["Open"]), 2),
                    "high": round(float(row["High"]), 2),
                    "low": round(float(row["Low"]), 2),
                    "close": round(float(close), 2),
                    "volume": int(vol) if vol == vol else 0,  # NaN check
                }
            )

        if len(candles) < 2:
            return None

        price = candles[-1]["close"]
        previous_close = candles[-2]["close"]
        day_change_pct = (
            round((price - previous_close) / previous_close * 100, 2)
            if previous_close
            else 0.0
        )

        # .info can be slow and occasionally raises or returns a partial dict.
        try:
            info = tk.info or {}
        except Exception:
            info = {}

        fundamentals = {
            "market_cap": info.get("marketCap"),
            "trailing_pe": info.get("trailingPE"),
            "forward_pe": info.get("forwardPE"),
            "price_to_book": info.get("priceToBook"),
            "dividend_yield": info.get("dividendYield"),
            "fifty_two_week_high": info.get("fiftyTwoWeekHigh"),
            "fifty_two_week_low": info.get("fiftyTwoWeekLow"),
            "beta": info.get("beta"),
            # Feed the Growth + Quality scorecard pillars (see scoring.py).
            "profit_margins": info.get("profitMargins"),
            "return_on_equity": info.get("returnOnEquity"),
            "debt_to_equity": info.get("debtToEquity"),
            "revenue_growth": info.get("revenueGrowth"),
            "earnings_growth": info.get("earningsGrowth"),
        }

        return {
            "ticker": ticker,
            "name": info.get("longName") or info.get("shortName"),
            "currency": info.get("currency"),
            "price": price,
            "previous_close": previous_close,
            "day_change_pct": day_change_pct,
            "candles": candles,
            "fundamentals": fundamentals,
            # Transparent fundamental scorecard (None -> frontend uses mock).
            "scorecard": compute_scorecard(fundamentals, candles),
        }
    except Exception:
        logger.exception("yfinance detail fetch failed for %s", ticker)
        return None


async def fetch_ticker_detail_async(ticker: str) -> dict | None:
    """Fetch single-ticker OHLC history + fundamentals, cached for 10 minutes."""
    ticker = ticker.upper()
    now = time.monotonic()

    cached = _detail_cache.get(ticker)
    if cached and cached[0] > now:
        return cached[1]

    loop = asyncio.get_event_loop()
    payload = await loop.run_in_executor(None, partial(_fetch_ticker_detail, ticker))

    _detail_cache[ticker] = (now + DETAIL_CACHE_TTL, payload)
    return payload


def _num(value) -> float | None:
    """Coerce a pandas/py value to float, or ``None`` for missing/NaN."""
    if value is None:
        return None
    try:
        f = float(value)
    except (TypeError, ValueError):
        return None
    return f if f == f else None  # NaN != NaN


def _institutional_from_frames(ticker: str, major, holders) -> dict | None:
    """Build the ownership payload from yfinance ``major_holders`` /
    ``institutional_holders`` frames. Pure (no I/O) so it is unit-testable.

    ``major`` is a DataFrame indexed by a ``Breakdown`` label with a ``Value``
    column; ``holders`` is a DataFrame with ``Holder`` / ``Shares`` / ``Value``
    / ``pctChange`` columns. Either may be ``None``/empty. Returns ``None`` when
    there is nothing usable, so the caller can fall back to mock.
    """
    ownership_pct = None
    institutions_count = None
    if major is not None and getattr(major, "empty", True) is False:
        try:
            pct = _num(major.loc["institutionsPercentHeld", "Value"])
            ownership_pct = round(pct * 100, 2) if pct is not None else None
        except (KeyError, TypeError):
            pass
        try:
            ic = _num(major.loc["institutionsCount", "Value"])
            institutions_count = int(ic) if ic is not None else None
        except (KeyError, TypeError):
            pass

    holder_list: list[dict] = []
    if holders is not None and getattr(holders, "empty", True) is False:
        for _, row in holders.iterrows():
            name = str(row.get("Holder") or "").strip()
            if not name:
                continue
            shares = _num(row.get("Shares"))
            change = _num(row.get("pctChange"))
            # yfinance reports pctChange as a fraction (0.02 = +2%).
            change_pct = round(change * 100, 2) if change is not None else None
            holder_list.append(
                {
                    "name": name,
                    "shares": int(shares) if shares is not None else None,
                    "value": _num(row.get("Value")),
                    "change_pct": change_pct,
                }
            )
    holder_list = holder_list[:MAX_HOLDERS]

    if not holder_list and ownership_pct is None:
        return None

    total_shares = sum(h["shares"] for h in holder_list if h["shares"]) or None
    return {
        "ticker": ticker.upper(),
        "ownership_pct": ownership_pct,
        "institutions_count": institutions_count,
        "total_shares": total_shares,
        "holders": holder_list,
    }


def _fetch_institutional(ticker: str) -> dict | None:
    """Synchronous institutional-ownership fetch via yfinance. Run in executor.

    Pulls top institutional holders + the institutional-ownership summary from
    Yahoo Finance (free, no key). Returns ``None`` on any failure or when the
    ticker has no coverage, so the caller can fall back to mock.
    """
    try:
        tk = yf.Ticker(ticker)
        return _institutional_from_frames(
            ticker, tk.major_holders, tk.institutional_holders
        )
    except Exception:
        logger.exception("yfinance institutional fetch failed for %s", ticker)
        return None


async def fetch_institutional_async(ticker: str) -> dict | None:
    """Fetch institutional ownership + top holders, cached for 1 hour."""
    ticker = ticker.upper()
    now = time.monotonic()

    cached = _institutional_cache.get(ticker)
    if cached and cached[0] > now:
        return cached[1]

    loop = asyncio.get_event_loop()
    payload = await loop.run_in_executor(None, partial(_fetch_institutional, ticker))

    _institutional_cache[ticker] = (now + INSTITUTIONAL_CACHE_TTL, payload)
    return payload
