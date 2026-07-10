from pydantic import BaseModel


class TrendingTickerOut(BaseModel):
    ticker: str
    name: str
    mention_count: int
    upvotes: int
    rank: int
    rank_24h_ago: int | None = None
    mentions_24h_ago: int | None = None
    sources: list[str]


class RedditFetchResult(BaseModel):
    source: str
    tickers_stored: int


class RedditFetchResponse(BaseModel):
    status: str
    results: list[RedditFetchResult]
