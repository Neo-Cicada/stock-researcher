from datetime import datetime

from pydantic import BaseModel


class StockOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    ticker: str
    name: str
    sector: str | None = None
    created_at: datetime
