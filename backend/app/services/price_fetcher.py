import asyncio
import logging
from datetime import UTC, datetime
from functools import partial

import yfinance as yf
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.price import StockPrice

logger = logging.getLogger(__name__)

BATCH_SIZE = 50


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
