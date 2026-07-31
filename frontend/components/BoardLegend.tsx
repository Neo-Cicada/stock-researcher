/**
 * The disc legend above an almanac board. `accent` is the vermilion disc with
 * its halo (high impact / before open), `ink` the solid sumi disc, `ring` the
 * hollow one. Shared with each page's loading.tsx so the legend is already on
 * screen while the board itself streams in.
 */
export type LegendMark = "accent" | "ink" | "ring";

const MARK_STYLES: Record<LegendMark, React.CSSProperties> = {
  accent: {
    background: "#BE3B33",
    boxShadow: "0 0 0 3px rgba(190,59,51,0.12)",
  },
  ink: { background: "#211C15" },
  ring: {
    borderWidth: 1.5,
    borderStyle: "solid",
    borderColor: "#211C15",
  },
};

export default function BoardLegend({
  items,
}: {
  items: readonly { mark: LegendMark; label: string }[];
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 20,
        flexWrap: "wrap",
        margin: "2px 0 0",
      }}
    >
      {items.map(({ mark, label }) => (
        <span
          key={label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            letterSpacing: "0.06em",
            opacity: 0.7,
          }}
        >
          <span
            style={{
              width: 11,
              height: 11,
              borderRadius: "50%",
              display: "inline-block",
              ...MARK_STYLES[mark],
            }}
          />
          {label}
        </span>
      ))}
    </div>
  );
}
