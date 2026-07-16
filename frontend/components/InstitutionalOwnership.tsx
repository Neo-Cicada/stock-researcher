import type { InstitutionalOwnershipView } from "@/lib/types";
import { colors } from "@/lib/colors";

function fmtShares(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(n);
}

function fmtUsd(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${Math.round(n).toLocaleString()}`;
}

// Ownership donut geometry.
const R = 52;
const C = 2 * Math.PI * R;

export default function InstitutionalOwnership({
  data,
}: {
  data: InstitutionalOwnershipView;
}) {
  const live = data.source === "yahoo";
  const filled = (Math.max(0, Math.min(100, data.ownershipPct)) / 100) * C;
  const maxShares = Math.max(...data.holders.map((h) => h.shares), 1);

  const subLabelStyle: React.CSSProperties = { fontSize: 10, letterSpacing: "0.22em", opacity: 0.6 };

  return (
    <section style={{ marginTop: 52, borderTop: "1.5px solid #211C15", paddingTop: 28 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
        <span style={subLabelStyle}>INSTITUTIONAL OWNERSHIP · {data.ticker}</span>
        <span
          style={{
            fontFamily: "var(--font-mincho)",
            background: "#BE3B33",
            color: "#F5F0E5",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.14em",
            padding: "3px 6px 2px",
            transform: "rotate(-2.5deg)",
            display: "inline-block",
          }}
        >
          機関
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, opacity: 0.5 }}>
          {live ? "source: Yahoo Finance · 13F/N-PORT" : "modeled estimate · live data unavailable"}
        </span>
      </div>

      <div style={{ display: "flex", gap: 44, flexWrap: "wrap", alignItems: "center", marginTop: 14 }}>
        {/* Ownership donut */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <svg viewBox="0 0 132 132" style={{ width: 150, height: 150, display: "block" }}>
            <circle cx={66} cy={66} r={R} fill="none" stroke={colors.petalEmpty} strokeWidth={13} />
            <circle
              cx={66}
              cy={66}
              r={R}
              fill="none"
              stroke={colors.ink}
              strokeWidth={13}
              strokeLinecap="round"
              strokeDasharray={`${filled} ${C - filled}`}
              transform="rotate(-90 66 66)"
            />
            <text x={66} y={62} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize={30} fontWeight={600} fill="#211C15">
              {Math.round(data.ownershipPct)}%
            </text>
            <text x={66} y={80} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize={9} letterSpacing="0.14em" fill="#211C15" opacity={0.55}>
              INSTITUTIONAL
            </text>
          </svg>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, opacity: 0.7, textAlign: "center" }}>
            {data.institutionsCount.toLocaleString()} filers
          </div>
        </div>

        {/* Top holders */}
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ ...subLabelStyle, marginBottom: 12 }}>TOP HOLDERS · BY SHARES</div>
          {data.holders.map((h) => {
            const up = h.changePct >= 0;
            return (
              <div key={h.name} style={{ marginBottom: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 5 }}>
                  <span style={{ fontFamily: "var(--font-mincho)", fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {h.name}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                    {fmtShares(h.shares)}
                    <span style={{ opacity: 0.45 }}> · {fmtUsd(h.value)}</span>
                    <span style={{ color: up ? colors.bullish : colors.bearish, marginLeft: 8 }}>
                      {up ? "▲" : "▼"}
                      {Math.abs(h.changePct).toFixed(1)}%
                    </span>
                  </span>
                </div>
                <div style={{ height: 9, background: "rgba(33,28,21,0.08)" }}>
                  <div style={{ height: "100%", width: `${(h.shares / maxShares) * 100}%`, background: colors.ink, opacity: 0.85 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
