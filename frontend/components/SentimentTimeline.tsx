export default function SentimentTimeline({
  sentPath,
  sentLastX,
  sentLastY,
}: {
  sentPath: string;
  sentLastX: number;
  sentLastY: number;
}) {
  return (
    <svg viewBox="0 0 760 64" style={{ width: "100%", height: "auto", display: "block" }}>
      <line x1={0} x2={712} y1={32} y2={32} stroke="#211C15" strokeWidth={0.6} opacity={0.3} strokeDasharray="2 4" />
      <text x={718} y={14} fontFamily="IBM Plex Mono, monospace" fontSize={9.5} fill="#4A7C59">
        強気
      </text>
      <text x={718} y={58} fontFamily="IBM Plex Mono, monospace" fontSize={9.5} fill="#C3423F">
        弱気
      </text>
      <path d={sentPath} fill="none" stroke="#211C15" strokeWidth={1.5} strokeLinecap="round" opacity={0.85} />
      <circle cx={sentLastX} cy={sentLastY} r={2.6} fill="#4A7C59" />
    </svg>
  );
}
