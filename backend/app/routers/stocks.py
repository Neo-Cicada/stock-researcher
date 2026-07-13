from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.stock import Stock
from app.schemas.stock import StockOut, TickerHistoryOut
from app.services.price_fetcher import fetch_ticker_detail_async

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


@router.get("/{ticker}", response_model=StockOut)
async def get_stock(ticker: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Stock).where(Stock.ticker == ticker.upper()))
    stock = result.scalar_one_or_none()
    if stock is None:
        raise HTTPException(status_code=404, detail="Stock not found")
    return stock
