"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

function currentTickerFromPath(pathname: string): { ticker: string; onDetail: boolean } {
  const match = pathname.match(/^\/stock\/([^/]+)/);
  if (match) return { ticker: match[1].toUpperCase(), onDetail: true };
  return { ticker: "NVDA", onDetail: false };
}

const dotStyle: React.CSSProperties = {
  width: 7,
  height: 7,
  background: "#BE3B33",
  borderRadius: "50%",
  display: "inline-block",
};

const linkStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  fontSize: 12,
  letterSpacing: "0.18em",
  cursor: "pointer",
};

export default function Header() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { ticker, onDetail } = currentTickerFromPath(pathname);
  const onDash = pathname === "/";
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = query.trim().replace(/[^a-zA-Z.]/g, "");
    if (!cleaned) return;
    router.push(`/stock/${cleaned.toLowerCase()}`);
    setQuery("");
  }

  return (
    <header
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 28,
        padding: "26px 56px 20px 96px",
        borderBottom: "1px solid rgba(33,28,21,0.35)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <span style={{ fontFamily: "var(--font-mincho)", fontWeight: 800, fontSize: 30, letterSpacing: "0.06em" }}>
          株価
        </span>
        <span style={{ fontFamily: "var(--font-mincho)", fontWeight: 600, fontSize: 16, letterSpacing: "0.42em" }}>
          KABUKA
        </span>
      </div>
      <span style={{ fontSize: 11, letterSpacing: "0.14em", opacity: 0.55 }}>RICE-PAPER MARKET RESEARCH</span>
      <nav style={{ marginLeft: "auto", display: "flex", gap: 30, alignItems: "center" }}>
        <Link href="/" style={linkStyle}>
          {onDash && <span style={dotStyle} />}
          <span>DASHBOARD</span>
        </Link>
        <Link href={`/stock/${ticker.toLowerCase()}`} style={linkStyle}>
          {onDetail && <span style={dotStyle} />}
          <span>{ticker}</span>
        </Link>
        <form
          onSubmit={handleSearch}
          style={{
            borderLeft: "1px solid rgba(33,28,21,0.35)",
            paddingLeft: 22,
            display: "flex",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="検索 TICKER"
            maxLength={5}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              letterSpacing: "0.12em",
              background: "transparent",
              border: `1px solid rgba(33,28,21,${searchFocused ? 0.5 : 0.25})`,
              outline: "none",
              padding: "4px 10px",
              width: 110,
              color: "#211C15",
              caretColor: "#BE3B33",
              borderRadius: 0,
            }}
          />
        </form>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            opacity: 0.6,
            borderLeft: "1px solid rgba(33,28,21,0.35)",
            paddingLeft: 22,
          }}
        >
          8 Jul 2026 · 開場中 open
        </span>
      </nav>
    </header>
  );
}
