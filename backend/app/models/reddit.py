from datetime import datetime

from sqlalchemy import DateTime, Index, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class TrendingSnapshot(Base):
    __tablename__ = "trending_snapshots"
    __table_args__ = (
        UniqueConstraint("ticker", "source", "fetched_at", name="uq_ticker_source_ts"),
        Index("ix_trending_snapshots_ticker", "ticker"),
        Index("ix_trending_snapshots_source", "source"),
        Index("ix_trending_snapshots_fetched_at", "fetched_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    ticker: Mapped[str] = mapped_column(String(10))
    name: Mapped[str] = mapped_column(String(200), default="")
    rank: Mapped[int] = mapped_column(default=0)
    mentions: Mapped[int] = mapped_column(default=0)
    upvotes: Mapped[int] = mapped_column(default=0)
    rank_24h_ago: Mapped[int | None] = mapped_column(nullable=True)
    mentions_24h_ago: Mapped[int | None] = mapped_column(nullable=True)
    source: Mapped[str] = mapped_column(String(50))
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
