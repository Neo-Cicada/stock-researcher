"use client";

import { useState } from "react";
import Link from "next/link";
import type { InstitutionHoldingView } from "@/lib/dashboard";
import { colors } from "@/lib/colors";

const PER_PAGE = 12;
const GRID_COLS = "30px minmax(0,1fr) 96px 128px";

export default function HoldingsBoard({
  holdings,
}: {
  holdings: InstitutionHoldingView[];
}) {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(holdings.length / PER_PAGE));
  const start = page * PER_PAGE;
  const pageItems = holdings.slice(start, start + PER_PAGE);
  // Scale bars against the top holding on the page so weights stay legible.
  const maxPct = Math.max(...holdings.map((h) => h.pct), 1);

  const btnBase: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    letterSpacing: "0.08em",
    padding: "5px 14px",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(33,28,21,0.35)",
    background: "transparent",
    color: colors.ink,
    cursor: "pointer",
  };
  const btnDisabled: React.CSSProperties = { ...btnBase, opacity: 0.25, cursor: "default" };

  return (
    <div className="kbk-trending-scroll">
      <div className="kbk-trending-inner" style={{ minWidth: 360 }}>
        {/* Column legend */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: GRID_COLS,
            gap: 12,
            fontSize: 9.5,
            letterSpacing: "0.18em",
            opacity: 0.5,
            paddingBottom: 6,
          }}
        >
          <span aria-hidden />
          <span>HOLDING</span>
          <span style={{ textAlign: "right" }}>VALUE</span>
          <span style={{ textAlign: "right" }}>WEIGHT</span>
        </div>

        {/* Rows — keyed by page so the stagger replays on paging. */}
        <div key={page}>
          {pageItems.map((h, ii) => {
            const rank = start + ii + 1;
            const rowInner = (
              <>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    opacity: 0.4,
                    fontVariantNumeric: "tabular-nums",
                    textAlign: "right",
                  }}
                >
                  {rank}
                </span>
                <span style={{ minWidth: 0 }}>
                  {/* Ticker-first: the symbol leads, issuer name is the subtitle.
                      ETFs / unresolved CUSIPs fall back to the issuer as lead. */}
                  {h.ticker ? (
                    <>
                      <span
                        style={{
                          display: "block",
                          fontFamily: "var(--font-mono)",
                          fontSize: 15,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          color: colors.hanko,
                        }}
                      >
                        {h.ticker}
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontFamily: "var(--font-mono)",
                          fontSize: 10,
                          letterSpacing: "0.06em",
                          opacity: 0.55,
                          marginTop: 2,
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          textTransform: "capitalize",
                        }}
                      >
                        {h.issuer.toLowerCase()} · {h.shares} sh
                      </span>
                    </>
                  ) : (
                    <>
                      <span
                        style={{
                          display: "block",
                          fontFamily: "var(--font-mincho)",
                          fontSize: 15,
                          fontWeight: 700,
                          letterSpacing: "0.01em",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          textTransform: "capitalize",
                        }}
                      >
                        {h.issuer.toLowerCase()}
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontFamily: "var(--font-mono)",
                          fontSize: 10,
                          letterSpacing: "0.1em",
                          opacity: 0.55,
                          marginTop: 2,
                        }}
                      >
                        {h.shares} sh
                      </span>
                    </>
                  )}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                    alignSelf: "center",
                  }}
                >
                  {h.value}
                </span>
                <span style={{ alignSelf: "center" }}>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      justifyContent: "flex-end",
                    }}
                  >
                    <span
                      style={{
                        position: "relative",
                        flex: 1,
                        height: 6,
                        background: "rgba(33,28,21,0.1)",
                        overflow: "hidden",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: `${(h.pct / maxPct) * 100}%`,
                          background: colors.bullish,
                          opacity: 0.85,
                        }}
                      />
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        fontVariantNumeric: "tabular-nums",
                        opacity: 0.75,
                        minWidth: 42,
                        textAlign: "right",
                      }}
                    >
                      {h.pctLabel}
                    </span>
                  </span>
                </span>
              </>
            );

            const rowStyle: React.CSSProperties = {
              display: "grid",
              gridTemplateColumns: GRID_COLS,
              gap: 12,
              alignItems: "center",
              padding: "11px 0",
              borderBottom: "1px solid rgba(33,28,21,0.12)",
              animationDelay: `${(ii + 1) * 40}ms`,
            };

            return h.ticker ? (
              <Link
                key={`${h.issuer}-${ii}`}
                href={`/stock/${h.ticker.toLowerCase()}`}
                className="kbk-row"
                data-rise
                style={{ ...rowStyle, cursor: "pointer", color: colors.ink, textDecoration: "none" }}
              >
                {rowInner}
              </Link>
            ) : (
              <div key={`${h.issuer}-${ii}`} data-rise style={rowStyle}>
                {rowInner}
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 18,
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              style={page === 0 ? btnDisabled : btnBase}
            >
              ← prev
            </button>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, opacity: 0.6 }}>
              {holdings.length === 0
                ? "0 of 0"
                : `${start + 1}–${Math.min(start + PER_PAGE, holdings.length)} of ${holdings.length}`}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              style={page >= totalPages - 1 ? btnDisabled : btnBase}
            >
              next →
            </button>
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, opacity: 0.45 }}>
            top positions by reported value
          </span>
        </div>
      </div>
    </div>
  );
}
