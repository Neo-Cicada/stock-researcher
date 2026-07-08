import type { Pillar } from "./types";

export function compositeScore(pillars: Pillar[]): number {
  const weighted = pillars.reduce((sum, p) => sum + p.score * p.weight, 0);
  return Math.round(weighted / 100);
}
