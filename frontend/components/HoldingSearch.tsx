"use client";

import { useState } from "react";
import Link from "next/link";
import type { InstitutionHoldingView } from "@/lib/dashboard";
import { searchInstitutionHoldings } from "@/lib/api";
import { colors } from "@/lib/colors";

interface Result {
  query: string;
  matches: InstitutionHoldingView[];
  positions: number | null;
  scope: "all" | "top"; // whether we searched the full 13F or just loaded rows
}

// Lets the reader ask "does this fund hold X?" — searched across the whole 13F
// via the backend, with a client-side fallback over the loaded top holdings when
// SEC EDGAR is unreachable.
export default function HoldingSearch({
  slug,
  name,
  holdings,
}: {
  slug: string;
  name: string;
  holdings: InstitutionHoldingView[];
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      setResult(null);
      return;
    }
    setLoading(true);
    const res = await searchInstitutionHoldings(slug, q);
    if (res.available) {
      setResult({ query: q, matches: res.matches, positions: res.positions, scope: "all" });
    } else {
      // Filings offline — fall back to filtering the top holdings we already have.
      const needle = q.toUpperCase();
      const matches = holdings.filter(
        (h) =>
          (h.ticker && h.ticker.toUpperCase() === needle) ||
          h.issuer.toUpperCase().includes(needle),
      );
      setResult({ query: q, matches, positions: holdings.length, scope: "top" });
    }
    setLoading(false);
  }

  const found = result && result.matches.length > 0;

  return (
    <div style={{ marginTop: 4 }}>
      <form onSubmit={run} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Do they hold… ticker or name"
          maxLength={40}
          autoComplete="off"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            letterSpacing: "0.06em",
            background: "transparent",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "rgba(33,28,21,0.3)",
            outline: "none",
            padding: "7px 12px",
            width: 260,
            maxWidth: "100%",
            color: colors.ink,
            caretColor: colors.hanko,
            borderRadius: 0,
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            padding: "7px 18px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: colors.hanko,
            background: loading ? "transparent" : colors.hanko,
            color: loading ? colors.hanko : colors.paper,
            cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? "…" : "Check"}
        </button>
      </form>

      {result && (
        <div
          data-rise
          key={result.query + result.scope}
          style={{
            marginTop: 12,
            padding: "12px 14px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: found ? "rgba(74,124,89,0.5)" : "rgba(33,28,21,0.22)",
            background: found ? "rgba(74,124,89,0.06)" : "rgba(33,28,21,0.03)",
          }}
        >
          {found ? (
            <>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  color: colors.bullish,
                  marginBottom: 10,
                }}
              >
                ✓ {name} holds “{result.query}”
              </div>
              {result.matches.map((m, i) => {
                const inner = (
                  <>
                    <span style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 14,
                          fontWeight: 700,
                          letterSpacing: "0.04em",
                          color: m.ticker ? colors.hanko : colors.ink,
                        }}
                      >
                        {m.ticker ?? m.issuer.toLowerCase()}
                      </span>
                      {m.ticker && (
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10.5,
                            opacity: 0.55,
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                            textTransform: "capitalize",
                          }}
                        >
                          {m.issuer.toLowerCase()}
                        </span>
                      )}
                    </span>
                    <span
                      style={{
                        display: "flex",
                        gap: 14,
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                        fontVariantNumeric: "tabular-nums",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span>{m.value}</span>
                      <span style={{ opacity: 0.7 }}>{m.pctLabel}</span>
                      {m.rank != null && <span style={{ opacity: 0.5 }}>#{m.rank}</span>}
                    </span>
                  </>
                );
                const rowStyle: React.CSSProperties = {
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "6px 0",
                  borderTop: i === 0 ? "none" : "1px solid rgba(33,28,21,0.1)",
                  color: colors.ink,
                  textDecoration: "none",
                };
                return m.ticker ? (
                  <Link key={i} href={`/stock/${m.ticker.toLowerCase()}`} style={rowStyle}>
                    {inner}
                  </Link>
                ) : (
                  <div key={i} style={rowStyle}>
                    {inner}
                  </div>
                );
              })}
            </>
          ) : (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11.5,
                letterSpacing: "0.06em",
                opacity: 0.7,
              }}
            >
              ✗ No position in “{result.query}”
              {result.positions != null &&
                (result.scope === "all"
                  ? ` — searched all ${result.positions.toLocaleString()} positions`
                  : ` — searched top ${result.positions} holdings (filings offline)`)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
