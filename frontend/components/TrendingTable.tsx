"use client";

import { useState, useRef, useTransition } from "react";
import Link from "next/link";
import type { TrendingRowView } from "@/lib/dashboard";
import { fetchTrending, apiRowToView } from "@/lib/api";
import TrendingSkeleton from "./TrendingSkeleton";

const GRID_COLS = "58px 1fr 78px 62px 72px 62px";
const ROWS_PER_PAGE = 20;

const FILTERS = [
  "all",
  "wallstreetbets",
  "stocks",
  "stockmarket",
  "investing",
  "Daytrading",
  "pennystocks",
  "options",
] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_LABELS: Record<Filter, string> = {
  all: "All",
  wallstreetbets: "r/wallstreetbets",
  stocks: "r/stocks",
  stockmarket: "r/stockmarket",
  investing: "r/investing",
  Daytrading: "r/daytrading",
  pennystocks: "r/pennystocks",
  options: "r/options",
};

export default function TrendingTable({ rows: initialRows }: { rows: TrendingRowView[] }) {
  const [rows, setRows] = useState<TrendingRowView[]>(initialRows);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [page, setPage] = useState(0);
  const [activeFilter, setActiveFilter] = useState<Filter>("all");
  const cache = useRef<Partial<Record<Filter, TrendingRowView[]>>>({ all: initialRows });

  const totalPages = Math.ceil(rows.length / ROWS_PER_PAGE);
  const pageRows = rows.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);

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

  const chipBase: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 10.5,
    letterSpacing: "0.06em",
    padding: "4px 12px",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(33,28,21,0.3)",
    background: "transparent",
    color: "#211C15",
    cursor: "pointer",
    transition: "background 0.15s, border-color 0.15s",
  };

  const chipActive: React.CSSProperties = {
    ...chipBase,
    background: "#211C15",
    color: "#F5F0E5",
    borderColor: "#211C15",
  };

  const handleFilterChange = async (f: Filter) => {
    setActiveFilter(f);
    setPage(0);

    // Serve from cache instantly if available
    if (cache.current[f]) {
      startTransition(() => setRows(cache.current[f]!));
      return;
    }

    setLoading(true);
    try {
      const source = f === "all" ? undefined : f;
      const data = await fetchTrending(source);
      const mapped = data.map(apiRowToView);
      cache.current[f] = mapped;
      setRows(mapped);
    } catch {
      // Keep current rows on error
    } finally {
      setLoading(false);
    }
  };

  const sourceLabel =
    activeFilter === "all"
      ? "source: apewisdom.io"
      : `source: r/${FILTER_LABELS[activeFilter].replace("r/", "")}`;

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
        <span style={{ fontSize: 11, opacity: 0.5 }}>ranked by mention count · 24h</span>
      </div>

      {/* Subreddit filter chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0 14px" }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => handleFilterChange(f)}
            style={activeFilter === f ? chipActive : chipBase}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
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
                {rows.length === 0
                  ? "0 of 0"
                  : `${page * ROWS_PER_PAGE + 1}–${Math.min((page + 1) * ROWS_PER_PAGE, rows.length)} of ${rows.length}`}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                style={page >= totalPages - 1 ? btnDisabled : btnBase}
              >
                next →
              </button>
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, opacity: 0.45 }}>{sourceLabel}</span>
          </div>
        </div></div>
      )}
    </div>
  );
}
