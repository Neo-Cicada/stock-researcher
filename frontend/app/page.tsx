import MarketSeasonBranch from "@/components/MarketSeasonBranch";
import TrendingTable from "@/components/TrendingTable";
import ThemesColumn from "@/components/ThemesColumn";
import {
  getTrendingRows,
  TODAYS_THEMES,
  THEMES_QUIET_NOTE,
  MARKET_STATE,
} from "@/lib/dashboard";
import {
  fetchTrending,
  apiRowToView,
  fetchMarketSeason,
  fetchThemes,
} from "@/lib/api";

async function getInitialRows() {
  try {
    const data = await fetchTrending(undefined, 100);
    return data.map(apiRowToView);
  } catch {
    // Fallback to mock data if backend is unreachable
    return getTrendingRows();
  }
}

async function getMarketSeason() {
  // Falls back to the mock MARKET_STATE when the endpoint is unavailable.
  return (await fetchMarketSeason()) ?? MARKET_STATE;
}

async function getThemes() {
  // Falls back to the mock TODAYS_THEMES when the endpoint is unavailable.
  return (await fetchThemes()) ?? TODAYS_THEMES;
}

export default async function DashboardPage() {
  const [rows, season, themes] = await Promise.all([
    getInitialRows(),
    getMarketSeason(),
    getThemes(),
  ]);

  return (
    <main data-screen-label="Dashboard" className="kbk-page-main">
      <span className="kbk-abs-label">相場の季節</span>

      <MarketSeasonBranch
        fearGreed={season.fearGreed}
        direction={season.direction}
        vix={season.vix}
        vixChange={season.vixChange}
        putCall={season.putCall}
        breadth={season.breadth}
        socialAggregate={season.socialAggregate}
      />

      <svg
        viewBox="0 0 1100 8"
        preserveAspectRatio="none"
        style={{
          width: "100%",
          height: 7,
          display: "block",
          margin: "10px 0 30px 0",
        }}
      >
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
        <ThemesColumn themes={themes} quietNote={THEMES_QUIET_NOTE} />
      </section>

      <footer className="kbk-footer">
        {/* <span style={{ fontSize: 10.5, letterSpacing: "0.16em", opacity: 0.5 }}>RESEARCH, NOT INVESTMENT ADVICE.</span> */}
        <span
          className="kbk-footer-right"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            opacity: 0.4,
          }}
        >
          data delayed 15 min
        </span>
      </footer>
    </main>
  );
}
