from datetime import datetime

from sqlalchemy import DateTime, Float, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class StockPrice(Base):
    __tablename__ = "stock_prices"

    id: Mapped[int] = mapped_column(primary_key=True)
    ticker: Mapped[str] = mapped_column(String(10), unique=True, index=True)
    price: Mapped[float] = mapped_column(Float)
    previous_close: Mapped[float] = mapped_column(Float)
    day_change_pct: Mapped[float] = mapped_column(Float)
    # Extended-hours (pre-/post-market) last trade, when the market is in a
    # pre- or post-market session. All nullable: null during regular hours or
    # when yfinance has no extended-hours data for the ticker.
    extended_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    extended_change_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    # Session of the latest extended trade: "PRE", "POST" (or null / "REGULAR").
    market_state: Mapped[str | None] = mapped_column(String(10), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
