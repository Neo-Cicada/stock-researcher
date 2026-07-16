import { getTickerProfile, TRENDING_TICKERS } from "./tickers";
import { buildPriceSeries } from "./series";
import { makeRng } from "./rng";
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
  socialAggregate: string;
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
  socialAggregate: "62 bullish",
};
