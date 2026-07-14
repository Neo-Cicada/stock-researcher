from datetime import datetime

from sqlalchemy import DateTime, Float, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class MarketSeason(Base):
    """A single snapshot of overall market mood.

    One row is appended per successful refresh (CNN Fear & Greed + a
    social bullish % derived from ApeWisdom crowd data). The endpoint serves
    the most recent row, so an upstream (CNN) failure falls back to the last
    stored snapshot. All indicator score/rating columns are nullable because
    the CNN payload may omit a sub-indicator.
    """

    __tablename__ = "market_seasons"

    id: Mapped[int] = mapped_column(primary_key=True)

    # Overall Fear & Greed index (0-100 score + textual rating).
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    rating: Mapped[str | None] = mapped_column(String(30), nullable=True)

    # Sub-indicators.
    vix_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    vix_rating: Mapped[str | None] = mapped_column(String(30), nullable=True)
    put_call_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    put_call_rating: Mapped[str | None] = mapped_column(String(30), nullable=True)
    breadth_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    breadth_rating: Mapped[str | None] = mapped_column(String(30), nullable=True)

    # Social bullish % derived from ApeWisdom rank momentum in trending_snapshots.
    social_bullish_pct: Mapped[float | None] = mapped_column(Float, nullable=True)

    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
