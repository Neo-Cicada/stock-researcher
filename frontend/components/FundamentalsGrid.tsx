import type { Fundamental } from "@/lib/types";
import { colors } from "@/lib/colors";

export default function FundamentalsGrid({ fundamentals }: { fundamentals: Fundamental[] }) {
  return (
    <div style={{ marginTop: 34 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 10 }}>
        <h2 style={{ fontFamily: "var(--font-mincho)", fontWeight: 700, fontSize: 17, margin: 0 }}>Fundamentals</h2>
        <span style={{ fontSize: 10.5, opacity: 0.5 }}>TTM unless noted</span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 1,
          background: "rgba(33,28,21,0.3)",
          border: "1px solid rgba(33,28,21,0.3)",
        }}
      >
        {fundamentals.map((f) => (
          <div key={f.label} style={{ background: "#F5F0E5", padding: "12px 14px" }}>
            <div style={{ fontSize: 9.5, letterSpacing: "0.16em", opacity: 0.55, marginBottom: 4 }}>{f.label}</div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 16,
                color: f.color === "bullish" ? colors.bullish : f.color === "bearish" ? colors.bearish : undefined,
              }}
            >
              {f.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
