from app.services.sec_13f_fetcher import (
    _cusip_to_ticker,
    _holdings_from_infotable_xml,
    _latest_13f_accession,
    _matches_query,
    _name_tokens,
    _parse_summary_xml,
)

# Two issuers, one of them split across two manager rows (Apple), mirroring how a
# real 13F reports co-managed positions.
_INFO_TABLE = b"""<?xml version="1.0" encoding="UTF-8"?>
<informationTable xmlns="http://www.sec.gov/edgar/document/thirteenf/informationtable">
  <infoTable>
    <nameOfIssuer>APPLE INC</nameOfIssuer>
    <cusip>037833100</cusip>
    <value>60000000</value>
    <shrsOrPrnAmt><sshPrnamt>300000</sshPrnamt><sshPrnamtType>SH</sshPrnamtType></shrsOrPrnAmt>
  </infoTable>
  <infoTable>
    <nameOfIssuer>APPLE INC</nameOfIssuer>
    <cusip>037833100</cusip>
    <value>40000000</value>
    <shrsOrPrnAmt><sshPrnamt>200000</sshPrnamt><sshPrnamtType>SH</sshPrnamtType></shrsOrPrnAmt>
  </infoTable>
  <infoTable>
    <nameOfIssuer>SOME PRIVATE CO</nameOfIssuer>
    <cusip>999999999</cusip>
    <value>10000000</value>
    <shrsOrPrnAmt><sshPrnamt>500000</sshPrnamt><sshPrnamtType>SH</sshPrnamtType></shrsOrPrnAmt>
  </infoTable>
</informationTable>"""

_PRIMARY_DOC = b"""<?xml version="1.0" encoding="UTF-8"?>
<edgarSubmission xmlns="http://www.sec.gov/edgar/thirteenffiler"
                 xmlns:com="http://www.sec.gov/edgar/common">
  <headerData><filerInfo><periodOfReport>03-31-2026</periodOfReport></filerInfo></headerData>
  <formData>
    <summaryPage>
      <tableEntryTotal>3</tableEntryTotal>
      <tableValueTotal>110000000</tableValueTotal>
    </summaryPage>
  </formData>
</edgarSubmission>"""


def test_holdings_aggregate_and_rank():
    """Rows for one issuer are summed; result is value-descending with CUSIP->ticker."""
    holdings = _holdings_from_infotable_xml(_INFO_TABLE)
    assert [h["issuer"] for h in holdings] == ["APPLE INC", "SOME PRIVATE CO"]

    apple = holdings[0]
    assert apple["value"] == 100_000_000  # 60M + 40M summed across managers
    assert apple["shares"] == 500_000  # 300k + 200k
    assert apple["ticker"] == "AAPL"  # resolved from CUSIP

    # Unknown CUSIP resolves to no ticker (renders without a deep link).
    assert holdings[1]["ticker"] is None


def test_holdings_empty_on_garbage():
    assert _holdings_from_infotable_xml(b"not xml") == []


def test_parse_summary_reads_value_and_period():
    summary = _parse_summary_xml(_PRIMARY_DOC)
    assert summary["portfolio_value"] == 110_000_000
    assert summary["period"] == "03-31-2026"
    assert summary["entry_count"] == 3


def test_parse_summary_none_when_no_total():
    assert _parse_summary_xml(b"<edgarSubmission></edgarSubmission>") is None


def test_latest_13f_accession_picks_first_match():
    submissions = {
        "filings": {
            "recent": {
                "form": ["4", "13F-HR", "13F-HR"],
                "accessionNumber": ["a-0", "a-1", "a-2"],
            }
        }
    }
    assert _latest_13f_accession(submissions) == "a-1"


def test_latest_13f_accession_none_when_absent():
    submissions = {"filings": {"recent": {"form": ["4"], "accessionNumber": ["a-0"]}}}
    assert _latest_13f_accession(submissions) is None


def test_cusip_to_ticker_case_insensitive():
    assert _cusip_to_ticker("037833100") == "AAPL"
    assert _cusip_to_ticker("02079k305") == "GOOGL"
    assert _cusip_to_ticker("000000000") is None


def test_matches_query_by_ticker_and_name():
    h = {"issuer": "NVIDIA CORPORATION", "ticker": "NVDA"}
    assert _matches_query(h, "NVDA")  # exact ticker
    assert _matches_query(h, "NVIDIA")  # issuer-name substring
    assert _matches_query(h, "NVID")  # partial name
    assert not _matches_query(h, "AAPL")

    # Ticker match must be exact — "NV" shouldn't match ticker "NVDA", only names.
    assert not _matches_query({"issuer": "SOME CO", "ticker": "NVDA"}, "NV")
    # A holding with no resolved ticker still matches on its issuer name.
    assert _matches_query({"issuer": "SPDR GOLD TR", "ticker": None}, "GOLD")


def test_name_tokens_drops_generic_suffixes():
    assert _name_tokens("Applied Optoelectronics Inc") == {"applied", "optoelectronics"}
    assert _name_tokens("NVIDIA Corp") == {"nvidia"}


def test_matches_query_via_resolved_name_tokens():
    """The AAOI bug: a ticker whose CUSIP we can't map still matches by name.

    The 13F row has no resolved ticker and the ticker string isn't in the issuer
    name, so only the resolved-company-name tokens can connect them.
    """
    holding = {"issuer": "APPLIED OPTOELECTRONICS INC", "ticker": None}
    tokens = _name_tokens("Applied Optoelectronics Inc")

    assert not _matches_query(holding, "AAOI")  # no bridge -> miss (the old bug)
    assert _matches_query(holding, "AAOI", tokens)  # with name hint -> hit

    # All significant tokens must be present, so a partial-overlap name won't
    # false-match (e.g. "Applied Materials" shares only "applied").
    assert not _matches_query(
        {"issuer": "APPLIED MATERIALS INC", "ticker": None}, "AAOI", tokens
    )
