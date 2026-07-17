import { colors } from "./colors";
import type {
  EarningsEventView,
  EconomicEventView,
  InstitutionDetailView,
  InstitutionHoldingView,
  InstitutionView,
  MarketSeasonView,
  Theme,
  TrendingRowView,
} from "./dashboard";
import type {
  Fundamental,
  InstitutionalOwnershipView,
  NewsItem,
  Pillar,
} from "./types";

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

// ---- Symbol search (Finnhub /search) — powers the header autocomplete ----

export interface SymbolSearchAPI {
  symbol: string;
  description: string;
  type: string;
}

/**
 * Search listed stock symbols by ticker or company name via the backend
 * (Finnhub). Returns an empty array on any error or when the backend returns
 * nothing, so the header can fall back to its local known-ticker list.
 */
export async function fetchSymbolSearch(
  query: string,
  signal?: AbortSignal,
): Promise<SymbolSearchAPI[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const res = await fetch(
      `${API_BASE}/api/stocks/search?q=${encodeURIComponent(q)}`,
      { signal },
    );
    if (!res.ok) return [];
    const data: SymbolSearchAPI[] = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
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
  profit_margins: number | null;
  return_on_equity: number | null;
  debt_to_equity: number | null;
  revenue_growth: number | null;
  earnings_growth: number | null;
}

export interface PillarAPI {
  key: string;
  name: string;
  score: number;
  weight: number;
  hint_text: string;
  inputs: { k: string; v: string }[];
}

export interface ScorecardAPI {
  available: boolean;
  pillars: PillarAPI[];
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
  scorecard: ScorecardAPI | null;
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
  // yfinance reports margins/growth/ROE as fractions (0.24 = 24%).
  push(
    "PROFIT MARGIN",
    f.profit_margins != null ? `${(f.profit_margins * 100).toFixed(1)}%` : null,
  );
  push(
    "ROE",
    f.return_on_equity != null ? `${(f.return_on_equity * 100).toFixed(1)}%` : null,
  );
  push(
    "REV GROWTH",
    f.revenue_growth != null ? `${(f.revenue_growth * 100).toFixed(1)}%` : null,
  );

  return out;
}

/**
 * Map the live backend scorecard (Value/Growth/Quality/Momentum) into the
 * `Pillar[]` the ScorecardPillars component renders, appending the mock
 * Sentiment pillar (crowd data has no live source). Returns null when the
 * backend couldn't compute a real scorecard, so the caller falls back to the
 * fully-mock `profile.pillars`.
 */
export function apiScorecardToPillars(
  h: TickerHistoryAPI,
  sentimentPillar: Pillar,
): Pillar[] | null {
  const sc = h.scorecard;
  if (!sc || !sc.available || sc.pillars.length === 0) return null;
  const real: Pillar[] = sc.pillars.map((p) => ({
    key: p.key as Pillar["key"],
    name: p.name,
    score: p.score,
    weight: p.weight,
    hintText: p.hint_text,
    inputs: p.inputs,
  }));
  return [...real, sentimentPillar];
}

// ---- Per-ticker news (real headlines from Finnhub company news) ----

export interface TickerNewsAPI {
  title: string;
  summary: string;
  source: string;
  url: string;
  published_at: number | null;
}

/** Compact "2h ago" / "3d ago" label from a unix-seconds timestamp. */
function relativeTime(unixSeconds: number | null): string {
  if (unixSeconds == null) return "";
  const diffMs = Date.now() - unixSeconds * 1000;
  if (diffMs < 0) return "just now";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Map a /api/stocks/{ticker}/news item into the WhyThisSentiment view shape. */
export function apiNewsToView(n: TickerNewsAPI): NewsItem {
  return {
    src: n.source || "news",
    time: relativeTime(n.published_at),
    title: n.title,
    url: n.url,
  };
}

/**
 * Fetch recent real headlines for a ticker from the backend (Finnhub company
 * news). The optional `name` hint improves relevance ranking. Returns an empty
 * array on any error, so callers can show a quiet "no headlines" note.
 */
export async function fetchTickerNews(
  ticker: string,
  name?: string,
): Promise<NewsItem[]> {
  try {
    const params = new URLSearchParams();
    if (name) params.set("name", name);
    const qs = params.toString();
    const res = await fetch(
      `${API_BASE}/api/stocks/${encodeURIComponent(ticker)}/news${qs ? `?${qs}` : ""}`,
    );
    if (!res.ok) return [];
    const data: TickerNewsAPI[] = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map(apiNewsToView);
  } catch {
    return [];
  }
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
    socialBullishPct:
      m.social_bullish_pct != null ? Math.round(m.social_bullish_pct) : null,
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

// ---- Economic events (CPI, FOMC, jobs) — Finnhub economic calendar ----

export interface EconomicEventAPI {
  event: string;
  country: string;
  time: string;
  impact: string;
  actual: number | null;
  estimate: number | null;
  previous: number | null;
  unit: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "2026-07-16" → "Jul 16" (falls back to the raw string on odd input). */
function fmtMonthDay(dateStr: string): string {
  const parts = (dateStr ?? "").split("-");
  if (parts.length !== 3) return dateStr ?? "";
  const month = MONTHS[Number(parts[1]) - 1] ?? parts[1];
  return `${month} ${Number(parts[2])}`;
}

/** "2026-07-16" → "Thu" (empty string when unparseable). */
function weekdayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? "" : WEEKDAYS[d.getUTCDay()];
}

/** Format a calendar number with its unit, or "—" when absent. */
function fmtEventValue(n: number | null, unit: string): string {
  if (n == null) return "—";
  const num = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return unit ? `${num}${unit}` : num;
}

/** Map a /api/market/events item into the events board view shape. */
export function apiEventToView(e: EconomicEventAPI): EconomicEventView {
  const [datePart, timePart] = (e.time || "").split(" ");
  return {
    event: e.event,
    country: e.country,
    dateLabel: fmtMonthDay(datePart) || e.time,
    weekday: weekdayOf(datePart),
    time: timePart ? timePart.slice(0, 5) : "",
    impact: (e.impact || "").toLowerCase(),
    estimate: fmtEventValue(e.estimate, e.unit),
    previous: fmtEventValue(e.previous, e.unit),
  };
}

/**
 * Fetch upcoming economic-calendar events from the backend. Returns null on any
 * error or when the backend returns no events (including a premium-gated
 * Finnhub key), so callers can fall back to the mock TODAYS_EVENTS.
 */
export async function fetchEconomicEvents(): Promise<EconomicEventView[] | null> {
  try {
    const res = await fetch(`${API_BASE}/api/market/events`);
    if (!res.ok) return null;
    const data: EconomicEventAPI[] = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return data.map(apiEventToView);
  } catch {
    return null;
  }
}

// ---- Earnings schedule — Finnhub earnings calendar ----

export interface EarningsEventAPI {
  symbol: string;
  date: string;
  hour: string;
  eps_estimate: number | null;
  eps_actual: number | null;
  revenue_estimate: number | null;
  revenue_actual: number | null;
}

const EARNINGS_HOUR_LABELS: Record<string, string> = {
  amc: "after close",
  bmo: "before open",
  dmh: "during hours",
};

/** Compact revenue figure ("$42.0B"), or "—" when absent. */
function fmtRevenue(n: number | null): string {
  if (n == null) return "—";
  return fmtMarketCap(n);
}

/**
 * sign(actual − estimate): 1 beat, -1 miss, 0 in-line or not comparable.
 *
 * The sign is decided from the *displayed* strings, not the raw floats: a beat
 * or miss that vanishes once both values round to the same shown figure (e.g.
 * 0.7987 vs 0.7994, both "0.80") must read "in line", never a ▼ that
 * contradicts the equal numbers on screen.
 */
function beatSign(
  actual: number | null,
  estimate: number | null,
  actualStr: string,
  estimateStr: string,
): number {
  if (actual == null || estimate == null) return 0;
  if (actualStr === estimateStr) return 0;
  return Math.sign(actual - estimate);
}

/** Map a /api/market/earnings item into the earnings board view shape. */
export function apiEarningsToView(e: EarningsEventAPI): EarningsEventView {
  const sessionKey = (e.hour || "").toLowerCase();
  const reported = e.eps_actual != null || e.revenue_actual != null;
  const epsEstimate = e.eps_estimate != null ? e.eps_estimate.toFixed(2) : "—";
  const epsActual = e.eps_actual != null ? e.eps_actual.toFixed(2) : "—";
  const revenueEstimate = fmtRevenue(e.revenue_estimate);
  const revenueActual = fmtRevenue(e.revenue_actual);
  return {
    symbol: e.symbol,
    dateLabel: fmtMonthDay(e.date),
    weekday: weekdayOf(e.date),
    sessionKey,
    sessionLabel: EARNINGS_HOUR_LABELS[sessionKey] ?? "",
    epsEstimate,
    revenueEstimate,
    reported,
    epsActual,
    revenueActual,
    epsBeatSign: beatSign(e.eps_actual, e.eps_estimate, epsActual, epsEstimate),
    revBeatSign: beatSign(e.revenue_actual, e.revenue_estimate, revenueActual, revenueEstimate),
  };
}

/**
 * Fetch the upcoming earnings schedule from the backend. Returns null on any
 * error or when the backend returns no earnings, so callers can fall back to
 * the mock EARNINGS_SCHEDULE.
 */
export async function fetchEarnings(): Promise<EarningsEventView[] | null> {
  try {
    const res = await fetch(`${API_BASE}/api/market/earnings`);
    if (!res.ok) return null;
    const data: EarningsEventAPI[] = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return data.map(apiEarningsToView);
  } catch {
    return null;
  }
}

// ---- Institutional ownership (Yahoo Finance, via yfinance) ----

export interface InstitutionalHolderAPI {
  name: string;
  shares: number | null;
  value: number | null;
  change_pct: number | null;
}

export interface InstitutionalOwnershipAPI {
  ticker: string;
  available: boolean;
  ownership_pct: number | null;
  institutions_count: number | null;
  total_shares: number | null;
  holders: InstitutionalHolderAPI[];
}

/** Map the /institutional payload into the ownership chart view shape. */
export function apiInstitutionalToView(
  d: InstitutionalOwnershipAPI,
): InstitutionalOwnershipView | null {
  if (!d.available || !Array.isArray(d.holders) || d.holders.length === 0) {
    return null;
  }
  const holders = d.holders.map((h) => ({
    name: h.name,
    shares: h.shares ?? 0,
    value: h.value ?? 0,
    changePct: h.change_pct ?? 0,
  }));
  const totalShares =
    d.total_shares ?? holders.reduce((sum, h) => sum + h.shares, 0);
  return {
    ticker: d.ticker,
    ownershipPct: d.ownership_pct ?? 0,
    institutionsCount: d.institutions_count ?? holders.length,
    totalShares,
    holders,
    source: "yahoo",
  };
}

/**
 * Fetch institutional ownership for a ticker from the backend (Yahoo Finance via
 * yfinance). Returns null on any error or when the backend reports it is
 * unavailable (no coverage), so callers can fall back to the deterministic mock.
 */
export async function fetchInstitutionalOwnership(
  ticker: string,
): Promise<InstitutionalOwnershipView | null> {
  try {
    const res = await fetch(
      `${API_BASE}/api/stocks/${encodeURIComponent(ticker)}/institutional`,
    );
    if (!res.ok) return null;
    const data: InstitutionalOwnershipAPI = await res.json();
    return apiInstitutionalToView(data);
  } catch {
    return null;
  }
}

// ---- Institutions (SEC 13F holdings) ----

export interface InstitutionAPI {
  slug: string;
  name: string;
  cik: string;
  category: string;
  kanji: string;
  portfolio_value: number | null;
  period: string | null;
}

export interface InstitutionHoldingAPI {
  issuer: string;
  cusip: string;
  ticker: string | null;
  value: number;
  shares: number;
  pct: number;
  rank: number | null;
}

export interface InstitutionDetailAPI {
  available: boolean;
  slug: string;
  name: string;
  cik: string;
  category: string;
  kanji: string;
  period: string | null;
  portfolio_value: number | null;
  positions: number | null;
  holdings: InstitutionHoldingAPI[];
}

/** SEC 13F period "MM-DD-YYYY" (a quarter-end) → "Q1 2026", or "" if unparsable. */
function fmtQuarter(period: string | null): string {
  if (!period) return "";
  const parts = period.split("-");
  if (parts.length !== 3) return "";
  const month = Number(parts[0]);
  const year = parts[2];
  if (!month || !year) return "";
  return `Q${Math.ceil(month / 3)} ${year}`;
}

/** Compact share count ("227.9M", "1.2B"), or "—" when absent. */
function fmtShares(n: number | null): string {
  if (n == null || n === 0) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(Math.round(n));
}

/** Map a /api/institutions list item into the list view shape. */
export function apiInstitutionToView(i: InstitutionAPI): InstitutionView {
  return {
    slug: i.slug,
    name: i.name,
    category: i.category,
    kanji: i.kanji,
    portfolioValue: i.portfolio_value != null ? fmtMarketCap(i.portfolio_value) : "—",
    period: fmtQuarter(i.period),
  };
}

/** Map a holding row into the board view shape. */
export function apiHoldingToView(h: InstitutionHoldingAPI): InstitutionHoldingView {
  const pct = h.pct ?? 0;
  return {
    issuer: h.issuer,
    ticker: h.ticker,
    value: fmtMarketCap(h.value),
    shares: fmtShares(h.shares),
    pct,
    pctLabel: `${pct.toFixed(1)}%`,
    rank: h.rank ?? undefined,
  };
}

/**
 * Map the /api/institutions/{slug} payload into the detail view shape. Returns
 * null when the backend reports it is unavailable (unknown slug or SEC
 * unreachable) or has no holdings, so callers can fall back to the mock.
 */
export function apiInstitutionDetailToView(
  d: InstitutionDetailAPI,
): InstitutionDetailView | null {
  if (!d.available || !Array.isArray(d.holdings) || d.holdings.length === 0) {
    return null;
  }
  return {
    slug: d.slug,
    name: d.name,
    category: d.category,
    kanji: d.kanji,
    period: fmtQuarter(d.period),
    portfolioValue: d.portfolio_value != null ? fmtMarketCap(d.portfolio_value) : "—",
    positions: d.positions ?? d.holdings.length,
    holdings: d.holdings.map(apiHoldingToView),
  };
}

/**
 * Fetch the curated big-institution list (with a portfolio summary each) from
 * the backend. Returns null on any error or an empty list, so callers can fall
 * back to the mock INSTITUTIONS_MOCK.
 */
export async function fetchInstitutions(): Promise<InstitutionView[] | null> {
  try {
    const res = await fetch(`${API_BASE}/api/institutions/`);
    if (!res.ok) return null;
    const data: InstitutionAPI[] = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return data.map(apiInstitutionToView);
  } catch {
    return null;
  }
}

/**
 * Fetch one institution's latest 13F holdings from the backend. Returns null on
 * any error or when unavailable, so callers can fall back to
 * buildInstitutionDetailMock.
 */
export async function fetchInstitutionHoldings(
  slug: string,
): Promise<InstitutionDetailView | null> {
  try {
    const res = await fetch(
      `${API_BASE}/api/institutions/${encodeURIComponent(slug)}`,
    );
    if (!res.ok) return null;
    const data: InstitutionDetailAPI = await res.json();
    return apiInstitutionDetailToView(data);
  } catch {
    return null;
  }
}

export interface InstitutionSearchAPI {
  available: boolean;
  slug: string;
  name: string;
  query: string;
  positions: number | null;
  matches: InstitutionHoldingAPI[];
}

export interface InstitutionSearchResult {
  available: boolean; // false when SEC is unreachable (search couldn't run)
  positions: number | null; // total positions searched
  matches: InstitutionHoldingView[];
}

/**
 * Ask whether an institution holds a given stock, searching its *entire* latest
 * 13F (not just the top positions on the page). Returns `available: false` when
 * the backend/SEC is unreachable, so the caller can fall back to filtering the
 * already-loaded top holdings. An empty `matches` with `available: true` is a
 * definitive "they don't hold it".
 */
export async function searchInstitutionHoldings(
  slug: string,
  query: string,
): Promise<InstitutionSearchResult> {
  try {
    const res = await fetch(
      `${API_BASE}/api/institutions/${encodeURIComponent(slug)}/search?q=${encodeURIComponent(query)}`,
    );
    if (!res.ok) return { available: false, positions: null, matches: [] };
    const data: InstitutionSearchAPI = await res.json();
    return {
      available: !!data.available,
      positions: data.positions ?? null,
      matches: Array.isArray(data.matches) ? data.matches.map(apiHoldingToView) : [],
    };
  } catch {
    return { available: false, positions: null, matches: [] };
  }
}
