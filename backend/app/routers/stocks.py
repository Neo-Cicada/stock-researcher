from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.stock import Stock
from app.schemas.institutional import InstitutionalOwnershipOut
from app.schemas.stock import StockOut, TickerHistoryOut, TickerNewsItem
from app.services.finnhub_fetcher import get_ticker_news
from app.services.price_fetcher import (
    fetch_institutional_async,
    fetch_ticker_detail_async,
)

router = APIRouter(prefix="/api/stocks", tags=["stocks"])


@router.get("/", response_model=list[StockOut])
async def list_stocks(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Stock).order_by(Stock.ticker))
    return result.scalars().all()


@router.get("/{ticker}/history", response_model=TickerHistoryOut)
async def get_stock_history(ticker: str):
    """Daily OHLC candles + key fundamentals for a ticker, live from yfinance.

    Returns ``available=False`` (rather than an error) for unknown/delisted
    tickers or when yfinance is unreachable, so the frontend can fall back to
    mock data gracefully.
    """
    detail = await fetch_ticker_detail_async(ticker)
    if detail is None:
        return TickerHistoryOut(ticker=ticker.upper(), available=False)
    return TickerHistoryOut(available=True, **detail)


@router.get("/{ticker}/news", response_model=list[TickerNewsItem])
async def get_stock_news(ticker: str, name: str | None = None):
    """Recent headlines for a ticker, live from Finnhub company news.

    The optional ``name`` hint (the company's real name) is used only to rank
    headlines that actually name the company ahead of tangentially-tagged ones.
    Returns an empty list (not an error) when Finnhub is unreachable, no key is
    configured, or the ticker has no coverage, so the frontend can fall back to
    a quiet "no recent headlines" note.
    """
    return await get_ticker_news(ticker, name)


@router.get("/{ticker}/institutional", response_model=InstitutionalOwnershipOut)
async def get_stock_institutional(ticker: str):
    """Institutional-ownership summary + top holders for a ticker, from Yahoo
    Finance (via yfinance — free, no key).

    Returns ``available=False`` (not an error) when Yahoo is unreachable or the
    ticker has no institutional coverage, so the frontend can fall back to
    deterministic mock data.
    """
    data = await fetch_institutional_async(ticker)
    if data is None:
        return InstitutionalOwnershipOut(ticker=ticker.upper(), available=False)
    return InstitutionalOwnershipOut(available=True, **data)


@router.get("/{ticker}", response_model=StockOut)
async def get_stock(ticker: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Stock).where(Stock.ticker == ticker.upper()))
    stock = result.scalar_one_or_none()
    if stock is None:
        raise HTTPException(status_code=404, detail="Stock not found")
    return stock
