import type { Metadata } from "next";
import { getTickerProfile } from "@/lib/tickers";
import { buildPriceSeries, buildRealCandles, buildInstitutionalMock } from "@/lib/series";
import {
  fetchTickerHistory,
  apiFundamentalsToView,
  apiScorecardToPillars,
  fetchTickerNews,
  fetchInstitutionalOwnership,
  buildExtendedQuote,
} from "@/lib/api";
import { compositeScore } from "@/lib/composite";
import ScorecardPillars from "@/components/ScorecardPillars";
import StockHeader from "@/components/StockHeader";
import CandlestickChart from "@/components/CandlestickChart";
import SentimentTimeline from "@/components/SentimentTimeline";
import MentionVolumeChart from "@/components/MentionVolumeChart";
import FundamentalsGrid from "@/components/FundamentalsGrid";
import InstitutionalOwnership from "@/components/InstitutionalOwnership";
import WhyThisSentiment from "@/components/WhyThisSentiment";
import BareTwig from "@/components/BareTwig";

type Params = Promise<{ ticker: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { ticker } = await params;
  return { title: `${ticker.toUpperCase()} · Kabuka` };
}

export default async function StockDetailPage({ params }: { params: Params }) {
  const { ticker: rawTicker } = await params;
  const profile = getTickerProfile(rawTicker);
  const series = buildPriceSeries(profile);

  // Fetch real price/fundamentals (yfinance) and real headlines (Finnhub) from
  // the backend in parallel. Price falls back to the mock `series`/
  // `profile.fundamentals` when unavailable; news falls back to a quiet note.
  // The sentiment and mention-volume charts always stay mock (Reddit crowd
  // data). `profile.name` is passed as the news relevance-ranking hint.
  const [history, news, institutional] = await Promise.all([
    fetchTickerHistory(profile.ticker),
    fetchTickerNews(profile.ticker, profile.name),
    fetchInstitutionalOwnership(profile.ticker),
  ]);
  // Live Yahoo Finance ownership when available; otherwise deterministic mock.
  const ownership = institutional ?? buildInstitutionalMock(profile);
  const real = history ? buildRealCandles(history.candles) : null;
  const realFundamentals = history ? apiFundamentalsToView(history) : [];

  const candles = real ? real.candles : series.candles;
  const grid = real ? real.grid : series.grid;
  const lastClose = real ? real.lastClose : series.lastClose;
  const dayChangeAbs = real ? real.dayChangeAbs : series.dayChangeAbs;
  const dayChangePct = real ? real.dayChangePct : series.dayChangePct;
  const fundamentals =
    realFundamentals.length > 0 ? realFundamentals : profile.fundamentals;
  const priceLabel = real
    ? `PRICE · ${history!.candles.length} SESSIONS · LIVE`
    : "PRICE · 42 SESSIONS";
  // Prefer the real company name from the live /history payload; fall back to
  // the mock profile name when live data (or the name field) is unavailable.
  const displayName = history?.name || profile.name;
  // Pre-/post-market quote — only present on live data during an extended
  // session; null during regular hours or on the mock fallback.
  const extended = history
    ? buildExtendedQuote(
        history.extended_price,
        history.extended_change_pct,
        history.market_state,
      )
    : null;

  // Real Five-Petal scorecard from live fundamentals when available: the
  // backend computes Value/Growth/Quality/Momentum, and the mock Sentiment
  // pillar (crowd data has no live source) is appended. Falls back to the
  // fully-mock pillars otherwise.
  const mockSentiment =
    profile.pillars.find((p) => p.key === "snt") ?? profile.pillars[profile.pillars.length - 1];
  const realPillars = history ? apiScorecardToPillars(history, mockSentiment) : null;
  const pillars = realPillars ?? profile.pillars;
  const scoreIsLive = realPillars !== null;
  const composite = compositeScore(pillars);
  const weightsLine = pillars.map((p) => `${p.key.toUpperCase()} ${p.weight}`).join(" · ");

  const subheadingStyle: React.CSSProperties = { display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 };
  const subLabelStyle: React.CSSProperties = { fontSize: 10, letterSpacing: "0.22em", opacity: 0.6 };
  const subNoteStyle: React.CSSProperties = { fontFamily: "var(--font-mono)", fontSize: 10.5, opacity: 0.5 };

  return (
    <main
      data-screen-label={`Stock Detail — ${profile.ticker}`}
      className="kbk-page-main"
    >
      <span className="kbk-abs-label">
        銘柄研究
      </span>

      <StockHeader
        ticker={profile.ticker}
        name={displayName}
        exchange={profile.exchange}
        lastClose={lastClose}
        dayChangeAbs={dayChangeAbs}
        dayChangePct={dayChangePct}
        sentimentScore={profile.sentimentScore}
        insufficient={profile.insufficient}
        extended={extended}
      />

      <section className="kbk-stock-grid">
        <div>
          <div style={subheadingStyle}>
            <span style={subLabelStyle}>{priceLabel}</span>
            <span style={subNoteStyle}>candles: green = up · vermilion = down</span>
          </div>
          <CandlestickChart candles={candles} grid={grid} />

          {profile.insufficient ? (
            <div style={{ margin: "22px 0 4px 0" }}>
              <BareTwig
                width={92}
                height={44}
                note={`Crowd sentiment and mention volume — ${profile.quietNote}`}
              />
            </div>
          ) : (
            <>
              <div style={{ ...subheadingStyle, margin: "18px 0 4px 0" }}>
                <span style={subLabelStyle}>CROWD SENTIMENT</span>
                <span style={subNoteStyle}>−1 … +1, same axis</span>
              </div>
              <SentimentTimeline sentPath={series.sentPath} sentLastX={series.sentLastX} sentLastY={series.sentLastY} />

              <div style={{ ...subheadingStyle, margin: "14px 0 4px 0" }}>
                <span style={subLabelStyle}>MENTION VOLUME</span>
                <span style={subNoteStyle}>posts / session</span>
              </div>
              <MentionVolumeChart vols={series.vols} dateTicks={series.dateTicks} />
            </>
          )}

          <FundamentalsGrid fundamentals={fundamentals} />
        </div>

        <WhyThisSentiment ticker={profile.ticker} news={news} />
      </section>

      <InstitutionalOwnership data={ownership} />

      <section style={{ marginTop: 52, borderTop: "1.5px solid #211C15", paddingTop: 28 }}>
        <div className="kbk-scorecard-hdr">
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.22em", opacity: 0.55, marginBottom: 2, display: "flex", alignItems: "center", gap: 8 }}>
              <span>SCORECARD · {profile.ticker}</span>
              {scoreIsLive && (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.14em", color: "#4A7C59", borderWidth: 1, borderStyle: "solid", borderColor: "#4A7C59", borderRadius: 2, padding: "1px 5px" }}>
                  LIVE
                </span>
              )}
            </div>
            <h2 style={{ fontFamily: "var(--font-mincho)", fontWeight: 800, fontSize: 32, margin: 0 }}>Five-Petal Score</h2>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, paddingBottom: 4 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 48, fontWeight: 600, lineHeight: 1 }}>{composite}</span>
            <span style={{ fontSize: 12, opacity: 0.55 }}>of 100 · composite</span>
          </div>
          <div className="kbk-scorecard-weights">
            <div style={{ fontSize: 10, letterSpacing: "0.2em", opacity: 0.55, marginBottom: 5 }}>WEIGHTS</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, opacity: 0.8 }}>{weightsLine}</div>
          </div>
        </div>

        <ScorecardPillars pillars={pillars} />

        <div className="kbk-scorecard-footer">
          <span style={{ fontSize: 11, opacity: 0.5 }}>Tap a pillar to see its exact inputs. Fill level = score.</span>
          <span className="kbk-scorecard-footer-right" style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, opacity: 0.4 }}>
            {scoreIsLive
              ? "computed from live fundamentals · sentiment = crowd (illustrative)"
              : "illustrative model · sample data"}
          </span>
        </div>
      </section>
    </main>
  );
}
