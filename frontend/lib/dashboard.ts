import { getTickerProfile, TRENDING_TICKERS } from "./tickers";
import { buildPriceSeries } from "./series";
import { makeRng, hashSeed } from "./rng";
import { colors } from "./colors";

const SUBREDDIT_LIST = ["wallstreetbets", "investing", "daytrading"] as const;

export interface TrendingRowView {
  ticker: string;
  name: string;
  price: string;
  day: string;
  dayColor: string;
  mentions: string;
  velocity: string;
  subreddits: string[];
  // Numeric values for sorting (null when unavailable).
  dayPct: number | null;
  mentionCount: number;
}

export function getTrendingRows(): TrendingRowView[] {
  return TRENDING_TICKERS.map((t) => {
    const profile = getTickerProfile(t);
    const series = buildPriceSeries(profile);
    const dayPct = series.dayChangePct;

    // Deterministically assign subreddits (~65% chance each, at least one)
    const subRng = makeRng(profile.seed + 999);
    let subs = SUBREDDIT_LIST.filter(() => subRng() < 0.65);
    if (subs.length === 0) {
      subs = [SUBREDDIT_LIST[Math.floor(subRng() * SUBREDDIT_LIST.length)]];
    }

    return {
      ticker: profile.ticker,
      name: profile.shortName,
      price: series.lastClose.toFixed(2),
      day: (dayPct >= 0 ? "+" : "−") + Math.abs(dayPct).toFixed(2) + "%",
      dayColor: dayPct >= 0 ? colors.bullish : colors.bearish,
      mentions: profile.mentionsLabel,
      velocity: profile.velocityLabel,
      subreddits: [...subs],
      dayPct,
      mentionCount: profile.mentions,
    };
  });
}

export interface Theme {
  stamp: string;
  rotation: number;
  title: string;
  summary: string;
  tickers: string[];
  // Present only for live themes from Finnhub; mock themes omit these.
  url?: string;
  source?: string;
}

export const TODAYS_THEMES: Theme[] = [
  {
    stamp: "勢",
    rotation: -3,
    title: "AI capex re-acceleration",
    summary: "Hyperscaler orders read stronger than guided; chip names lead mentions for a third session.",
    tickers: ["NVDA", "SMCI", "AMD"],
  },
  {
    stamp: "金",
    rotation: 2,
    title: "Rate-cut repricing",
    summary: "September odds jumped after CPI; rate-sensitive fintech chatter turned constructive overnight.",
    tickers: ["SOFI", "COIN"],
  },
  {
    stamp: "噂",
    rotation: -2,
    title: "Squeeze watch",
    summary: "Short interest above 20% meets rising call volume; velocity high but sentiment split.",
    tickers: ["GME"],
  },
];

export const THEMES_QUIET_NOTE = "Small-caps theme — fewer than 40 mentions today.";

// ---- Economic events (CPI, FOMC, jobs) — Finnhub economic calendar ----

export interface EconomicEventView {
  event: string;
  country: string;
  dateLabel: string; // "Jul 16"
  weekday: string; // "Wed"
  time: string; // "12:30" (may be "")
  // "high" | "medium" | "low" | "" — drives the impact disc color.
  impact: string;
  estimate: string;
  previous: string;
}

export const TODAYS_EVENTS: EconomicEventView[] = [
  { event: "CPI m/m", country: "US", dateLabel: "Jul 16", weekday: "Wed", time: "12:30", impact: "high", estimate: "0.3%", previous: "0.4%" },
  { event: "Core CPI m/m", country: "US", dateLabel: "Jul 16", weekday: "Wed", time: "12:30", impact: "high", estimate: "0.3%", previous: "0.2%" },
  { event: "German ZEW Sentiment", country: "DE", dateLabel: "Jul 16", weekday: "Wed", time: "09:00", impact: "medium", estimate: "41.2", previous: "47.5" },
  { event: "Crude Oil Inventories", country: "US", dateLabel: "Jul 16", weekday: "Wed", time: "14:30", impact: "low", estimate: "-1.2M", previous: "-3.4M" },
  { event: "Retail Sales m/m", country: "US", dateLabel: "Jul 17", weekday: "Thu", time: "12:30", impact: "high", estimate: "0.2%", previous: "0.1%" },
  { event: "Initial Jobless Claims", country: "US", dateLabel: "Jul 17", weekday: "Thu", time: "12:30", impact: "medium", estimate: "232K", previous: "227K" },
  { event: "Philly Fed Manufacturing", country: "US", dateLabel: "Jul 17", weekday: "Thu", time: "12:30", impact: "medium", estimate: "2.9", previous: "1.3" },
  { event: "FOMC Rate Decision", country: "US", dateLabel: "Jul 18", weekday: "Fri", time: "18:00", impact: "high", estimate: "5.50%", previous: "5.50%" },
  { event: "FOMC Press Conference", country: "US", dateLabel: "Jul 18", weekday: "Fri", time: "18:30", impact: "high", estimate: "—", previous: "—" },
  { event: "UK Retail Sales m/m", country: "GB", dateLabel: "Jul 18", weekday: "Fri", time: "06:00", impact: "medium", estimate: "0.4%", previous: "-2.7%" },
  { event: "Existing Home Sales", country: "US", dateLabel: "Jul 21", weekday: "Mon", time: "14:00", impact: "low", estimate: "4.10M", previous: "4.11M" },
  { event: "Flash Manufacturing PMI", country: "US", dateLabel: "Jul 22", weekday: "Tue", time: "13:45", impact: "medium", estimate: "51.8", previous: "51.6" },
];

// ---- Earnings schedule — Finnhub earnings calendar ----

export interface EarningsEventView {
  symbol: string;
  dateLabel: string; // "Jul 17"
  weekday: string; // "Thu"
  sessionKey: string; // "amc" | "bmo" | "dmh" | ""
  sessionLabel: string; // "after close" | "before open" | "during hours" | ""
  epsEstimate: string;
  revenueEstimate: string;
  // Result fields — present once a company has reported (past/live earnings).
  // The mock EARNINGS_SCHEDULE is a forward calendar, so these stay absent there.
  reported?: boolean;
  epsActual?: string; // formatted actual EPS, or "—"
  revenueActual?: string; // formatted actual revenue, or "—"
  epsBeatSign?: number; // sign(actual − estimate): 1 beat, -1 miss, 0 inline/unknown
  revBeatSign?: number;
}

export const EARNINGS_SCHEDULE: EarningsEventView[] = [
  { symbol: "JPM", dateLabel: "Jul 16", weekday: "Wed", sessionKey: "bmo", sessionLabel: "before open", epsEstimate: "4.18", revenueEstimate: "$42.2B" },
  { symbol: "ASML", dateLabel: "Jul 16", weekday: "Wed", sessionKey: "bmo", sessionLabel: "before open", epsEstimate: "5.31", revenueEstimate: "$8.5B" },
  { symbol: "NVDA", dateLabel: "Jul 17", weekday: "Thu", sessionKey: "amc", sessionLabel: "after close", epsEstimate: "1.25", revenueEstimate: "$42.0B" },
  { symbol: "NFLX", dateLabel: "Jul 17", weekday: "Thu", sessionKey: "amc", sessionLabel: "after close", epsEstimate: "6.20", revenueEstimate: "$11.1B" },
  { symbol: "TSM", dateLabel: "Jul 17", weekday: "Thu", sessionKey: "bmo", sessionLabel: "before open", epsEstimate: "2.34", revenueEstimate: "$29.8B" },
  { symbol: "AXP", dateLabel: "Jul 18", weekday: "Fri", sessionKey: "bmo", sessionLabel: "before open", epsEstimate: "3.86", revenueEstimate: "$17.1B" },
  { symbol: "SLB", dateLabel: "Jul 18", weekday: "Fri", sessionKey: "bmo", sessionLabel: "before open", epsEstimate: "0.88", revenueEstimate: "$9.2B" },
  { symbol: "TSLA", dateLabel: "Jul 20", weekday: "Sun", sessionKey: "amc", sessionLabel: "after close", epsEstimate: "0.62", revenueEstimate: "$25.4B" },
  { symbol: "KO", dateLabel: "Jul 21", weekday: "Mon", sessionKey: "bmo", sessionLabel: "before open", epsEstimate: "0.84", revenueEstimate: "$11.8B" },
  { symbol: "GOOGL", dateLabel: "Jul 22", weekday: "Tue", sessionKey: "amc", sessionLabel: "after close", epsEstimate: "1.84", revenueEstimate: "$84.2B" },
  { symbol: "AMD", dateLabel: "Jul 22", weekday: "Tue", sessionKey: "amc", sessionLabel: "after close", epsEstimate: "0.71", revenueEstimate: "$6.1B" },
  { symbol: "V", dateLabel: "Jul 22", weekday: "Tue", sessionKey: "amc", sessionLabel: "after close", epsEstimate: "2.42", revenueEstimate: "$9.5B" },
  { symbol: "MSFT", dateLabel: "Jul 23", weekday: "Wed", sessionKey: "amc", sessionLabel: "after close", epsEstimate: "3.10", revenueEstimate: "$64.5B" },
  { symbol: "META", dateLabel: "Jul 23", weekday: "Wed", sessionKey: "amc", sessionLabel: "after close", epsEstimate: "5.88", revenueEstimate: "$44.7B" },
];

export interface MarketSeasonView {
  fearGreed: number;
  direction: "bullish" | "bearish";
  vix: string;
  vixChange: string;
  putCall: string;
  breadth: string;
  // % of the ApeWisdom/Reddit crowd leaning bullish (0–100), or null when
  // there isn't enough crowd data. Distinct from the fear/greed `fearGreed`.
  socialBullishPct: number | null;
}

// Mock "current market state" — used as the fallback when the backend
// /api/market/season endpoint is unavailable. Live data (CNN Fear & Greed +
// social bullishness) is mapped into this same shape in lib/api.ts.
export const MARKET_STATE: MarketSeasonView = {
  fearGreed: 68,
  direction: "bullish",
  vix: "14.2",
  vixChange: "−0.8",
  putCall: "0.62",
  breadth: "71%",
  socialBullishPct: 62,
};

// ---- Institutions (SEC 13F holdings) ----

export interface InstitutionView {
  slug: string;
  name: string;
  category: string;
  kanji: string;
  portfolioValue: string; // "$263B" / "$6.9T" / "—"
  period: string; // "Q1 2026" / ""
}

export interface InstitutionHoldingView {
  issuer: string;
  ticker: string | null; // deep-links to /stock/[ticker] when known
  value: string; // "$57.8B"
  shares: string; // "227.9M"
  pct: number; // share of portfolio, 0–100
  pctLabel: string; // "22.0%"
  rank?: number; // position by value within the full portfolio
}

export interface InstitutionDetailView {
  slug: string;
  name: string;
  category: string;
  kanji: string;
  period: string;
  portfolioValue: string;
  positions: number;
  holdings: InstitutionHoldingView[];
}

// Mock fallback for the /institutions list — the same curated shortlist the
// backend serves, used when SEC EDGAR is unreachable so the page still renders.
// Portfolio values are indicative (last-known-ish), not live.
export const INSTITUTIONS_MOCK: InstitutionView[] = [
  { slug: "vanguard", name: "Vanguard Group", category: "Index giant", kanji: "帆", portfolioValue: "$6.9T", period: "Q4 2025" },
  { slug: "blackrock", name: "BlackRock", category: "Index giant", kanji: "岩", portfolioValue: "$5.7T", period: "Q1 2026" },
  { slug: "state-street", name: "State Street", category: "Index giant", kanji: "州", portfolioValue: "$2.9T", period: "Q1 2026" },
  { slug: "fmr-fidelity", name: "Fidelity (FMR)", category: "Fund manager", kanji: "信", portfolioValue: "$1.9T", period: "Q1 2026" },
  { slug: "morgan-stanley", name: "Morgan Stanley", category: "Bank", kanji: "銀", portfolioValue: "$1.7T", period: "Q4 2025" },
  { slug: "geode-capital", name: "Geode Capital", category: "Index manager", kanji: "晶", portfolioValue: "$1.4T", period: "Q1 2026" },
  { slug: "jpmorgan", name: "JPMorgan Chase", category: "Bank", kanji: "宝", portfolioValue: "$1.2T", period: "Q1 2026" },
  { slug: "jane-street", name: "Jane Street", category: "Market maker", kanji: "街", portfolioValue: "$777B", period: "Q1 2026" },
  { slug: "goldman-sachs", name: "Goldman Sachs", category: "Bank", kanji: "金", portfolioValue: "$680B", period: "Q1 2026" },
  { slug: "wellington", name: "Wellington Management", category: "Fund manager", kanji: "風", portfolioValue: "$620B", period: "Q1 2026" },
  { slug: "t-rowe-price", name: "T. Rowe Price", category: "Fund manager", kanji: "価", portfolioValue: "$580B", period: "Q1 2026" },
  { slug: "berkshire-hathaway", name: "Berkshire Hathaway", category: "Value investor", kanji: "貝", portfolioValue: "$263B", period: "Q1 2026" },
  { slug: "citadel", name: "Citadel Advisors", category: "Hedge fund", kanji: "城", portfolioValue: "$580B", period: "Q1 2026" },
  { slug: "millennium", name: "Millennium Management", category: "Hedge fund", kanji: "千", portfolioValue: "$320B", period: "Q1 2026" },
  { slug: "situational-awareness", name: "Situational Awareness LP", category: "AGI fund", kanji: "覚", portfolioValue: "$14B", period: "Q1 2026" },
  { slug: "renaissance", name: "Renaissance Technologies", category: "Quant fund", kanji: "算", portfolioValue: "$100B", period: "Q1 2026" },
  { slug: "two-sigma", name: "Two Sigma", category: "Quant fund", kanji: "双", portfolioValue: "$90B", period: "Q1 2026" },
  { slug: "bridgewater", name: "Bridgewater Associates", category: "Hedge fund", kanji: "橋", portfolioValue: "$22B", period: "Q1 2026" },
  { slug: "point72", name: "Point72", category: "Hedge fund", kanji: "点", portfolioValue: "$40B", period: "Q1 2026" },
  { slug: "tiger-global", name: "Tiger Global", category: "Hedge fund", kanji: "虎", portfolioValue: "$25B", period: "Q1 2026" },
  { slug: "soros", name: "Soros Fund Management", category: "Hedge fund", kanji: "索", portfolioValue: "$6B", period: "Q1 2026" },
];

// Common large-cap issuers used to synthesize deterministic mock holdings when
// SEC EDGAR is unreachable. [ticker, issuer-as-13F-would-name-it].
const HOLDING_POOL: [string, string][] = [
  ["AAPL", "APPLE INC"], ["MSFT", "MICROSOFT CORP"], ["NVDA", "NVIDIA CORP"],
  ["AMZN", "AMAZON COM INC"], ["GOOGL", "ALPHABET INC"], ["META", "META PLATFORMS INC"],
  ["TSLA", "TESLA INC"], ["AVGO", "BROADCOM INC"], ["JPM", "JPMORGAN CHASE & CO"],
  ["V", "VISA INC"], ["UNH", "UNITEDHEALTH GROUP INC"], ["XOM", "EXXON MOBIL CORP"],
  ["JNJ", "JOHNSON & JOHNSON"], ["WMT", "WALMART INC"], ["MA", "MASTERCARD INC"],
  ["PG", "PROCTER & GAMBLE CO"], ["HD", "HOME DEPOT INC"], ["COST", "COSTCO WHSL CORP"],
  ["ORCL", "ORACLE CORP"], ["MRK", "MERCK & CO INC"],
];

function fmtBig(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toFixed(0)}`;
}

function fmtShares(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(Math.round(n));
}

/**
 * Deterministic mock holdings for an institution, used when the backend 13F
 * endpoint is unavailable. Seeded by slug so a given institution always renders
 * the same portfolio. Values are fabricated — not real 13F data.
 */
export function buildInstitutionDetailMock(slug: string): InstitutionDetailView {
  const meta =
    INSTITUTIONS_MOCK.find((i) => i.slug === slug) ??
    { slug, name: slug, category: "Institution", kanji: "機", portfolioValue: "—", period: "" };

  const rng = makeRng(hashSeed(slug) || 1);
  const count = 10 + Math.floor(rng() * 8); // 10–17 positions
  // Rotate the pool by seed so different institutions lead with different names.
  const offset = Math.floor(rng() * HOLDING_POOL.length);
  const picks = Array.from({ length: count }, (_, i) => HOLDING_POOL[(offset + i) % HOLDING_POOL.length]);

  // Descending weights → a realistic concentration curve.
  let weight = 100;
  const raw = picks.map(() => {
    const w = weight;
    weight *= 0.72 + rng() * 0.2;
    return w;
  });
  const totalW = raw.reduce((s, w) => s + w, 0);

  // Anchor the portfolio's total dollar value off the mock summary string.
  const totalValue = 2.5e11 * (0.4 + rng());

  const holdings: InstitutionHoldingView[] = picks.map(([ticker, issuer], i) => {
    const value = (raw[i] / totalW) * totalValue;
    const pct = (raw[i] / totalW) * 100;
    const pricePerShare = 40 + rng() * 400;
    return {
      issuer,
      ticker,
      value: fmtBig(value),
      shares: fmtShares(value / pricePerShare),
      pct,
      pctLabel: `${pct.toFixed(1)}%`,
      rank: i + 1,
    };
  });

  return {
    slug: meta.slug,
    name: meta.name,
    category: meta.category,
    kanji: meta.kanji,
    period: meta.period,
    portfolioValue: fmtBig(totalValue),
    positions: count,
    holdings,
  };
}
