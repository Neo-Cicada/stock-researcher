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

// Fetches live backend data at request time; skip build-time prerender so a
// slow/unreachable backend can't time out the Vercel build (falls back to mock).
export const dynamic = "force-dynamic";

async function getInitialRows(): Promise<{
  rows: ReturnType<typeof getTrendingRows>;
  live: boolean;
}> {
  try {
    const data = await fetchTrending(undefined, 100);
    // An empty array means the backend answered but has no data yet — still a
    // live connection, so don't cry "sample data" for a cold cache.
    return { rows: data.map(apiRowToView), live: true };
  } catch {
    // Backend unreachable — fall back to mock and flag it.
    return { rows: getTrendingRows(), live: false };
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
  const [initial, season, themes] = await Promise.all([
    getInitialRows(),
    getMarketSeason(),
    getThemes(),
  ]);
  const { rows, live } = initial;

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
        socialBullishPct={season.socialBullishPct}
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

      {!live && (
        <div
          role="status"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 18,
            padding: "5px 11px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "#C3423F",
            borderRadius: 2,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.16em",
            color: "#C3423F",
          }}
        >
          <span
            style={{ width: 6, height: 6, borderRadius: "50%", background: "#C3423F" }}
          />
          SAMPLE DATA · BACKEND UNREACHABLE
        </div>
      )}

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
