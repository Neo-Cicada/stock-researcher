// Deterministic seeded RNG (Lehmer / Park-Miller LCG) so every render — server
// and client — produces identical mock data for a given ticker.
export function makeRng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

// FNV-1a: short inputs (1-3 char tickers are common) need a hash that avalanches
// well immediately — a plain polynomial hash leaves tiny seeds for short strings,
// which biases the LCG's very first draw toward small values.
export function hashSeed(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h = h >>> 0;
  return (h % 2147483646) + 1;
}

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
