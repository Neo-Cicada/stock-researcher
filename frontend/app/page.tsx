import MarketSeasonBranch from "@/components/MarketSeasonBranch";
import TrendingTable from "@/components/TrendingTable";
import ThemesColumn from "@/components/ThemesColumn";
import { getTrendingRows, TODAYS_THEMES, THEMES_QUIET_NOTE, MARKET_STATE } from "@/lib/dashboard";

export default function DashboardPage() {
  const rows = getTrendingRows();

  return (
    <main data-screen-label="Dashboard" style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "0 56px 80px 96px" }}>
      <span
        style={{
          position: "absolute",
          left: 34,
          top: 52,
          writingMode: "vertical-rl",
          fontFamily: "var(--font-mincho)",
          fontSize: 15,
          letterSpacing: "0.5em",
          opacity: 0.5,
        }}
      >
        相場の季節
      </span>

      <MarketSeasonBranch
        fearGreed={MARKET_STATE.fearGreed}
        direction={MARKET_STATE.direction}
        vix={MARKET_STATE.vix}
        vixChange={MARKET_STATE.vixChange}
        putCall={MARKET_STATE.putCall}
        breadth={MARKET_STATE.breadth}
        socialAggregate={MARKET_STATE.socialAggregate}
      />

      <svg viewBox="0 0 1100 8" preserveAspectRatio="none" style={{ width: "100%", height: 7, display: "block", margin: "10px 0 30px 0" }}>
        <path
          d="M0 5 C 180 2, 420 7, 640 4 C 820 1.5, 980 5.5, 1100 3.5"
          fill="none"
          stroke="#211C15"
          strokeWidth={1.6}
          strokeLinecap="round"
          opacity={0.75}
        />
      </svg>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 316px", gap: 56, alignItems: "start" }}>
        <TrendingTable rows={rows} />
        <ThemesColumn themes={TODAYS_THEMES} quietNote={THEMES_QUIET_NOTE} />
      </section>

      <footer style={{ marginTop: 56, display: "flex", alignItems: "baseline", gap: 16, borderTop: "1px solid rgba(33,28,21,0.3)", paddingTop: 12 }}>
        <span style={{ fontSize: 10.5, letterSpacing: "0.16em", opacity: 0.5 }}>RESEARCH, NOT INVESTMENT ADVICE.</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, opacity: 0.4, marginLeft: "auto" }}>data delayed 15 min</span>
      </footer>
    </main>
  );
}
