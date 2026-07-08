import { getTickerProfile, TRENDING_TICKERS } from "./tickers";
import { buildPriceSeries, petalsOf, sparkOf } from "./series";
import { colors } from "./colors";

export interface TrendingRowView {
  ticker: string;
  name: string;
  price: string;
  day: string;
  dayColor: string;
  mentions: string;
  velocity: string;
  petals: { cx: number; fill: string }[];
  spark: string;
}

export function getTrendingRows(): TrendingRowView[] {
  return TRENDING_TICKERS.map((t) => {
    const profile = getTickerProfile(t);
    const series = buildPriceSeries(profile);
    const dayPct = series.dayChangePct;
    return {
      ticker: profile.ticker,
      name: profile.shortName,
      price: series.lastClose.toFixed(2),
      day: (dayPct >= 0 ? "+" : "−") + Math.abs(dayPct).toFixed(2) + "%",
      dayColor: dayPct >= 0 ? colors.bullish : colors.bearish,
      mentions: profile.mentionsLabel,
      velocity: profile.velocityLabel,
      petals: petalsOf(profile.sentimentScore),
      spark: sparkOf(profile.spark7d),
    };
  });
}

export interface Theme {
  stamp: string;
  rotation: number;
  title: string;
  summary: string;
  tickers: string[];
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

// Mock "current market state" — in a live app this would come from a real
// fear/greed feed; here it's a fixed deterministic value for the demo.
export const MARKET_STATE = {
  fearGreed: 68,
  direction: "bullish" as "bullish" | "bearish",
  vix: "14.2",
  vixChange: "−0.8",
  putCall: "0.62",
  breadth: "71%",
  socialAggregate: "62 bullish",
};
