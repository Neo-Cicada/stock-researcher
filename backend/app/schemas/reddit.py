from datetime import datetime

from pydantic import BaseModel


class StockMentionOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    ticker: str
    subreddit: str
    mentioned_at: datetime
    score: int
    post_title: str | None = None


class TrendingTickerOut(BaseModel):
    ticker: str
    mention_count: int
    total_score: int
    subreddits: list[str]


class RedditFetchResult(BaseModel):
    subreddit: str
    new_mentions: int


class RedditFetchResponse(BaseModel):
    status: str
    results: list[RedditFetchResult]
