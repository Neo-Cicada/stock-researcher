const CARDS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Ink-fade placeholder for the /institutions hanko-seal grid. Mirrors
 * InstitutionsGrid's column track and card padding so the real cards drop
 * straight into the same slots.
 */
export default function SealGridSkeleton() {
  return (
    <div
      aria-hidden="true"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
        gap: 16,
      }}
    >
      {CARDS.map((card) => (
        <div
          key={card}
          data-skel-row
          style={{
            padding: "16px 16px 15px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "rgba(33,28,21,0.18)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <span
            data-skel
            style={{ height: 46, width: 46, background: "#211C15" }}
          />
          <span data-skel style={{ height: 10, width: "72%", background: "#211C15" }} />
          <span data-skel style={{ height: 8, width: "44%", background: "#211C15" }} />
          <span data-skel style={{ height: 8, width: "58%", background: "#211C15" }} />
        </div>
      ))}
    </div>
  );
}
