from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.stock import Stock
from app.schemas.stock import StockOut

router = APIRouter(prefix="/api/stocks", tags=["stocks"])


@router.get("/", response_model=list[StockOut])
async def list_stocks(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Stock).order_by(Stock.ticker))
    return result.scalars().all()


@router.get("/{ticker}", response_model=StockOut)
async def get_stock(ticker: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Stock).where(Stock.ticker == ticker.upper())
    )
    stock = result.scalar_one_or_none()
    if stock is None:
        raise HTTPException(status_code=404, detail="Stock not found")
    return stock
