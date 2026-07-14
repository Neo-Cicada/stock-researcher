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
