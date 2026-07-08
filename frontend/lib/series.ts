import { makeRng, clamp } from "./rng";
import { colors } from "./colors";
import type { Candle, TickerProfile } from "./types";

const SESSIONS = 42;
const CHART_W = 712;
const CHART_L = 8;

export interface CandleGeom {
  cx: number;
  bx: number;
  wy1: number;
  wy2: number;
  by: number;
  bh: number;
  color: string;
  fill: string;
}

export interface GridLine {
  y: number;
  ty: number;
  label: string;
}

export interface VolBar {
  x: number;
  y: number;
  h: number;
}

export interface PriceSeries {
  candles: CandleGeom[];
  grid: GridLine[];
  sentPath: string;
  sentLastX: number;
  sentLastY: number;
  vols: VolBar[];
  dateTicks: { x: number; label: string }[];
  lastClose: number;
  prevClose: number;
  dayChangeAbs: number;
  dayChangePct: number;
}

function generateRaw(profile: TickerProfile): Candle[] {
  const rnd = makeRng(profile.seed);
  let close = profile.priceStart;
  let sent = 0.1;
  const raw: Candle[] = [];
  for (let i = 0; i < SESSIONS; i++) {
    const drift = (i > 28 ? 0.012 : 0.004) * profile.driftBias;
    const ret = (rnd() - 0.47) * 0.045 + drift;
    const open = close;
    close = open * (1 + ret);
    const high = Math.max(open, close) * (1 + rnd() * 0.012);
    const low = Math.min(open, close) * (1 - rnd() * 0.012);
    sent = clamp(sent * 0.72 + ret * 10 + (rnd() - 0.5) * 0.3, -1, 1);
    const vol = 160 + Math.abs(ret) * 5200 + rnd() * 140;
    raw.push({ open, close, high, low, sent, vol });
  }
  return raw;
}

export function buildPriceSeries(profile: TickerProfile): PriceSeries {
  const raw = generateRaw(profile);
  let minP = Infinity;
  let maxP = -Infinity;
  let maxV = 0;
  raw.forEach((r) => {
    minP = Math.min(minP, r.low);
    maxP = Math.max(maxP, r.high);
    maxV = Math.max(maxV, r.vol);
  });
  const yOf = (p: number) => 12 + ((maxP - p) / (maxP - minP)) * 216;
  const step = (CHART_W - CHART_L) / SESSIONS;

  const candles: CandleGeom[] = raw.map((r, i) => {
    const up = r.close >= r.open;
    const cx = CHART_L + i * step + 5;
    const byTop = yOf(Math.max(r.open, r.close));
    const byBot = yOf(Math.min(r.open, r.close));
    return {
      cx,
      bx: cx - 5,
      wy1: yOf(r.high),
      wy2: yOf(r.low),
      by: byTop,
      bh: Math.max(1.5, byBot - byTop),
      color: up ? colors.bullish : colors.bearish,
      fill: up ? colors.paper : colors.bearish,
    };
  });

  const grid: GridLine[] = [0.85, 0.5, 0.15].map((k) => {
    const p = minP + (maxP - minP) * k;
    const y = yOf(p);
    return { y, ty: y + 3.5, label: "$" + p.toFixed(0) };
  });

  let sentPath = "";
  raw.forEach((r, i) => {
    const x = (CHART_L + i * step + 5).toFixed(1);
    const y = (32 - r.sent * 25).toFixed(1);
    sentPath += (i === 0 ? "M" : " L") + x + " " + y;
  });
  const lastX = CHART_L + (SESSIONS - 1) * step + 5;

  const vols: VolBar[] = raw.map((r, i) => {
    const h = Math.max(1.5, (r.vol / maxV) * 44);
    return { x: CHART_L + i * step, y: 52 - h, h };
  });

  const dateTicks = [
    { x: 8, label: "12 May" },
    { x: 330, label: "9 Jun" },
    { x: 630, label: "7 Jul" },
  ];

  const lastClose = raw[SESSIONS - 1].close;
  const prevClose = raw[SESSIONS - 2].close;

  return {
    candles,
    grid,
    sentPath,
    sentLastX: lastX,
    sentLastY: 32 - raw[SESSIONS - 1].sent * 25,
    vols,
    dateTicks,
    lastClose,
    prevClose,
    dayChangeAbs: lastClose - prevClose,
    dayChangePct: ((lastClose - prevClose) / prevClose) * 100,
  };
}

export interface Petal {
  cx: number;
  fill: string;
}

export function petalsOf(score: number): Petal[] {
  const filled = Math.round(score / 20);
  const col = score >= 50 ? colors.bullish : colors.bearish;
  const arr: Petal[] = [];
  for (let k = 0; k < 5; k++) arr.push({ cx: 7 + k * 11, fill: k < filled ? col : colors.petalEmpty });
  return arr;
}

export function sparkOf(vals: number[]): string {
  const mn = Math.min(...vals);
  const mx = Math.max(...vals);
  return vals
    .map((v, i) => {
      const x = (3 + i * (62 / (vals.length - 1))).toFixed(1);
      const y = (15 - ((v - mn) / (mx - mn || 1)) * 12).toFixed(1);
      return (i === 0 ? "M" : " L") + x + " " + y;
    })
    .join("");
}

// ---- Market Season Branch ----

export interface BranchAnchor {
  x: number;
  by: number;
  y: number;
}

export const BRANCH_ANCHORS: BranchAnchor[] = [
  { x: 150, by: 103, y: 74 }, { x: 225, by: 98, y: 122 }, { x: 300, by: 93, y: 62 },
  { x: 380, by: 87, y: 112 }, { x: 455, by: 81, y: 54 }, { x: 530, by: 75, y: 100 },
  { x: 610, by: 67, y: 42 }, { x: 690, by: 62, y: 92 }, { x: 770, by: 58, y: 34 },
  { x: 850, by: 56, y: 84 }, { x: 925, by: 53, y: 28 }, { x: 985, by: 50, y: 76 },
];

export const BRANCH_BLOOM_ORDER = [2, 7, 4, 9, 0, 11, 5, 1, 8, 3, 10, 6];

export function branchTwigs() {
  return BRANCH_ANCHORS.map((a, i) => ({
    d: `M${a.x} ${a.by} Q${a.x + (i % 2 ? -8 : 8)} ${(a.by + a.y) / 2} ${a.x} ${a.y}`,
  }));
}

export interface BranchGlyph {
  tf: string;
  color?: string;
}

export function branchBlossomsAndBuds(fearGreed: number, petalColor: string) {
  const fg = clamp(fearGreed, 0, 100);
  const bloomCount = Math.round(BRANCH_ANCHORS.length * clamp((fg - 15) / 75, 0, 1));
  const budCount = fg > 8 ? Math.min(BRANCH_ANCHORS.length, bloomCount + 3) : 0;
  const blossoms: BranchGlyph[] = [];
  const buds: BranchGlyph[] = [];
  BRANCH_BLOOM_ORDER.forEach((ai, rank) => {
    const a = BRANCH_ANCHORS[ai];
    const tf = `translate(${a.x},${a.y}) rotate(${(ai * 47) % 360})`;
    if (rank < bloomCount) blossoms.push({ tf, color: petalColor });
    else if (rank < budCount) buds.push({ tf });
  });
  return { blossoms, buds };
}

export function seasonLabel(fg: number): { label: string; note: string } {
  if (fg < 15) return { label: "枯枝 Bare Branch", note: "extreme fear" };
  if (fg < 35) return { label: "蕾 First Buds", note: "fear" };
  if (fg < 55) return { label: "開花 Opening", note: "neutral" };
  if (fg < 78) return { label: "花盛り Bloom", note: "greed" };
  return { label: "満開 Full Bloom", note: "extreme greed" };
}
