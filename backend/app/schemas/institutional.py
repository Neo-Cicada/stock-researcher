from pydantic import BaseModel


class InstitutionalHolderOut(BaseModel):
    name: str
    shares: int | None = None
    value: float | None = None  # market value, USD
    change_pct: float | None = None  # quarter-over-quarter change in shares


class InstitutionalOwnershipOut(BaseModel):
    """Institutional-ownership summary + top holders for a ticker (Yahoo Finance).

    ``available=False`` (rather than an error) when Yahoo is unreachable or the
    ticker has no institutional coverage, so the frontend can fall back to
    deterministic mock data.
    """

    ticker: str
    available: bool = True
    ownership_pct: float | None = None  # % of shares held by institutions
    institutions_count: int | None = None
    total_shares: int | None = None
    holders: list[InstitutionalHolderOut] = []
