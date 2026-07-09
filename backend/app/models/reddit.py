from datetime import datetime

from sqlalchemy import (
    BigInteger,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RedditPost(Base):
    __tablename__ = "reddit_posts"

    id: Mapped[int] = mapped_column(primary_key=True)
    reddit_id: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    subreddit: Mapped[str] = mapped_column(String(50), index=True)
    title: Mapped[str] = mapped_column(Text)
    selftext: Mapped[str] = mapped_column(Text, default="")
    author: Mapped[str] = mapped_column(String(100))
    url: Mapped[str] = mapped_column(Text)
    score: Mapped[int] = mapped_column(default=0)
    num_comments: Mapped[int] = mapped_column(default=0)
    created_utc: Mapped[datetime] = mapped_column()
    fetched_at: Mapped[datetime] = mapped_column(server_default=func.now())

    mentions: Mapped[list["StockMention"]] = relationship(
        back_populates="post", cascade="all, delete-orphan"
    )


class StockMention(Base):
    __tablename__ = "stock_mentions"
    __table_args__ = (
        UniqueConstraint("post_id", "ticker", name="uq_post_ticker"),
        Index("ix_stock_mentions_ticker", "ticker"),
        Index("ix_stock_mentions_subreddit", "subreddit"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    post_id: Mapped[int] = mapped_column(
        ForeignKey("reddit_posts.id", ondelete="CASCADE")
    )
    ticker: Mapped[str] = mapped_column(String(10))
    subreddit: Mapped[str] = mapped_column(String(50))
    mentioned_at: Mapped[datetime] = mapped_column()
    score: Mapped[int] = mapped_column(BigInteger, default=0)

    post: Mapped["RedditPost"] = relationship(back_populates="mentions")
