const ROWS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * Ink-fade placeholder for a date-grouped almanac (/events, /earnings), sized
 * to the real board's rows so content swaps in without shifting the page.
 */
export default function BoardSkeleton() {
  return (
    <div aria-hidden="true">
      {ROWS.map((row) => (
        <div
          key={row}
          data-skel-row
          style={{
            display: "grid",
            gridTemplateColumns: "22px minmax(0,1fr) 88px 88px",
            gap: 16,
            alignItems: "center",
            padding: "11px 0",
            borderBottom: "1px solid rgba(33,28,21,0.12)",
          }}
        >
          <span
            data-skel
            style={{
              height: 11,
              width: 11,
              borderRadius: "50%",
              background: "#211C15",
            }}
          />
          <span data-skel style={{ height: 9, background: "#211C15" }} />
          <span data-skel style={{ height: 9, background: "#211C15" }} />
          <span data-skel style={{ height: 9, background: "#211C15" }} />
        </div>
      ))}
      <div
        style={{
          fontFamily: "var(--font-mincho)",
          fontSize: 12,
          opacity: 0.45,
          paddingTop: 14,
          letterSpacing: "0.1em",
        }}
      >
        墨を磨っています — grinding the ink…
      </div>
    </div>
  );
}
