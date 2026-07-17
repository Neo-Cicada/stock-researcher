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
    profit_margins: float | None = None
    return_on_equity: float | None = None
    debt_to_equity: float | None = None
    revenue_growth: float | None = None
    earnings_growth: float | None = None


class PillarInputOut(BaseModel):
    k: str
    v: str


class PillarOut(BaseModel):
    key: str
    name: str
    score: int
    weight: int
    hint_text: str
    inputs: list[PillarInputOut] = []


class ScorecardOut(BaseModel):
    """Live Five-Petal scorecard pillars (Value/Growth/Quality/Momentum).

    The Sentiment pillar has no live source and is added by the frontend.
    """

    available: bool
    pillars: list[PillarOut] = []


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
    scorecard: ScorecardOut | None = None


class TickerNewsItem(BaseModel):
    title: str
    summary: str = ""
    source: str = ""
    url: str
    published_at: int | None = None


class SymbolSearchItem(BaseModel):
    symbol: str
    description: str = ""
    type: str = ""
