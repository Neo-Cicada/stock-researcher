"use client";

import { useState } from "react";
import Link from "next/link";
import type { EarningsEventView } from "@/lib/dashboard";
import { colors } from "@/lib/colors";

const PER_PAGE = 10;
const GRID_COLS = "22px minmax(0,1fr) 84px 104px";

// Session discs read as a woodblock sun cycle: dawn (before open) is a
// vermilion rising sun, dusk (after close) a sumi-ink moon, midday an open ring.
function discStyle(sessionKey: string): React.CSSProperties {
  const base: React.CSSProperties = {
    width: 11,
    height: 11,
    borderRadius: "50%",
    borderWidth: 1.5,
    borderStyle: "solid",
    display: "inline-block",
    flexShrink: 0,
  };
  if (sessionKey === "bmo")
    return { ...base, background: colors.hanko, borderColor: colors.hanko, boxShadow: "0 0 0 3px rgba(190,59,51,0.12)" };
  if (sessionKey === "amc")
    return { ...base, background: colors.ink, borderColor: colors.ink };
  if (sessionKey === "dmh")
    return { ...base, background: "transparent", borderColor: colors.ink };
  return { ...base, background: "transparent", borderColor: "rgba(33,28,21,0.4)" };
}

// Beat / miss / in-line glyph + color for a result line, keyed by sign.
function beatStyle(sign: number): { arrow: string; label: string; color: string } {
  if (sign > 0) return { arrow: "▲", label: "beat", color: colors.bullish };
  if (sign < 0) return { arrow: "▼", label: "miss", color: colors.bearish };
  return { arrow: "◆", label: "in line", color: colors.inkSoft };
}

// One "EPS 6.31 vs 6.20 ▲ beat" line for a reported earnings row.
function ResultLine({
  metric,
  actual,
  estimate,
  sign,
}: {
  metric: string;
  actual: string;
  estimate: string;
  sign: number;
}) {
  const b = beatStyle(sign);
  return (
    <span
      style={{
        display: "block",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        letterSpacing: "0.02em",
        fontVariantNumeric: "tabular-nums",
        marginTop: 3,
      }}
    >
      <span style={{ opacity: 0.5, marginRight: 6 }}>{metric}</span>
      <span style={{ color: b.color, fontWeight: 700 }}>{actual}</span>
      <span style={{ opacity: 0.5 }}> vs {estimate}</span>
      <span style={{ color: b.color, marginLeft: 6 }}>{b.arrow} {b.label}</span>
    </span>
  );
}

interface DateGroup {
  dateLabel: string;
  weekday: string;
  items: EarningsEventView[];
}

function groupByDate(items: EarningsEventView[]): DateGroup[] {
  const groups: DateGroup[] = [];
  for (const e of items) {
    const last = groups[groups.length - 1];
    if (last && last.dateLabel === e.dateLabel) last.items.push(e);
    else groups.push({ dateLabel: e.dateLabel, weekday: e.weekday, items: [e] });
  }
  return groups;
}

export default function EarningsBoard({ earnings }: { earnings: EarningsEventView[] }) {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(earnings.length / PER_PAGE));
  const start = page * PER_PAGE;
  const pageItems = earnings.slice(start, start + PER_PAGE);
  const groups = groupByDate(pageItems);

  const btnBase: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    letterSpacing: "0.08em",
    padding: "5px 14px",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(33,28,21,0.35)",
    background: "transparent",
    color: "#211C15",
    cursor: "pointer",
  };
  const btnDisabled: React.CSSProperties = { ...btnBase, opacity: 0.25, cursor: "default" };

  return (
    <div className="kbk-trending-scroll">
      <div className="kbk-trending-inner" style={{ minWidth: 340 }}>
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
          <span>TICKER</span>
          <span style={{ textAlign: "right" }}>EST EPS</span>
          <span style={{ textAlign: "right" }}>EST REV</span>
        </div>

        {/* Groups + rows — keyed by page so the stagger replays on paging. */}
        <div key={page}>
          {groups.map((group, gi) => {
            // Running index across the page drives the reveal stagger.
            const before = groups.slice(0, gi).reduce((n, g) => n + g.items.length, 0);
            return (
              <div key={`${group.dateLabel}-${gi}`}>
                {/* Ledger date band */}
                <div
                  data-rise
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 12,
                    margin: "18px 0 4px",
                    animationDelay: `${(before + gi) * 45}ms`,
                  }}
                >
                  <span style={{ fontFamily: "var(--font-mincho)", fontSize: 19, fontWeight: 700, letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
                    {group.dateLabel}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.22em", opacity: 0.5, textTransform: "uppercase" }}>
                    {group.weekday}
                  </span>
                  <span style={{ flex: 1, height: 1, background: "rgba(33,28,21,0.22)" }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, opacity: 0.45, whiteSpace: "nowrap" }}>
                    {group.items.length} {group.items.length === 1 ? "report" : "reports"}
                  </span>
                </div>

                {group.items.map((e, ii) => {
                  const delay = `${(before + gi + ii + 1) * 45}ms`;

                  // Ticker cell (disc + symbol + session), shared by both layouts.
                  const tickerCell = (
                    <>
                      <span style={{ display: "flex", justifyContent: "center" }}>
                        <span style={discStyle(e.sessionKey)} title={e.sessionLabel || undefined} />
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, letterSpacing: "0.02em" }}>
                          {e.symbol}
                        </span>
                        {e.sessionLabel && (
                          <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.1em", opacity: 0.5, marginTop: 2, textTransform: "uppercase" }}>
                            {e.sessionLabel}
                          </span>
                        )}
                      </span>
                    </>
                  );

                  // Reported (past/live) rows show the actual result inline
                  // instead of linking to the stock. Show a metric line only
                  // where an actual value came back.
                  if (e.reported) {
                    return (
                      <div
                        key={`${e.symbol}-${ii}`}
                        data-rise
                        style={{
                          display: "grid",
                          gridTemplateColumns: "22px minmax(0,1fr)",
                          gap: 12,
                          alignItems: "start",
                          padding: "11px 0",
                          borderBottom: "1px solid rgba(33,28,21,0.12)",
                          animationDelay: delay,
                        }}
                      >
                        {tickerCell}
                        <span style={{ gridColumn: "2", minWidth: 0 }}>
                          {e.epsActual && e.epsActual !== "—" && (
                            <ResultLine metric="EPS" actual={e.epsActual} estimate={e.epsEstimate} sign={e.epsBeatSign ?? 0} />
                          )}
                          {e.revenueActual && e.revenueActual !== "—" && (
                            <ResultLine metric="REV" actual={e.revenueActual} estimate={e.revenueEstimate} sign={e.revBeatSign ?? 0} />
                          )}
                        </span>
                      </div>
                    );
                  }

                  // Upcoming rows: estimate columns, linking to the stock page.
                  return (
                    <Link
                      key={`${e.symbol}-${ii}`}
                      href={`/stock/${e.symbol.toLowerCase()}`}
                      className="kbk-row"
                      data-rise
                      style={{
                        display: "grid",
                        gridTemplateColumns: GRID_COLS,
                        gap: 12,
                        alignItems: "center",
                        padding: "11px 0",
                        borderBottom: "1px solid rgba(33,28,21,0.12)",
                        cursor: "pointer",
                        animationDelay: delay,
                      }}
                    >
                      {tickerCell}
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        {e.epsEstimate}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, textAlign: "right", fontVariantNumeric: "tabular-nums", opacity: 0.85 }}>
                        {e.revenueEstimate}
                      </span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 18, gap: 12, flexWrap: "wrap" }}>
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
              {earnings.length === 0
                ? "0 of 0"
                : `${start + 1}–${Math.min(start + PER_PAGE, earnings.length)} of ${earnings.length}`}
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
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, opacity: 0.45 }}>source: finnhub.io earnings calendar</span>
        </div>
      </div>
    </div>
  );
}
