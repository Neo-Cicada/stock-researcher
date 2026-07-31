import type { LegendMark } from "@/components/BoardLegend";

/** Session discs for the earnings almanac. Shared with loading.tsx. */
export const EARNINGS_LEGEND: readonly { mark: LegendMark; label: string }[] = [
  { mark: "accent", label: "before open" },
  { mark: "ink", label: "after close" },
  { mark: "ring", label: "during hours" },
];
