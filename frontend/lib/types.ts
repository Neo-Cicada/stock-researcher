export interface PillarInput {
  k: string;
  v: string;
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
