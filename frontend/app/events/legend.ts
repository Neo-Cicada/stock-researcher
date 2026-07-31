import type { LegendMark } from "@/components/BoardLegend";

/** Impact discs for the economic-events almanac. Shared with loading.tsx. */
export const EVENTS_LEGEND: readonly { mark: LegendMark; label: string }[] = [
  { mark: "accent", label: "high impact" },
  { mark: "ink", label: "medium" },
  { mark: "ring", label: "low" },
];
