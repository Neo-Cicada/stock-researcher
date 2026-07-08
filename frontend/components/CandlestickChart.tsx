import type { CandleGeom, GridLine } from "@/lib/series";

export default function CandlestickChart({ candles, grid }: { candles: CandleGeom[]; grid: GridLine[] }) {
  return (
    <svg viewBox="0 0 760 240" style={{ width: "100%", height: "auto", display: "block" }}>
      {grid.map((g, i) => (
        <g key={i}>
          <line x1={0} x2={712} y1={g.y} y2={g.y} stroke="#211C15" strokeWidth={0.5} opacity={0.22} />
          <text x={718} y={g.ty} fontFamily="IBM Plex Mono, monospace" fontSize={10} fill="#211C15" opacity={0.55}>
            {g.label}
          </text>
        </g>
      ))}
      {candles.map((c, i) => (
        <g key={i}>
          <line x1={c.cx} x2={c.cx} y1={c.wy1} y2={c.wy2} stroke={c.color} strokeWidth={1} />
          <rect x={c.bx} y={c.by} width={10} height={c.bh} fill={c.fill} stroke={c.color} strokeWidth={1.1} />
        </g>
      ))}
    </svg>
  );
}
