from datetime import datetime

from pydantic import BaseModel


class SubIndicator(BaseModel):
    score: float | None = None
    rating: str | None = None


class MarketSeasonOut(BaseModel):
    available: bool = True
    score: float | None = None
    rating: str | None = None
    vix: SubIndicator = SubIndicator()
    put_call: SubIndicator = SubIndicator()
    breadth: SubIndicator = SubIndicator()
    social_bullish_pct: float | None = None
    fetched_at: datetime | None = None


class ThemeOut(BaseModel):
    title: str
    summary: str = ""
    source: str = ""
    url: str = ""
    tickers: list[str] = []
    published_at: int | None = None


class EconomicEventOut(BaseModel):
    event: str
    country: str = ""
    time: str = ""
    impact: str = ""
    actual: float | None = None
    estimate: float | None = None
    previous: float | None = None
    unit: str = ""


class EarningsEventOut(BaseModel):
    symbol: str
    date: str = ""
    hour: str = ""
    eps_estimate: float | None = None
    eps_actual: float | None = None
    revenue_estimate: float | None = None
    revenue_actual: float | None = None
