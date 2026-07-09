import re

# Common English words / Reddit slang that look like tickers but aren't
FALSE_POSITIVES: frozenset[str] = frozenset({
    "I", "A", "AM", "AN", "AS", "AT", "BE", "BY", "DO", "GO", "HE",
    "IF", "IN", "IS", "IT", "ME", "MY", "NO", "OF", "OK", "ON", "OR",
    "SO", "TO", "UP", "US", "WE",
    "AI", "DD", "CEO", "CFO", "CTO", "COO", "IPO", "ETF", "SEC", "FBI",
    "GDP", "CPI", "PPI", "USA", "USD", "EUR", "GBP", "JPY", "BTC", "ETH",
    "EPS", "RSI", "ATH", "ATL", "OTM", "ITM", "DTE", "FD", "YOLO", "FOMO",
    "IMO", "TBH", "LMAO", "LOL", "OMG", "WTF", "TLDR", "EDIT", "UPDATE",
    "CEO", "NFT", "API", "UI", "UX", "MVP", "FYI", "PSA", "RIP",
    "ARE", "THE", "FOR", "NOT", "BUT", "ALL", "CAN", "HAS", "HER", "WAS",
    "ONE", "OUR", "OUT", "YOU", "HAD", "HOT", "OLD", "NEW", "NOW", "WAY",
    "MAY", "DAY", "TOO", "ANY", "WHO", "GOT", "LET", "SAY", "SHE", "HIM",
    "HIS", "HOW", "MAN", "ITS", "SET", "BIG", "TOP", "END", "FAR",
    "PUT", "SAW", "RAN", "OWN", "SAT",
    "THAT", "WITH", "HAVE", "THIS", "WILL", "YOUR", "FROM", "THEY",
    "BEEN", "CALL", "COME", "EACH", "MAKE", "LIKE", "LONG", "LOOK",
    "MANY", "MOST", "MUCH", "ONLY", "OVER", "SUCH", "TAKE", "THAN",
    "THEM", "VERY", "WHEN", "SOME", "JUST", "ALSO", "INTO", "YEAR",
    "BACK", "EVEN", "GOOD", "GIVE", "BEST", "WELL", "WHAT", "SELL",
    "PLAY", "HOLD", "PUMP", "DUMP", "CASH", "DEBT", "GAIN", "LOSS",
    "BULL", "BEAR", "MOON", "DIPS", "BAGS", "PUTS", "BOND", "RATE",
    "HIGH", "HUGE", "FIND", "FREE", "FULL", "REAL", "RISK", "SAFE",
    "MOVE", "NEXT", "DOWN", "FAST", "FIRE", "HELP", "HERE", "SURE",
    "OPEN", "POST", "READ", "SAME", "SAID", "WENT", "WEEK", "WORK",
    "ZERO", "FUND", "BANK", "SAVE", "PAID", "HOPE", "PLAN", "FACT",
    "STOP", "TRUE", "HALF", "KEEP", "LAST", "LEFT", "NEED", "STILL",
    "EVER", "EASY", "HARD",
})

# Matches $TICKER (cashtag) or standalone uppercase 1-5 letter words
_CASHTAG_RE = re.compile(r"\$([A-Z]{1,5})\b")
_BARE_RE = re.compile(r"\b([A-Z]{2,5})\b")


def extract_tickers(
    text: str,
    known_tickers: set[str],
) -> set[str]:
    """Extract stock ticker symbols from text.

    $TICKER cashtags are always accepted (if not a false positive).
    Bare uppercase words are only accepted if they're in known_tickers.
    """
    found: set[str] = set()

    # Cashtags — always accepted
    for match in _CASHTAG_RE.finditer(text):
        sym = match.group(1)
        if sym not in FALSE_POSITIVES:
            found.add(sym)

    # Bare uppercase words — only if known
    for match in _BARE_RE.finditer(text):
        sym = match.group(1)
        if sym not in FALSE_POSITIVES and sym in known_tickers:
            found.add(sym)

    return found
