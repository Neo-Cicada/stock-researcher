from pydantic import BaseModel


class InstitutionOut(BaseModel):
    """List-page summary for one institution (cheap: from 13F ``primary_doc``)."""

    slug: str
    name: str
    cik: str
    category: str = ""
    kanji: str = ""
    portfolio_value: float | None = None
    period: str | None = None  # reporting period, "MM-DD-YYYY"


class InstitutionHoldingOut(BaseModel):
    """One aggregated 13F position within an institution's portfolio."""

    issuer: str
    cusip: str = ""
    ticker: str | None = None  # resolved from CUSIP when known, for deep-linking
    value: float
    shares: int
    pct: float = 0.0  # share of the reported portfolio value
    rank: int | None = None  # position by value within the full portfolio


class InstitutionDetailOut(BaseModel):
    """Detail-page payload: institution meta + its top 13F holdings."""

    available: bool = True
    slug: str
    name: str
    cik: str
    category: str = ""
    kanji: str = ""
    period: str | None = None
    portfolio_value: float | None = None
    positions: int | None = None
    holdings: list[InstitutionHoldingOut] = []


class InstitutionSearchOut(BaseModel):
    """Result of "does this institution hold X?" — searched across all positions."""

    available: bool = True
    slug: str
    name: str = ""
    query: str = ""
    positions: int | None = None  # total positions searched
    matches: list[InstitutionHoldingOut] = []
