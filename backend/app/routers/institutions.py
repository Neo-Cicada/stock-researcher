from fastapi import APIRouter, Query

from app.schemas.institution import (
    InstitutionDetailOut,
    InstitutionOut,
    InstitutionSearchOut,
)
from app.services.finnhub_fetcher import get_company_name
from app.services.sec_13f_fetcher import (
    get_institution,
    get_institution_holdings,
    list_institutions,
    search_institution_holdings,
)


def _is_ticker(query: str) -> bool:
    """Rough check that a query is a bare ticker worth resolving to a name."""
    q = query.replace(".", "")
    return 1 <= len(q) <= 5 and q.isalpha()


router = APIRouter(prefix="/api/institutions", tags=["institutions"])


@router.get("/", response_model=list[InstitutionOut])
async def institutions():
    """Big institutions with a cheap portfolio summary from their latest 13F.

    Portfolio value / period come from each filing's small ``primary_doc.xml``;
    on an unreachable SEC those fields are ``None`` but the (curated) list still
    renders, so the frontend can fall back to its mock summaries.
    """
    return await list_institutions()


@router.get("/{slug}", response_model=InstitutionDetailOut)
async def institution_detail(slug: str):
    """An institution's latest 13F holdings (top positions, ranked by value).

    Returns ``available=false`` (not an error) for an unknown slug or when SEC
    EDGAR is unreachable / the filing can't be parsed, so the frontend falls
    back to deterministic mock holdings.
    """
    inst = get_institution(slug)
    if inst is None:
        return InstitutionDetailOut(available=False, slug=slug, name=slug, cik="")

    data = await get_institution_holdings(slug)
    if data is None:
        return InstitutionDetailOut(
            available=False,
            slug=slug,
            name=inst["name"],
            cik=inst["cik"],
            category=inst["category"],
            kanji=inst["kanji"],
        )

    return InstitutionDetailOut(available=True, **data)


@router.get("/{slug}/search", response_model=InstitutionSearchOut)
async def institution_search(
    slug: str, q: str = Query("", description="ticker or issuer name")
):
    """Does this institution hold a given stock? Searches its *entire* 13F.

    Matches by ticker (exact) or issuer-name substring across every reported
    position — not just the top holdings on the page — so it can confirm a name
    that sits deep in a large portfolio. ``available=false`` on an unknown slug
    or when SEC EDGAR is unreachable; empty ``matches`` means they don't hold it.
    """
    inst = get_institution(slug)
    if inst is None:
        return InstitutionSearchOut(available=False, slug=slug, query=q.strip())

    # When the query is a bare ticker, resolve it to a company name (Finnhub) so
    # a small-cap whose CUSIP isn't in our ticker map is still findable by symbol.
    query = q.strip()
    name_hint = await get_company_name(query) if _is_ticker(query) else None

    result = await search_institution_holdings(slug, query, name_hint)
    if result is None:
        return InstitutionSearchOut(
            available=False, slug=slug, name=inst["name"], query=q.strip()
        )

    return InstitutionSearchOut(available=True, **result)
