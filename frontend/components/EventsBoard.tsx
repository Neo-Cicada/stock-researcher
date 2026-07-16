"use client";

import { useState } from "react";
import type { EconomicEventView } from "@/lib/dashboard";
import { colors } from "@/lib/colors";

const PER_PAGE = 10;
const GRID_COLS = "22px minmax(0,1fr) 76px 76px";

// Impact discs echo the earnings sun cycle: a vermilion disc flags high-impact
// prints (CPI, FOMC), sumi-ink is medium, an open ring is low.
function discStyle(impact: string): React.CSSProperties {
  const base: React.CSSProperties = {
    width: 11,
    height: 11,
    borderRadius: "50%",
    borderWidth: 1.5,
    borderStyle: "solid",
    display: "inline-block",
    flexShrink: 0,
  };
  if (impact === "high")
    return { ...base, background: colors.hanko, borderColor: colors.hanko, boxShadow: "0 0 0 3px rgba(190,59,51,0.12)" };
  if (impact === "medium")
    return { ...base, background: colors.ink, borderColor: colors.ink };
  if (impact === "low")
    return { ...base, background: "transparent", borderColor: colors.ink };
  return { ...base, background: "transparent", borderColor: "rgba(33,28,21,0.4)" };
}

interface DateGroup {
  dateLabel: string;
  weekday: string;
  items: EconomicEventView[];
}

function groupByDate(items: EconomicEventView[]): DateGroup[] {
  const groups: DateGroup[] = [];
  for (const e of items) {
    const last = groups[groups.length - 1];
    if (last && last.dateLabel === e.dateLabel) last.items.push(e);
    else groups.push({ dateLabel: e.dateLabel, weekday: e.weekday, items: [e] });
  }
  return groups;
}

export default function EventsBoard({ events }: { events: EconomicEventView[] }) {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(events.length / PER_PAGE));
  const start = page * PER_PAGE;
  const pageItems = events.slice(start, start + PER_PAGE);
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
          <span>EVENT</span>
          <span style={{ textAlign: "right" }}>EST</span>
          <span style={{ textAlign: "right" }}>PREV</span>
        </div>

        {/* Groups + rows — keyed by page so the stagger replays on paging. */}
        <div key={page}>
          {groups.map((group, gi) => {
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
                    {group.items.length} {group.items.length === 1 ? "print" : "prints"}
                  </span>
                </div>

                {group.items.map((e, ii) => (
                  <div
                    key={`${e.event}-${ii}`}
                    data-rise
                    style={{
                      display: "grid",
                      gridTemplateColumns: GRID_COLS,
                      gap: 12,
                      alignItems: "center",
                      padding: "11px 0",
                      borderBottom: "1px solid rgba(33,28,21,0.12)",
                      animationDelay: `${(before + gi + ii + 1) * 45}ms`,
                    }}
                  >
                    <span style={{ display: "flex", justifyContent: "center" }}>
                      <span style={discStyle(e.impact)} title={e.impact ? `${e.impact} impact` : undefined} />
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ fontFamily: "var(--font-mincho)", fontSize: 15, fontWeight: 700, lineHeight: 1.3, overflowWrap: "break-word" }}>
                        {e.event}
                      </span>
                      <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.08em", opacity: 0.5, marginTop: 2 }}>
                        {[e.country, e.time].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {e.estimate}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, textAlign: "right", fontVariantNumeric: "tabular-nums", opacity: 0.8 }}>
                      {e.previous}
                    </span>
                  </div>
                ))}
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
              {events.length === 0
                ? "0 of 0"
                : `${start + 1}–${Math.min(start + PER_PAGE, events.length)} of ${events.length}`}
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
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, opacity: 0.45 }}>source: finnhub.io economic calendar</span>
        </div>
      </div>
    </div>
  );
}
