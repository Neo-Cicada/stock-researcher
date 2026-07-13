import type { Metadata } from "next";
import { getTickerProfile } from "@/lib/tickers";
import { buildPriceSeries, buildRealCandles } from "@/lib/series";
import { fetchTickerHistory, apiFundamentalsToView } from "@/lib/api";
import { compositeScore } from "@/lib/composite";
import ScorecardPillars from "@/components/ScorecardPillars";
import StockHeader from "@/components/StockHeader";
import CandlestickChart from "@/components/CandlestickChart";
import SentimentTimeline from "@/components/SentimentTimeline";
import MentionVolumeChart from "@/components/MentionVolumeChart";
import FundamentalsGrid from "@/components/FundamentalsGrid";
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
  const composite = compositeScore(profile.pillars);

  // Fetch real price/fundamentals from the backend (yfinance). Falls back to
  // the mock `series`/`profile.fundamentals` when unavailable. Sentiment and
  // mention-volume charts always stay mock (they are Reddit crowd data).
  const history = await fetchTickerHistory(profile.ticker);
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
  const weightsLine = profile.pillars.map((p) => `${p.key.toUpperCase()} ${p.weight}`).join(" · ");

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
        name={profile.name}
        exchange={profile.exchange}
        lastClose={lastClose}
        dayChangeAbs={dayChangeAbs}
        dayChangePct={dayChangePct}
        sentimentScore={profile.sentimentScore}
        insufficient={profile.insufficient}
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

        <WhyThisSentiment posts={profile.posts} insufficient={profile.insufficient} quietNote={profile.quietNote} />
      </section>

      <section style={{ marginTop: 52, borderTop: "1.5px solid #211C15", paddingTop: 28 }}>
        <div className="kbk-scorecard-hdr">
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.22em", opacity: 0.55, marginBottom: 2 }}>SCORECARD · {profile.ticker}</div>
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

        <ScorecardPillars pillars={profile.pillars} />

        <div className="kbk-scorecard-footer">
          <span style={{ fontSize: 11, opacity: 0.5 }}>Tap a pillar to see its exact inputs. Fill level = score.</span>
          <span className="kbk-scorecard-footer-right" style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, opacity: 0.4 }}>model v2.3 · rebalanced monthly</span>
        </div>
      </section>
    </main>
  );
}
