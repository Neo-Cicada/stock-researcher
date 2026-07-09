# Mirrors the 120 tickers from frontend TRENDING_TICKERS in lib/tickers.ts
KNOWN_TICKERS: set[str] = {
    # Curated
    "NVDA", "SMCI", "PLTR", "GME", "TSLA", "COIN", "AMD", "SOFI",
    # Mega-cap tech
    "AAPL", "MSFT", "GOOGL", "AMZN", "META", "AVGO", "ORCL", "CRM",
    "ADBE", "NFLX", "INTC", "QCOM", "TXN", "MU", "AMAT", "LRCX",
    "KLAC", "MRVL", "SNPS", "CDNS", "PANW", "CRWD", "FTNT", "ZS",
    # Financials
    "JPM", "BAC", "WFC", "GS", "MS", "C", "SCHW", "BLK",
    "AXP", "V", "MA", "PYPL", "SQ", "HOOD", "AFRM", "NU",
    # Healthcare & biotech
    "UNH", "JNJ", "LLY", "ABBV", "MRK", "PFE", "TMO", "ABT",
    "AMGN", "GILD", "ISRG", "DXCM", "MRNA", "BIIB", "REGN", "VRTX",
    # Consumer & retail
    "WMT", "COST", "HD", "LOW", "TGT", "SBUX", "MCD", "NKE",
    "LULU", "DIS", "ABNB", "BKNG", "UBER", "LYFT", "DASH", "RBLX",
    # Energy & industrials
    "XOM", "CVX", "COP", "SLB", "EOG", "OXY", "LNG", "FSLR",
    "CAT", "DE", "GE", "RTX", "LMT", "NOC", "BA", "UPS",
    # EV & clean energy
    "RIVN", "LCID", "NIO", "LI", "XPEV", "ENPH", "SEDG", "RUN",
    # Meme & high-volatility
    "AMC", "BBBY", "MARA", "RIOT", "CLSK", "MSTR", "CELH", "HIMS",
    # Comm & media
    "CMCSA", "TMUS", "T", "VZ", "SPOT", "ROKU", "SNAP", "PINS",
    # Semis & hardware
    "ARM", "SMTC", "ON", "WOLF", "TSM", "ASML", "DELL", "HPE",
}
