import { branchTwigs, branchBlossomsAndBuds, seasonLabel } from "@/lib/series";
import { colors } from "@/lib/colors";
import { BlossomFlower, BudGlyph } from "./BlossomFlower";

interface MarketSeasonBranchProps {
  fearGreed: number;
  direction: "bullish" | "bearish";
  vix: string;
  vixChange: string;
  putCall: string;
  breadth: string;
  socialAggregate: string;
}

export default function MarketSeasonBranch({
  fearGreed,
  direction,
  vix,
  vixChange,
  putCall,
  breadth,
  socialAggregate,
}: MarketSeasonBranchProps) {
  const petalColor = direction === "bullish" ? colors.bullish : colors.bearish;
  const { blossoms, buds } = branchBlossomsAndBuds(fearGreed, petalColor);
  const twigs = branchTwigs();
  const { label, note } = seasonLabel(fearGreed);
  const seasonColor = fearGreed >= 55 ? colors.bullish : fearGreed < 35 ? colors.bearish : colors.ink;

  return (
    <section className="kbk-branch-outer">
      <div style={{ flex: "1 1 auto", position: "relative", minWidth: 0 }}>
        <div className="kbk-branch-heading">
          <h1 style={{ fontFamily: "var(--font-mincho)", fontWeight: 700, fontSize: 21, margin: 0, letterSpacing: "0.04em" }}>
            The Market Season
          </h1>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: seasonColor }}>{label}</span>
          <span style={{ fontSize: 11, opacity: 0.5, letterSpacing: "0.1em" }}>{note}</span>
        </div>
        <svg viewBox="0 0 1000 150" style={{ width: "100%", height: "auto", display: "block" }} xmlns="http://www.w3.org/2000/svg">
          <path
            d="M -12 130 C 90 120, 170 98, 300 93 C 430 88, 520 71, 640 65 C 760 59, 862 66, 1012 47"
            fill="none"
            stroke="#2A241C"
            strokeWidth={4.6}
            strokeLinecap="round"
          />
          <path
            d="M -12 132 C 100 124, 200 100, 330 92 C 460 84, 560 68, 690 62 C 800 57, 890 62, 1012 49"
            fill="none"
            stroke="#2A241C"
            strokeWidth={1.6}
            strokeLinecap="round"
            opacity={0.55}
          />
          {twigs.map((t, i) => (
            <path key={i} d={t.d} fill="none" stroke="#2A241C" strokeWidth={1.5} strokeLinecap="round" opacity={0.85} />
          ))}
          {buds.map((bud, i) => (
            <g key={i} transform={bud.tf}>
              <BudGlyph />
            </g>
          ))}
          {blossoms.map((b, i) => (
            <g key={i} transform={b.tf}>
              <BlossomFlower color={b.color!} />
            </g>
          ))}
        </svg>
        <div
          data-petal
          style={{
            position: "absolute",
            left: "38%",
            top: 46,
            pointerEvents: "none",
            opacity: 0,
            animation: "kabuka-drift-a 17s linear infinite",
          }}
        >
          <svg width={11} height={13} viewBox="0 0 10 12">
            <path d="M5 0 C8.6 3, 8.6 8, 5 12 C1.4 8, 1.4 3, 5 0 Z" fill={petalColor} opacity={0.8} />
          </svg>
        </div>
        <div
          data-petal
          style={{
            position: "absolute",
            left: "72%",
            top: 30,
            pointerEvents: "none",
            opacity: 0,
            animation: "kabuka-drift-b 23s linear infinite",
            animationDelay: "6s",
          }}
        >
          <svg width={9} height={11} viewBox="0 0 10 12">
            <path d="M5 0 C8.6 3, 8.6 8, 5 12 C1.4 8, 1.4 3, 5 0 Z" fill={petalColor} opacity={0.8} />
          </svg>
        </div>
      </div>

      <aside className="kbk-branch-gauge">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            paddingBottom: 8,
            borderBottom: "1px solid rgba(33,28,21,0.3)",
          }}
        >
          <span style={{ fontSize: 10, letterSpacing: "0.22em", opacity: 0.6 }}>SEASON GAUGE</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 600 }}>
            {fearGreed}
            <span style={{ fontSize: 10, opacity: 0.5 }}> /100</span>
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(33,28,21,0.16)", fontSize: 11.5 }}>
          <span style={{ opacity: 0.65 }}>VIX</span>
          <span style={{ fontFamily: "var(--font-mono)" }}>
            {vix} <span style={{ color: colors.bullish }}>{vixChange}</span>
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(33,28,21,0.16)", fontSize: 11.5 }}>
          <span style={{ opacity: 0.65 }}>Put / Call</span>
          <span style={{ fontFamily: "var(--font-mono)" }}>{putCall}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(33,28,21,0.16)", fontSize: 11.5 }}>
          <span style={{ opacity: 0.65 }}>Breadth (adv)</span>
          <span style={{ fontFamily: "var(--font-mono)" }}>{breadth}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", fontSize: 11.5 }}>
          <span style={{ opacity: 0.65 }}>Social aggregate</span>
          <span style={{ fontFamily: "var(--font-mono)", color: petalColor }}>{socialAggregate}</span>
        </div>
      </aside>
    </section>
  );
}
