import MarketSeasonBranch from "@/components/MarketSeasonBranch";
import TrendingTable from "@/components/TrendingTable";
import ThemesColumn from "@/components/ThemesColumn";
import { getTrendingRows, TODAYS_THEMES, THEMES_QUIET_NOTE, MARKET_STATE } from "@/lib/dashboard";

export default function DashboardPage() {
  const rows = getTrendingRows();

  return (
    <main data-screen-label="Dashboard" className="kbk-page-main">
      <span className="kbk-abs-label">
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

      <section className="kbk-dash-grid">
        <TrendingTable rows={rows} />
        <ThemesColumn themes={TODAYS_THEMES} quietNote={THEMES_QUIET_NOTE} />
      </section>

      <footer className="kbk-footer">
        <span style={{ fontSize: 10.5, letterSpacing: "0.16em", opacity: 0.5 }}>RESEARCH, NOT INVESTMENT ADVICE.</span>
        <span className="kbk-footer-right" style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, opacity: 0.4 }}>data delayed 15 min</span>
      </footer>
    </main>
  );
}
