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
