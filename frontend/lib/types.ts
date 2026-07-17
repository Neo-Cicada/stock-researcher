export interface PillarInput {
  k: string;
  v: string;
}

/** A pre-/post-market quote formatted for display. */
export interface ExtendedQuote {
  session: "PRE" | "POST";
  label: string; // "PRE-MKT" / "AFT-HRS"
  price: string; // "184.10"
  pct: string; // "+1.48%"
  color: string;
}

export type PillarKey = "val" | "grw" | "qlt" | "mom" | "snt";

export interface Pillar {
  key: PillarKey;
  name: string;
  score: number;
  weight: number;
  hintText: string;
  inputs: PillarInput[];
}

export interface Fundamental {
  label: string;
  value: string;
  color?: string;
}

export interface Post {
  src: string;
  time: string;
  text: string;
  score: number;
  up: string;
}

// A real ticker headline from the backend Finnhub company-news feed.
export interface NewsItem {
  src: string;
  time: string;
  title: string;
  url: string;
}

export interface TrendingRow {
  ticker: string;
  name: string;
  price: string;
  dayPct: number;
  mentions: string;
  velocity: string;
  sentimentScore: number;
  spark7d: number[];
}

export interface TickerProfile {
  ticker: string;
  name: string;
  shortName: string;
  exchange: string;
  seed: number;
  priceStart: number;
  driftBias: number;
  mentions: number;
  mentionsLabel: string;
  velocityLabel: string;
  sentimentScore: number;
  spark7d: number[];
  fundamentals: Fundamental[];
  pillars: Pillar[];
  posts: Post[];
  insufficient: boolean;
  quietNote: string;
}

export interface Candle {
  open: number;
  close: number;
  high: number;
  low: number;
  sent: number;
  vol: number;
}

// A single institutional holder (13F/N-PORT filer), from Yahoo Finance or mock.
export interface InstitutionalHolder {
  name: string;
  shares: number;
  value: number; // market value, USD
  changePct: number; // quarter-over-quarter change in shares
}

export interface InstitutionalOwnershipView {
  ticker: string;
  ownershipPct: number; // % of shares held by institutions
  institutionsCount: number;
  totalShares: number; // total shares across the shown top holders
  holders: InstitutionalHolder[];
  // "yahoo" for live data; undefined for the deterministic mock.
  source?: string;
}
