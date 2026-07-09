"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TrendingRowView } from "@/lib/dashboard";
import TrendingSkeleton from "./TrendingSkeleton";

const GRID_COLS = "58px 1fr 78px 62px 72px 62px 72px 76px";
const ROWS_PER_PAGE = 20;

export default function TrendingTable({ rows }: { rows: TrendingRowView[] }) {
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(rows.length / ROWS_PER_PAGE);
  const pageRows = rows.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 850);
    return () => clearTimeout(t);
  }, []);

  const btnBase: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    letterSpacing: "0.08em",
    padding: "5px 14px",
    border: "1px solid rgba(33,28,21,0.35)",
    background: "transparent",
    color: "#211C15",
    cursor: "pointer",
  };

  const btnDisabled: React.CSSProperties = {
    ...btnBase,
    opacity: 0.25,
    cursor: "default",
  };

  return (
    <div>
      <div className="kbk-trending-heading">
        <h2 style={{ fontFamily: "var(--font-mincho)", fontWeight: 700, fontSize: 18, margin: 0 }}>Trending Tickers</h2>
        <span
          style={{
            fontFamily: "var(--font-mincho)",
            background: "#BE3B33",
            color: "#F5F0E5",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.14em",
            padding: "4px 7px 3px",
            transform: "rotate(-2.5deg)",
            display: "inline-block",
          }}
        >
          話題
        </span>
        <span style={{ fontSize: 11, opacity: 0.5 }}>ranked by mention velocity · 24h</span>
      </div>

      {loading ? (
        <TrendingSkeleton />
      ) : (
        <div className="kbk-trending-scroll"><div className="kbk-trending-inner">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: GRID_COLS,
              gap: 10,
              fontSize: 9.5,
              letterSpacing: "0.18em",
              opacity: 0.55,
              paddingBottom: 7,
              borderBottom: "1.5px solid #211C15",
            }}
          >
            <span>TICKER</span>
            <span />
            <span style={{ textAlign: "right" }}>PRICE</span>
            <span style={{ textAlign: "right" }}>DAY</span>
            <span style={{ textAlign: "right" }}>MENTIONS</span>
            <span style={{ textAlign: "right" }}>VELOCITY</span>
            <span style={{ textAlign: "center" }}>SENTIMENT</span>
            <span style={{ textAlign: "right" }}>7-DAY</span>
          </div>
          {pageRows.map((row) => (
            <Link
              key={row.ticker}
              href={`/stock/${row.ticker.toLowerCase()}`}
              className="kbk-row"
              style={{
                display: "grid",
                gridTemplateColumns: GRID_COLS,
                gap: 10,
                alignItems: "center",
                padding: "8px 0",
                borderBottom: "1px solid rgba(33,28,21,0.14)",
                cursor: "pointer",
              }}
            >
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 600 }}>{row.ticker}</span>
              <span style={{ fontSize: 11, opacity: 0.55, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {row.name}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {row.price}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, textAlign: "right", color: row.dayColor }}>
                {row.day}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, textAlign: "right", opacity: 0.8 }}>
                {row.mentions}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, textAlign: "right" }}>{row.velocity}</span>
              <span style={{ display: "flex", justifyContent: "center" }}>
                <svg width={58} height={15} viewBox="0 0 58 15">
                  {row.petals.map((pe, i) => (
                    <ellipse key={i} cx={pe.cx} cy={7.5} rx={3.4} ry={5.6} fill={pe.fill} />
                  ))}
                </svg>
              </span>
              <span style={{ display: "flex", justifyContent: "flex-end" }}>
                <svg width={68} height={18} viewBox="0 0 68 18">
                  <path d={row.spark} fill="none" stroke="#211C15" strokeWidth={1.2} strokeLinecap="round" opacity={0.72} />
                </svg>
              </span>
            </Link>
          ))}

          {/* Pagination */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                style={page === 0 ? btnDisabled : btnBase}
              >
                ← prev
              </button>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, opacity: 0.6 }}>
                {page * ROWS_PER_PAGE + 1}–{Math.min((page + 1) * ROWS_PER_PAGE, rows.length)} of {rows.length}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                style={page >= totalPages - 1 ? btnDisabled : btnBase}
              >
                next →
              </button>
            </div>
            <div style={{ fontSize: 10.5, opacity: 0.45, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span>Sentiment petals: 5 = strongly bullish crowd</span>
              <span style={{ fontFamily: "var(--font-mono)" }}>sources: reddit · stocktwits · x</span>
            </div>
          </div>
        </div></div>
      )}
    </div>
  );
}
