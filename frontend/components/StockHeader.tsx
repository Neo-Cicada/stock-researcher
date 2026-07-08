import { colors, directionColor } from "@/lib/colors";
import { BlossomFlower } from "./BlossomFlower";

interface StockHeaderProps {
  ticker: string;
  name: string;
  exchange: string;
  lastClose: number;
  dayChangeAbs: number;
  dayChangePct: number;
  sentimentScore: number;
  insufficient: boolean;
}

export default function StockHeader({
  ticker,
  name,
  exchange,
  lastClose,
  dayChangeAbs,
  dayChangePct,
  sentimentScore,
  insufficient,
}: StockHeaderProps) {
  const up = dayChangePct >= 0;
  const changeColor = up ? colors.bullish : colors.bearish;
  const sprigColor = directionColor(sentimentScore);

  return (
    <section className="kbk-stockhdr">
      <div>
        <div style={{ fontSize: 11, letterSpacing: "0.22em", opacity: 0.55, marginBottom: 2 }}>
          {name} · {exchange}
        </div>
        <h1 style={{ fontFamily: "var(--font-mincho)", fontWeight: 800, fontSize: "var(--kbk-ticker-font-size)", lineHeight: 0.95, margin: 0, letterSpacing: "0.02em" }}>
          {ticker}
        </h1>
      </div>
      <div style={{ paddingBottom: 6 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 30, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {lastClose.toFixed(2)}
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 13.5, color: changeColor }}>
          {(up ? "+" : "−") + Math.abs(dayChangeAbs).toFixed(2)} · {(up ? "+" : "−") + Math.abs(dayChangePct).toFixed(2)}%
        </div>
      </div>
      <div className="kbk-stockhdr-sentiment">
        <div style={{ fontSize: 10, letterSpacing: "0.2em", opacity: 0.55, marginBottom: 4 }}>
          COMPOSITE SENTIMENT · {insufficient ? "TOO QUIET" : `${sentimentScore} ${sentimentScore >= 50 ? "BULLISH" : "BEARISH"}`}
        </div>
        {insufficient ? (
          <svg width={150} height={46} viewBox="0 0 150 46" style={{ opacity: 0.55 }}>
            <path d="M4 42 C 40 36, 80 26, 146 12" fill="none" stroke="#2A241C" strokeWidth={2.6} strokeLinecap="round" />
          </svg>
        ) : (
          <svg width={150} height={46} viewBox="0 0 150 46">
            <path d="M4 42 C 40 36, 80 26, 146 12" fill="none" stroke="#2A241C" strokeWidth={2.6} strokeLinecap="round" />
            <path d="M52 32 Q 58 24, 56 18" fill="none" stroke="#2A241C" strokeWidth={1.2} strokeLinecap="round" />
            <g transform="translate(56,15)">
              <BlossomFlower color={sprigColor} petalRx={2.1} petalRy={3.5} centerR={1.3} cy={-3.4} />
            </g>
            <g transform="translate(104,22)">
              <BlossomFlower color={sprigColor} petalRx={2.1} petalRy={3.5} centerR={1.3} cy={-3.4} />
            </g>
            <g transform="translate(138,11)">
              <BlossomFlower color={sprigColor} petalRx={2.1} petalRy={3.5} centerR={1.3} cy={-3.4} />
            </g>
          </svg>
        )}
      </div>
    </section>
  );
}
