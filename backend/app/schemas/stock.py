from datetime import datetime

from pydantic import BaseModel


class StockOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    ticker: str
    name: str
    sector: str | None = None
    created_at: datetime


class CandleOut(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int


class TickerFundamentals(BaseModel):
    market_cap: float | None = None
    trailing_pe: float | None = None
    forward_pe: float | None = None
    price_to_book: float | None = None
    dividend_yield: float | None = None
    fifty_two_week_high: float | None = None
    fifty_two_week_low: float | None = None
    beta: float | None = None


class TickerHistoryOut(BaseModel):
    ticker: str
    available: bool
    name: str | None = None
    currency: str | None = None
    price: float | None = None
    previous_close: float | None = None
    day_change_pct: float | None = None
    candles: list[CandleOut] = []
    fundamentals: TickerFundamentals | None = None


class TickerNewsItem(BaseModel):
    title: str
    summary: str = ""
    source: str = ""
    url: str
    published_at: int | None = None
