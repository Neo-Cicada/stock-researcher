"use client";

import { useState } from "react";
import type { Pillar } from "@/lib/types";

const PETAL_ANGLES = [0, 72, 144, 216, 288];

export default function ScorecardPillars({ pillars }: { pillars: Pillar[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="kbk-pillars-grid">
      {pillars.map((p) => {
        const h = (54 * p.score) / 100;
        const rectY = 62 - h;
        const rectH = h + 4;
        const cid = `kbk-clip-${p.key}`;
        const isExpanded = expanded;

        return (
          <div
            key={p.key}
            onClick={() => setExpanded((cur) => !cur)}
            className="kbk-pillar"
            style={{ background: "#F5F0E5", padding: "22px 18px 16px", cursor: "pointer", display: "flex", flexDirection: "column" }}
          >
            <svg width={66} height={66} viewBox="0 0 66 66" style={{ display: "block", marginBottom: 12, pointerEvents: "none" }}>
              <defs>
                <clipPath id={cid}>
                  {PETAL_ANGLES.map((deg) => (
                    <ellipse key={deg} cx={0} cy={-13} rx={8.6} ry={13.6} transform={`translate(33,35)${deg ? ` rotate(${deg})` : ""}`} />
                  ))}
                </clipPath>
              </defs>
              <g transform="translate(33,35)">
                {PETAL_ANGLES.map((deg) => (
                  <ellipse
                    key={deg}
                    cx={0}
                    cy={-13}
                    rx={8.6}
                    ry={13.6}
                    fill="#E3DCCA"
                    stroke="#211C15"
                    strokeWidth={0.8}
                    transform={deg ? `rotate(${deg})` : undefined}
                  />
                ))}
              </g>
              <rect x={0} y={rectY} width={66} height={rectH} fill="#2A241C" clipPath={`url(#${cid})`} />
              <g transform="translate(33,35)">
                <circle r={3.4} fill="#E8B4B8" stroke="#211C15" strokeWidth={0.6} />
              </g>
            </svg>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <h3 style={{ fontFamily: "var(--font-mincho)", fontSize: 16, fontWeight: 700, margin: 0 }}>{p.name}</h3>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 600, marginLeft: "auto" }}>{p.score}</span>
            </div>
            <div style={{ fontSize: 10, letterSpacing: "0.14em", opacity: 0.5, marginTop: 3 }}>WEIGHT {p.weight}%</div>
            <div style={{ fontSize: 10.5, opacity: 0.55, marginTop: 10, borderTop: "1px solid rgba(33,28,21,0.16)", paddingTop: 8 }}>
              {p.hintText}
            </div>
            {isExpanded && (
              <div style={{ marginTop: 10 }}>
                {p.inputs.map((inp) => (
                  <div
                    key={inp.k}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      padding: "4.5px 0",
                      borderBottom: "1px solid rgba(33,28,21,0.12)",
                      fontSize: 11,
                    }}
                  >
                    <span style={{ opacity: 0.65 }}>{inp.k}</span>
                    <span style={{ fontFamily: "var(--font-mono)" }}>{inp.v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
