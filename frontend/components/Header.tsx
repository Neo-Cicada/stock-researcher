"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function currentTickerFromPath(pathname: string): { ticker: string; onDetail: boolean; onScore: boolean } {
  const detailMatch = pathname.match(/^\/stock\/([^/]+)$/);
  if (detailMatch) return { ticker: detailMatch[1].toUpperCase(), onDetail: true, onScore: false };
  const scoreMatch = pathname.match(/^\/stock\/([^/]+)\/scorecard$/);
  if (scoreMatch) return { ticker: scoreMatch[1].toUpperCase(), onDetail: false, onScore: true };
  return { ticker: "NVDA", onDetail: false, onScore: false };
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
  const { ticker, onDetail, onScore } = currentTickerFromPath(pathname);
  const onDash = pathname === "/";

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
        <Link href={`/stock/${ticker.toLowerCase()}/scorecard`} style={linkStyle}>
          {onScore && <span style={dotStyle} />}
          <span>SCORECARD</span>
        </Link>
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
