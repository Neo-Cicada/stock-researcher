"""SEC EDGAR 13F fetcher — big institutions and the stocks they hold.

Powers the ``/api/institutions`` endpoints. There is no free API for a reverse
"institution -> holdings" lookup, so we go to the source: every large asset
manager files a quarterly Form 13F-HR with the SEC listing its US-equity
holdings. For a curated shortlist of well-known institutions we:

1. read the SEC *submissions* feed to find each institution's latest 13F-HR,
2. read that filing's small ``primary_doc.xml`` for a cheap portfolio summary
   (total value + reporting period) used on the list page, and
3. parse the (potentially large) information-table XML on demand for the detail
   page — aggregating the line items by issuer and ranking them by value.

13F reports CUSIPs, not tickers, so ``_CUSIP_TICKER`` maps the common large-cap
issuers back to a ticker for a deep link into ``/stock/{ticker}``; holdings we
can't resolve simply render without a link. Everything degrades gracefully
(``None`` / empty) on any upstream failure so the frontend can fall back to mock.
"""

import asyncio
import logging
import time
import xml.etree.ElementTree as ET

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

SEC_SUBMISSIONS_URL = "https://data.sec.gov/submissions/CIK{cik}.json"
SEC_ARCHIVES_BASE = "https://www.sec.gov/Archives/edgar/data/{cik}/{acc}"

# 13F info-table XML namespace (the ``value``/``nameOfIssuer``/… elements).
_INFOTABLE_NS = "http://www.sec.gov/edgar/document/thirteenf/informationtable"

# 13F filings land quarterly, so cache aggressively. Summaries (list page) and
# holdings (detail page) are cached separately since they cost very differently.
_SUMMARY_TTL = 6 * 3600  # 6 hours
_HOLDINGS_TTL = 6 * 3600
_summary_cache: dict[str, tuple[float, dict | None]] = {}
_holdings_cache: dict[str, tuple[float, dict | None]] = {}

MAX_HOLDINGS = 25  # top positions surfaced on the detail page

# Curated shortlist of large, currently-active 13F filers. CIKs are verified to
# have a recent 13F-HR on EDGAR. ``category`` and ``kanji`` are purely for the
# woodblock UI. Note BlackRock files under a newer CIK (2012383) after a 2024
# entity restructure — the old 1364742 stopped filing.
INSTITUTIONS: list[dict] = [
    {
        "slug": "berkshire-hathaway",
        "name": "Berkshire Hathaway",
        "cik": "0001067983",
        "category": "Value investor",
        "kanji": "貝",
    },
    {
        "slug": "blackrock",
        "name": "BlackRock",
        "cik": "0002012383",
        "category": "Index giant",
        "kanji": "岩",
    },
    {
        "slug": "vanguard",
        "name": "Vanguard Group",
        "cik": "0000102909",
        "category": "Index giant",
        "kanji": "帆",
    },
    {
        "slug": "state-street",
        "name": "State Street",
        "cik": "0000093751",
        "category": "Index giant",
        "kanji": "州",
    },
    {
        "slug": "fmr-fidelity",
        "name": "Fidelity (FMR)",
        "cik": "0000315066",
        "category": "Fund manager",
        "kanji": "信",
    },
    {
        "slug": "geode-capital",
        "name": "Geode Capital",
        "cik": "0001214717",
        "category": "Index manager",
        "kanji": "晶",
    },
    {
        "slug": "morgan-stanley",
        "name": "Morgan Stanley",
        "cik": "0000895421",
        "category": "Bank",
        "kanji": "銀",
    },
    {
        "slug": "jpmorgan",
        "name": "JPMorgan Chase",
        "cik": "0000019617",
        "category": "Bank",
        "kanji": "宝",
    },
    {
        "slug": "goldman-sachs",
        "name": "Goldman Sachs",
        "cik": "0000886982",
        "category": "Bank",
        "kanji": "金",
    },
    {
        "slug": "wellington",
        "name": "Wellington Management",
        "cik": "0000902219",
        "category": "Fund manager",
        "kanji": "風",
    },
    {
        "slug": "t-rowe-price",
        "name": "T. Rowe Price",
        "cik": "0000080255",
        "category": "Fund manager",
        "kanji": "価",
    },
    {
        "slug": "renaissance",
        "name": "Renaissance Technologies",
        "cik": "0001037389",
        "category": "Quant fund",
        "kanji": "算",
    },
    {
        "slug": "jane-street",
        "name": "Jane Street",
        "cik": "0001595888",
        "category": "Market maker",
        "kanji": "街",
    },
    {
        "slug": "citadel",
        "name": "Citadel Advisors",
        "cik": "0001423053",
        "category": "Hedge fund",
        "kanji": "城",
    },
    {
        "slug": "millennium",
        "name": "Millennium Management",
        "cik": "0001273087",
        "category": "Hedge fund",
        "kanji": "千",
    },
    {
        "slug": "two-sigma",
        "name": "Two Sigma",
        "cik": "0001179392",
        "category": "Quant fund",
        "kanji": "双",
    },
    {
        "slug": "bridgewater",
        "name": "Bridgewater Associates",
        "cik": "0001350694",
        "category": "Hedge fund",
        "kanji": "橋",
    },
    {
        "slug": "point72",
        "name": "Point72",
        "cik": "0001603466",
        "category": "Hedge fund",
        "kanji": "点",
    },
    {
        "slug": "tiger-global",
        "name": "Tiger Global",
        "cik": "0001167483",
        "category": "Hedge fund",
        "kanji": "虎",
    },
    {
        "slug": "soros",
        "name": "Soros Fund Management",
        "cik": "0001029160",
        "category": "Hedge fund",
        "kanji": "索",
    },
    {
        "slug": "situational-awareness",
        "name": "Situational Awareness LP",
        "cik": "0002045724",
        "category": "AGI fund",
        "kanji": "覚",
    },
]

_BY_SLUG: dict[str, dict] = {inst["slug"]: inst for inst in INSTITUTIONS}

# CUSIP -> ticker for common large-cap issuers, so top holdings can deep-link to
# the stock page. High-confidence entries only — a wrong mapping mis-links, so an
# unmapped holding (no link) is preferred over a guess. /stock/{ticker} tolerates
# unknown symbols anyway.
_CUSIP_TICKER: dict[str, str] = {
    "037833100": "AAPL",
    "594918104": "MSFT",
    "67066G104": "NVDA",
    "023135106": "AMZN",
    "02079K305": "GOOGL",
    "02079K107": "GOOG",
    "30303M102": "META",
    "88160R101": "TSLA",
    "084670702": "BRK.B",
    "46625H100": "JPM",
    "92826C839": "V",
    "57636Q104": "MA",
    "91324P102": "UNH",
    "30231G102": "XOM",
    "478160104": "JNJ",
    "931142103": "WMT",
    "742718109": "PG",
    "437076102": "HD",
    "060505104": "BAC",
    "191216100": "KO",
    "025816109": "AXP",
    "166764100": "CVX",
    "00287Y109": "ABBV",
    "22160K105": "COST",
    "713448108": "PEP",
    "58933Y105": "MRK",
    "11135F101": "AVGO",
    "00724F101": "ADBE",
    "79466L302": "CRM",
    "64110L106": "NFLX",
    "007903107": "AMD",
    "458140100": "INTC",
    "747525103": "QCOM",
    "68389X105": "ORCL",
    "17275R102": "CSCO",
    "254687106": "DIS",
    "717081103": "PFE",
    "883556102": "TMO",
    "00846U101": "ACN",
    "580135101": "MCD",
    "654106103": "NKE",
    "532457108": "LLY",
    "002824100": "ABT",
    "235851102": "DHR",
    "882508104": "TXN",
    "949746101": "WFC",
    "617446448": "MS",
    "38141G104": "GS",
    "172967424": "C",
    "097023105": "BA",
    "149123101": "CAT",
    "674599105": "OXY",
    "615369105": "MCO",
    "500754106": "KHC",
    "70450Y103": "PYPL",
    "855244109": "SBUX",
    "00206R102": "T",
    "92343V104": "VZ",
    "20030N101": "CMCSA",
    "459200101": "IBM",
    "718172109": "PM",
    "125523100": "CI",
    "595112103": "MU",
    "69608A108": "PLTR",
}


def get_institution(slug: str) -> dict | None:
    """Return the curated metadata for an institution slug, or ``None``."""
    return _BY_SLUG.get(slug)


def _cusip_to_ticker(cusip: str) -> str | None:
    return _CUSIP_TICKER.get((cusip or "").strip().upper())


async def _get_json(client: httpx.AsyncClient, url: str) -> dict | None:
    """GET a JSON document from SEC, or ``None`` on any failure."""
    try:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.json()
    except Exception:
        logger.warning("SEC fetch failed: %s", url, exc_info=True)
        return None


def _latest_13f_accession(submissions: dict) -> str | None:
    """Newest ``13F-HR`` accession number from a submissions feed, or ``None``."""
    recent = (submissions.get("filings") or {}).get("recent") or {}
    forms = recent.get("form") or []
    accns = recent.get("accessionNumber") or []
    for form, accn in zip(forms, accns):
        if isinstance(form, str) and form.startswith("13F-HR"):
            return accn
    return None


def _parse_summary_xml(primary_doc: bytes) -> dict | None:
    """Extract portfolio value + reporting period from a 13F ``primary_doc.xml``.

    Pure (no I/O) so it is unit-testable. Returns ``None`` when the total value
    can't be found. Local-name matching sidesteps the document's namespaces.
    """
    try:
        root = ET.fromstring(primary_doc)
    except ET.ParseError:
        return None

    def text(local: str) -> str | None:
        for el in root.iter():
            if el.tag.rsplit("}", 1)[-1] == local and (el.text or "").strip():
                return el.text.strip()
        return None

    total = text("tableValueTotal")
    if total is None:
        return None
    try:
        value = float(total)
    except ValueError:
        return None

    entries = text("tableEntryTotal")
    try:
        entry_count = int(entries) if entries is not None else None
    except ValueError:
        entry_count = None

    return {
        "portfolio_value": value,
        "period": text("periodOfReport"),  # "MM-DD-YYYY"
        "entry_count": entry_count,
    }


def _holdings_from_infotable_xml(info_table: bytes) -> list[dict]:
    """Aggregate a 13F information-table XML into ranked issuer holdings.

    Pure (no I/O) so it is unit-testable. A single issuer appears in several
    ``<infoTable>`` rows (one per co-manager / voting split), so rows are summed
    by (issuer, cusip). Values are whole dollars (SEC's post-2023 convention).
    Returns a value-descending list of ``{issuer, cusip, ticker, value, shares}``.
    """
    try:
        root = ET.fromstring(info_table)
    except ET.ParseError:
        return []

    def q(tag: str) -> str:
        return f"{{{_INFOTABLE_NS}}}{tag}"

    agg: dict[tuple[str, str], dict] = {}
    for it in root.findall(q("infoTable")):
        issuer = (it.findtext(q("nameOfIssuer")) or "").strip()
        cusip = (it.findtext(q("cusip")) or "").strip().upper()
        if not issuer:
            continue
        try:
            value = float(it.findtext(q("value")) or 0)
        except ValueError:
            value = 0.0
        shares = 0.0
        shr = it.find(q("shrsOrPrnAmt"))
        if shr is not None:
            try:
                shares = float(shr.findtext(q("sshPrnamt")) or 0)
            except ValueError:
                shares = 0.0

        entry = agg.setdefault((issuer, cusip), {"value": 0.0, "shares": 0.0})
        entry["value"] += value
        entry["shares"] += shares

    holdings = [
        {
            "issuer": issuer,
            "cusip": cusip,
            "ticker": _cusip_to_ticker(cusip),
            "value": data["value"],
            "shares": int(data["shares"]),
        }
        for (issuer, cusip), data in agg.items()
    ]
    holdings.sort(key=lambda h: h["value"], reverse=True)
    return holdings


async def _fetch_summary(client: httpx.AsyncClient, inst: dict) -> dict:
    """Fetch one institution's list-page summary (value + period), cached.

    Always returns a dict (with the curated metadata); ``portfolio_value`` /
    ``period`` are ``None`` when SEC is unreachable, so the list still renders.
    """
    slug = inst["slug"]
    now = time.monotonic()
    cached = _summary_cache.get(slug)
    base = {
        "slug": slug,
        "name": inst["name"],
        "cik": inst["cik"],
        "category": inst["category"],
        "kanji": inst["kanji"],
    }
    if cached and cached[0] > now:
        return {**base, **(cached[1] or {})}

    cik = str(int(inst["cik"]))
    submissions = await _get_json(client, SEC_SUBMISSIONS_URL.format(cik=inst["cik"]))
    summary: dict | None = None
    if submissions is not None:
        accn = _latest_13f_accession(submissions)
        if accn is not None:
            acc = accn.replace("-", "")
            url = f"{SEC_ARCHIVES_BASE.format(cik=cik, acc=acc)}/primary_doc.xml"
            try:
                resp = await client.get(url)
                resp.raise_for_status()
                summary = _parse_summary_xml(resp.content)
            except Exception:
                logger.warning("SEC primary_doc fetch failed: %s", url, exc_info=True)

    _summary_cache[slug] = (now + _SUMMARY_TTL, summary)
    return {**base, **(summary or {})}


async def list_institutions() -> list[dict]:
    """Return the curated institutions with a cheap portfolio summary each.

    Summaries are fetched concurrently (small ``primary_doc.xml`` per filer) and
    cached; an unreachable SEC just yields ``portfolio_value=None`` rows so the
    list always renders. Ordered by portfolio value (largest first), unknowns last.
    """
    headers = {"User-Agent": settings.SEC_USER_AGENT, "Accept-Encoding": "gzip"}
    async with httpx.AsyncClient(timeout=30, headers=headers) as client:
        rows = await asyncio.gather(
            *(_fetch_summary(client, inst) for inst in INSTITUTIONS)
        )
    rows.sort(
        key=lambda r: (
            r.get("portfolio_value") is None,
            -(r.get("portfolio_value") or 0),
        )
    )
    return rows


async def _fetch_holdings(client: httpx.AsyncClient, inst: dict) -> dict | None:
    """Fetch + parse one institution's latest 13F holdings. No caching here."""
    cik = str(int(inst["cik"]))
    submissions = await _get_json(client, SEC_SUBMISSIONS_URL.format(cik=inst["cik"]))
    if submissions is None:
        return None
    accn = _latest_13f_accession(submissions)
    if accn is None:
        return None
    acc = accn.replace("-", "")
    folder = SEC_ARCHIVES_BASE.format(cik=cik, acc=acc)

    # Small cover doc carries the reporting period (the info table doesn't).
    period = None
    try:
        pd_resp = await client.get(f"{folder}/primary_doc.xml")
        pd_resp.raise_for_status()
        period = (_parse_summary_xml(pd_resp.content) or {}).get("period")
    except Exception:
        logger.warning("SEC primary_doc fetch failed: %s", folder, exc_info=True)

    # The filing folder holds the info-table XML alongside primary_doc.xml and
    # XSL renderings. Pick the largest .xml that isn't primary_doc / an xsl view.
    index = await _get_json(client, f"{folder}/index.json")
    if index is None:
        return None
    candidates = []
    for item in (index.get("directory") or {}).get("item") or []:
        name = item.get("name") or ""
        low = name.lower()
        if (
            low.endswith(".xml")
            and low != "primary_doc.xml"
            and not low.startswith("xsl")
        ):
            try:
                size = int(item.get("size") or 0)
            except ValueError:
                size = 0
            candidates.append((size, name))
    if not candidates:
        return None
    info_name = max(candidates)[1]

    try:
        resp = await client.get(f"{folder}/{info_name}")
        resp.raise_for_status()
        holdings = _holdings_from_infotable_xml(resp.content)
    except Exception:
        logger.warning(
            "SEC info-table fetch failed: %s/%s", folder, info_name, exc_info=True
        )
        return None

    if not holdings:
        return None

    # Stamp rank + portfolio weight on *every* position so the full list can back
    # both the top-N detail view and a "do they hold X?" search across all names.
    total_value = sum(h["value"] for h in holdings)
    for i, h in enumerate(holdings):
        h["rank"] = i + 1
        h["pct"] = round(h["value"] / total_value * 100, 2) if total_value else 0.0

    return {
        "slug": inst["slug"],
        "name": inst["name"],
        "cik": inst["cik"],
        "category": inst["category"],
        "kanji": inst["kanji"],
        "period": period,
        "portfolio_value": total_value,
        "positions": len(holdings),
        "holdings": holdings,  # FULL list; callers slice as needed
    }


async def _get_full_holdings(slug: str) -> dict | None:
    """Fetch + cache one institution's *complete* latest-13F holdings (6h TTL).

    Returns ``None`` for an unknown slug or on any upstream failure. The full
    list (every position, with rank + pct) backs both ``get_institution_holdings``
    (top N) and ``search_institution_holdings`` (any position).
    """
    inst = _BY_SLUG.get(slug)
    if inst is None:
        return None

    now = time.monotonic()
    cached = _holdings_cache.get(slug)
    if cached and cached[0] > now:
        return cached[1]

    headers = {"User-Agent": settings.SEC_USER_AGENT, "Accept-Encoding": "gzip"}
    async with httpx.AsyncClient(timeout=60, headers=headers) as client:
        payload = await _fetch_holdings(client, inst)

    _holdings_cache[slug] = (now + _HOLDINGS_TTL, payload)
    return payload


async def get_institution_holdings(slug: str) -> dict | None:
    """Return an institution's top ``MAX_HOLDINGS`` latest-13F positions.

    Returns ``None`` for an unknown slug or on any upstream failure, so the
    frontend can fall back to its deterministic mock.
    """
    full = await _get_full_holdings(slug)
    if full is None:
        return None
    return {**full, "holdings": full["holdings"][:MAX_HOLDINGS]}


# Generic issuer-name words that don't help identify a specific company.
_NAME_STOPWORDS = {
    "inc",
    "corp",
    "corporation",
    "co",
    "ltd",
    "the",
    "group",
    "holdings",
    "holding",
    "plc",
    "company",
    "cl",
    "com",
    "sa",
    "ag",
    "nv",
    "lp",
    "llc",
    "trust",
    "tr",
    "new",
    "class",
    "ord",
    "shs",
    "adr",
}


def _name_tokens(name: str) -> set[str]:
    """Significant lowercase words of a company name (drops generic suffixes).

    Pure so it is unit-testable. ``{"applied", "optoelectronics"}`` for
    "Applied Optoelectronics Inc".
    """
    tokens: set[str] = set()
    for word in (name or "").replace("/", " ").split():
        w = word.strip(".,&()").lower()
        if len(w) >= 3 and w not in _NAME_STOPWORDS:
            tokens.add(w)
    return tokens


def _looks_like_ticker(query: str) -> bool:
    """Rough check that a query is a bare ticker (so we can resolve it to a name)."""
    q = query.replace(".", "")
    return 1 <= len(q) <= 5 and q.isalpha()


def _matches_query(
    holding: dict, query: str, name_tokens: set[str] | None = None
) -> bool:
    """True if a holding matches a search query.

    Matches by ticker (exact), issuer-name substring, or — when a resolved
    company name is supplied — all of that name's significant tokens appearing in
    the issuer name (this is what lets ``AAOI`` find ``APPLIED OPTOELECTRONICS
    INC``, whose CUSIP isn't in our ticker map). Pure so it is unit-testable;
    ``query`` is already upper-cased/stripped.
    """
    ticker = (holding.get("ticker") or "").upper()
    if ticker and ticker == query:
        return True
    if query and query in holding["issuer"].upper():
        return True
    if name_tokens:
        issuer_low = holding["issuer"].lower()
        if all(t in issuer_low for t in name_tokens):
            return True
    return False


async def search_institution_holdings(
    slug: str, query: str, name_hint: str | None = None
) -> dict | None:
    """Search an institution's *full* 13F for a stock (ticker or issuer name).

    Answers "does this institution hold X?" across every reported position, not
    just the top holdings shown on the page. ``name_hint`` (the company name a
    ticker resolves to, e.g. from Finnhub) lets a ticker match a holding whose
    CUSIP we can't map to that ticker. Returns ``None`` for an unknown slug or on
    any upstream failure; an empty ``matches`` means they don't hold it.
    """
    full = await _get_full_holdings(slug)
    if full is None:
        return None

    q = (query or "").strip().upper()
    tokens = _name_tokens(name_hint) if name_hint else None
    annotate = _looks_like_ticker(q)  # matched company == the searched ticker

    matches: list[dict] = []
    for h in full["holdings"]:
        if not q or not _matches_query(h, q, tokens):
            continue
        m = dict(h)
        # Surface the searched ticker on a name/token match whose 13F row had no
        # resolved ticker, so the result can still deep-link to /stock/{ticker}.
        if not m.get("ticker") and annotate:
            m["ticker"] = q
        matches.append(m)

    return {
        "slug": full["slug"],
        "name": full["name"],
        "query": query.strip(),
        "positions": full["positions"],
        "matches": matches[:20],
    }
