import { colors } from "./colors";
import type { TrendingRowView } from "./dashboard";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface TrendingTickerAPI {
  ticker: string;
  name: string;
  mention_count: number;
  upvotes: number;
  rank: number;
  rank_24h_ago: number | null;
  mentions_24h_ago: number | null;
  sources: string[];
  price: number | null;
  previous_close: number | null;
  day_change_pct: number | null;
}

export async function fetchTrending(
  source?: string,
  limit = 100,
): Promise<TrendingTickerAPI[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (source) params.set("source", source);

  const res = await fetch(`${API_BASE}/api/reddit/trending?${params}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function apiRowToView(t: TrendingTickerAPI): TrendingRowView {
  const priceStr = t.price != null ? t.price.toFixed(2) : "—";
  const dayPct = t.day_change_pct;

  // Compute velocity from 24h-ago mentions
  let velocity: string;
  if (t.mentions_24h_ago != null && t.mentions_24h_ago > 0) {
    const delta = t.mention_count - t.mentions_24h_ago;
    const pct = (delta / t.mentions_24h_ago) * 100;
    const sign = pct >= 0 ? "+" : "−";
    velocity = `${sign}${Math.abs(pct).toFixed(0)}%`;
  } else {
    velocity = "new";
  }

  let day: string;
  let dayColor: string;
  if (dayPct != null) {
    day = (dayPct >= 0 ? "+" : "−") + Math.abs(dayPct).toFixed(2) + "%";
    dayColor = dayPct >= 0 ? colors.bullish : colors.bearish;
  } else {
    day = "—";
    dayColor = colors.ink;
  }

  return {
    ticker: t.ticker,
    name: t.name || t.ticker,
    price: priceStr,
    day,
    dayColor,
    mentions: t.mention_count.toLocaleString(),
    velocity,
    subreddits: t.sources,
  };
}
