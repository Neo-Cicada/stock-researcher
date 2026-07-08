const SKEL_ROWS = [1, 2, 3, 4, 5, 6, 7, 8];

// Ink-stroke skeleton state — fades in/out while trending data "loads".
export default function TrendingSkeleton() {
  return (
    <div>
      {SKEL_ROWS.map((row) => (
        <div
          key={row}
          data-skel-row
          style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
            padding: "11px 0",
            borderBottom: "1px solid rgba(33,28,21,0.12)",
          }}
        >
          <span data-skel style={{ height: 9, width: 46, background: "#211C15" }} />
          <span data-skel style={{ height: 9, flex: "1 1 auto", background: "#211C15" }} />
          <span data-skel style={{ height: 9, width: 64, background: "#211C15" }} />
          <span data-skel style={{ height: 9, width: 88, background: "#211C15" }} />
        </div>
      ))}
      <div style={{ fontFamily: "var(--font-mincho)", fontSize: 12, opacity: 0.45, paddingTop: 14, letterSpacing: "0.1em" }}>
        墨を磨っています — grinding the ink…
      </div>
    </div>
  );
}
