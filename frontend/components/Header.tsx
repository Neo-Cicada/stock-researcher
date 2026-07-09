"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

function currentTickerFromPath(pathname: string): {
  ticker: string;
  onDetail: boolean;
} {
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
    <header className="kbk-header">
      <Link href="/" className="kbk-header-brand" style={{ textDecoration: "none", color: "inherit" }}>
        <span
          style={{
            fontFamily: "var(--font-mincho)",
            fontWeight: 800,
            fontSize: 30,
            letterSpacing: "0.06em",
          }}
        >
          株価
        </span>
        <span
          style={{
            fontFamily: "var(--font-mincho)",
            fontWeight: 600,
            fontSize: 16,
            letterSpacing: "0.42em",
          }}
        >
          KABUKA
        </span>
      </Link>
      <span className="kbk-header-tagline">RICE-PAPER MARKET RESEARCH</span>
      <nav className="kbk-header-nav">
        <Link href="/" style={linkStyle}>
          {onDash && <span style={dotStyle} />}
          <span>DASHBOARD</span>
        </Link>
        <Link href={`/stock/${ticker.toLowerCase()}`} style={linkStyle}>
          {onDetail && <span style={dotStyle} />}
          <span>{ticker}</span>
        </Link>
        <form onSubmit={handleSearch} className="kbk-header-search">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="SEARCH"
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
        <span className="kbk-header-date">8 Jul 2026 · 開場中 open</span>
      </nav>
    </header>
  );
}
