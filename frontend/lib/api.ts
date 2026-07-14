import { colors } from "./colors";
import type { MarketSeasonView, Theme, TrendingRowView } from "./dashboard";
import type { Fundamental } from "./types";

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
    dayPct,
    mentionCount: t.mention_count,
  };
}

// ---- Single-ticker detail (real OHLC + fundamentals from yfinance) ----

export interface TickerCandleAPI {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TickerFundamentalsAPI {
  market_cap: number | null;
  trailing_pe: number | null;
  forward_pe: number | null;
  price_to_book: number | null;
  dividend_yield: number | null;
  fifty_two_week_high: number | null;
  fifty_two_week_low: number | null;
  beta: number | null;
}

export interface TickerHistoryAPI {
  ticker: string;
  available: boolean;
  name: string | null;
  currency: string | null;
  price: number | null;
  previous_close: number | null;
  day_change_pct: number | null;
  candles: TickerCandleAPI[];
  fundamentals: TickerFundamentalsAPI | null;
}

/**
 * Fetch real OHLC history + fundamentals for a ticker from the backend.
 * Returns null on any error or when the backend reports the ticker is
 * unavailable, so callers can fall back to mock data.
 */
export async function fetchTickerHistory(
  ticker: string,
): Promise<TickerHistoryAPI | null> {
  try {
    const res = await fetch(
      `${API_BASE}/api/stocks/${encodeURIComponent(ticker)}/history`,
    );
    if (!res.ok) return null;
    const data: TickerHistoryAPI = await res.json();
    if (!data.available || data.candles.length < 2) return null;
    return data;
  } catch {
    return null;
  }
}

function fmtMarketCap(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

/** Map real fundamentals into the FundamentalsGrid `Fundamental[]` shape. */
export function apiFundamentalsToView(h: TickerHistoryAPI): Fundamental[] {
  const f = h.fundamentals;
  if (!f) return [];
  const out: Fundamental[] = [];
  const push = (label: string, value: string | null) => {
    if (value != null) out.push({ label, value });
  };

  push("MARKET CAP", f.market_cap != null ? fmtMarketCap(f.market_cap) : null);
  push("P/E (TTM)", f.trailing_pe != null ? f.trailing_pe.toFixed(1) : null);
  push("FWD P/E", f.forward_pe != null ? f.forward_pe.toFixed(1) : null);
  push("P/B", f.price_to_book != null ? f.price_to_book.toFixed(1) : null);
  // yfinance reports dividend_yield already as a percent (e.g. 0.47 = 0.47%).
  push(
    "DIV YIELD",
    f.dividend_yield != null ? `${f.dividend_yield.toFixed(2)}%` : null,
  );
  push(
    "52W HIGH",
    f.fifty_two_week_high != null ? `$${f.fifty_two_week_high.toFixed(2)}` : null,
  );
  push(
    "52W LOW",
    f.fifty_two_week_low != null ? `$${f.fifty_two_week_low.toFixed(2)}` : null,
  );
  push("BETA", f.beta != null ? f.beta.toFixed(2) : null);

  return out;
}

// ---- Market Season (CNN Fear & Greed + social bullishness) ----

export interface SubIndicatorAPI {
  score: number | null;
  rating: string | null;
}

export interface MarketSeasonAPI {
  available: boolean;
  score: number | null;
  rating: string | null;
  vix: SubIndicatorAPI;
  put_call: SubIndicatorAPI;
  breadth: SubIndicatorAPI;
  social_bullish_pct: number | null;
  fetched_at: string | null;
}

// The backend exposes each sub-indicator as CNN's 0–100 sub-index score
// (not a raw VIX level / put-call ratio), so render it as a compact integer.
function subScore(s: SubIndicatorAPI): string {
  return s.score != null ? String(Math.round(s.score)) : "—";
}

/** Map the /api/market/season payload into the gauge's view shape. */
export function apiMarketSeasonToView(m: MarketSeasonAPI): MarketSeasonView {
  const score = m.score ?? 50;
  return {
    fearGreed: Math.round(score),
    direction: score >= 50 ? "bullish" : "bearish",
    vix: subScore(m.vix),
    // No VIX change figure is available from the endpoint.
    vixChange: "",
    putCall: subScore(m.put_call),
    breadth: subScore(m.breadth),
    socialAggregate:
      m.social_bullish_pct != null
        ? `${Math.round(m.social_bullish_pct)} bullish`
        : "—",
  };
}

/**
 * Fetch the current market season (CNN Fear & Greed + social bullishness).
 * Returns null on any error or when the backend reports it is unavailable,
 * so callers can fall back to the mock MARKET_STATE.
 */
export async function fetchMarketSeason(): Promise<MarketSeasonView | null> {
  try {
    const res = await fetch(`${API_BASE}/api/market/season`);
    if (!res.ok) return null;
    const data: MarketSeasonAPI = await res.json();
    if (!data.available || data.score == null) return null;
    return apiMarketSeasonToView(data);
  } catch {
    return null;
  }
}

export interface ThemeAPI {
  title: string;
  summary: string;
  source: string;
  url: string;
  tickers: string[];
  published_at: number | null;
}

// The gauge's stamp/rotation are purely decorative (the backend has no such
// concept), so assign them deterministically by position from a small pool.
const THEME_STAMPS = ["勢", "金", "噂", "波", "風"];
const THEME_ROTATIONS = [-3, 2, -2, 3, -1];

/** Map a /api/market/themes item into the sidebar's Theme view shape. */
export function apiThemeToView(t: ThemeAPI, i: number): Theme {
  return {
    stamp: THEME_STAMPS[i % THEME_STAMPS.length],
    rotation: THEME_ROTATIONS[i % THEME_ROTATIONS.length],
    title: t.title,
    summary: t.summary,
    tickers: t.tickers,
    url: t.url || undefined,
    source: t.source || undefined,
  };
}

/**
 * Fetch today's market themes from Finnhub-backed news. Returns null on any
 * error or when the backend returns no themes, so callers can fall back to the
 * mock TODAYS_THEMES.
 */
export async function fetchThemes(): Promise<Theme[] | null> {
  try {
    const res = await fetch(`${API_BASE}/api/market/themes`);
    if (!res.ok) return null;
    const data: ThemeAPI[] = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return data.map(apiThemeToView);
  } catch {
    return null;
  }
}
