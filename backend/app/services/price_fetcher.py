import asyncio
import logging
import time
from datetime import UTC, datetime
from functools import partial

import yfinance as yf
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.price import StockPrice

logger = logging.getLogger(__name__)

BATCH_SIZE = 50

# In-process TTL cache for single-ticker detail (ticker -> (expires_at, payload)).
DETAIL_CACHE_TTL = 600  # 10 minutes
_detail_cache: dict[str, tuple[float, dict | None]] = {}


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
