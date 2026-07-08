import { petalsOf } from "@/lib/series";

interface PetalMeterProps {
  score: number;
  width?: number;
  height?: number;
}

// A row of 5 petals, filled green/red by score out of 5 — the sentiment glyph
// used in the trending table and representative-post cards.
export default function PetalMeter({ score, width = 58, height = 15 }: PetalMeterProps) {
  const petals = petalsOf(score);
  return (
    <svg width={width} height={height} viewBox="0 0 58 15">
      {petals.map((p, i) => (
        <ellipse key={i} cx={p.cx} cy={7.5} rx={3.4} ry={5.6} fill={p.fill} />
      ))}
    </svg>
  );
}
