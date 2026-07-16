import EarningsBoard from "@/components/EarningsBoard";
import { EARNINGS_SCHEDULE } from "@/lib/dashboard";
import { fetchEarnings } from "@/lib/api";

async function getEarnings() {
  // Falls back to the mock EARNINGS_SCHEDULE when the endpoint is unavailable.
  return (await fetchEarnings()) ?? EARNINGS_SCHEDULE;
}

export default async function EarningsPage() {
  const earnings = await getEarnings();
  const reportCount = earnings.length;

  return (
    <main data-screen-label="Earnings" className="kbk-page-main">
      <span className="kbk-abs-label">決算予定</span>

      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap", paddingTop: 44, marginBottom: 4 }}>
        <h1 style={{ fontFamily: "var(--font-mincho)", fontWeight: 800, fontSize: 30, letterSpacing: "0.02em", margin: 0 }}>
          Earnings Schedule
        </h1>
        <span
          style={{
            fontFamily: "var(--font-mincho)",
            background: "#BE3B33",
            color: "#F5F0E5",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.14em",
            padding: "4px 8px 3px",
            transform: "rotate(-2.5deg)",
            display: "inline-block",
          }}
        >
          決算
        </span>
        <span style={{ fontSize: 12, opacity: 0.55 }}>
          {reportCount} upcoming {reportCount === 1 ? "report" : "reports"} · tap a row for the stock
        </span>
      </div>

      {/* Session legend */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", margin: "2px 0 0" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.06em", opacity: 0.7 }}>
          <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#BE3B33", boxShadow: "0 0 0 3px rgba(190,59,51,0.12)", display: "inline-block" }} />
          before open
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.06em", opacity: 0.7 }}>
          <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#211C15", display: "inline-block" }} />
          after close
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.06em", opacity: 0.7 }}>
          <span style={{ width: 11, height: 11, borderRadius: "50%", borderWidth: 1.5, borderStyle: "solid", borderColor: "#211C15", display: "inline-block" }} />
          during hours
        </span>
      </div>

      <svg viewBox="0 0 1100 8" preserveAspectRatio="none" style={{ width: "100%", height: 7, display: "block", margin: "14px 0 26px 0" }}>
        <path
          d="M0 5 C 180 2, 420 7, 640 4 C 820 1.5, 980 5.5, 1100 3.5"
          fill="none"
          stroke="#211C15"
          strokeWidth={1.6}
          strokeLinecap="round"
          opacity={0.75}
        />
      </svg>

      <EarningsBoard earnings={earnings} />

      <footer className="kbk-footer">
        <span style={{ fontSize: 10.5, letterSpacing: "0.16em", opacity: 0.5 }}>RESEARCH, NOT INVESTMENT ADVICE.</span>
        <span className="kbk-footer-right" style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, opacity: 0.4 }}>estimates · data delayed 15 min</span>
      </footer>
    </main>
  );
}
