import type { Metadata } from "next";
import { getTickerProfile } from "@/lib/tickers";
import { compositeScore } from "@/lib/composite";
import ScorecardPillars from "@/components/ScorecardPillars";

type Params = Promise<{ ticker: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { ticker } = await params;
  return { title: `Scorecard — ${ticker.toUpperCase()} · Kabuka` };
}

export default async function ScorecardPage({ params }: { params: Params }) {
  const { ticker: rawTicker } = await params;
  const profile = getTickerProfile(rawTicker);
  const composite = compositeScore(profile.pillars);
  const weightsLine = profile.pillars.map((p) => `${p.key.toUpperCase()} ${p.weight}`).join(" · ");

  return (
    <main
      data-screen-label={`Scorecard — ${profile.ticker}`}
      style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "0 56px 80px 96px" }}
    >
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
        五弁の評
      </span>

      <section style={{ display: "flex", alignItems: "flex-end", gap: 40, padding: "38px 0 24px 0", borderBottom: "1.5px solid #211C15" }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.22em", opacity: 0.55, marginBottom: 2 }}>SCORECARD · {profile.ticker}</div>
          <h1 style={{ fontFamily: "var(--font-mincho)", fontWeight: 800, fontSize: 40, margin: 0 }}>Five-Petal Score</h1>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, paddingBottom: 4 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 56, fontWeight: 600, lineHeight: 1 }}>{composite}</span>
          <span style={{ fontSize: 12, opacity: 0.55 }}>of 100 · composite</span>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right", paddingBottom: 6 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.2em", opacity: 0.55, marginBottom: 5 }}>WEIGHTS</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, opacity: 0.8 }}>{weightsLine}</div>
          <div style={{ fontSize: 10.5, letterSpacing: "0.14em", opacity: 0.5, marginTop: 6 }}>RESEARCH, NOT INVESTMENT ADVICE.</div>
        </div>
      </section>

      <ScorecardPillars pillars={profile.pillars} />

      <div style={{ display: "flex", gap: 20, marginTop: 14, alignItems: "baseline" }}>
        <span style={{ fontSize: 11, opacity: 0.5 }}>Tap a pillar to see its exact inputs. Fill level = score.</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, opacity: 0.4, marginLeft: "auto" }}>model v2.3 · rebalanced monthly</span>
      </div>
    </main>
  );
}
