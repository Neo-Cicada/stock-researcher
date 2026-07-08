import type { VolBar } from "@/lib/series";

export default function MentionVolumeChart({
  vols,
  dateTicks,
}: {
  vols: VolBar[];
  dateTicks: { x: number; label: string }[];
}) {
  return (
    <svg viewBox="0 0 760 56" style={{ width: "100%", height: "auto", display: "block" }}>
      <line x1={0} x2={712} y1={52} y2={52} stroke="#211C15" strokeWidth={0.8} opacity={0.4} />
      {vols.map((v, i) => (
        <rect key={i} x={v.x} y={v.y} width={10} height={v.h} fill="#211C15" opacity={0.4} />
      ))}
      {dateTicks.map((dt, i) => (
        <text key={i} x={dt.x} y={46} fontFamily="IBM Plex Mono, monospace" fontSize={9.5} fill="#211C15" opacity={0.55}>
          {dt.label}
        </text>
      ))}
    </svg>
  );
}
