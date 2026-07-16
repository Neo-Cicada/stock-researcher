"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { KNOWN_TICKERS } from "@/lib/known-tickers";

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

const NAV_LINKS = [
  { href: "/", label: "DASHBOARD" },
  { href: "/events", label: "EVENTS" },
  { href: "/earnings", label: "EARNINGS" },
] as const;

export default function Header() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatDateTime = useCallback(() => {
    const now = new Date();
    const date = now.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const time = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    // US market hours: 9:30 AM – 4:00 PM ET, Mon–Fri
    const et = new Date(
      now.toLocaleString("en-US", { timeZone: "America/New_York" })
    );
    const h = et.getHours();
    const m = et.getMinutes();
    const day = et.getDay();
    const mins = h * 60 + m;
    const isOpen =
      day >= 1 && day <= 5 && mins >= 570 && mins < 960; // 9:30=570, 16:00=960
    return { date, time, isOpen };
  }, []);

  const [dateTime, setDateTime] = useState(formatDateTime);

  useEffect(() => {
    const id = setInterval(() => setDateTime(formatDateTime()), 60_000);
    return () => clearInterval(id);
  }, [formatDateTime]);

  const suggestions =
    query.length > 0
      ? KNOWN_TICKERS.filter((t) => t.startsWith(query)).slice(0, 6)
      : [];
  const showDropdown = searchFocused && suggestions.length > 0;

  const navigate = useCallback(
    (t: string) => {
      router.push(`/stock/${t.toLowerCase()}`);
      setQuery("");
      setHighlightIdx(-1);
    },
    [router],
  );

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (highlightIdx >= 0 && highlightIdx < suggestions.length) {
      navigate(suggestions[highlightIdx]);
      return;
    }
    const cleaned = query.trim().replace(/[^a-zA-Z.]/g, "");
    if (!cleaned) return;
    navigate(cleaned);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      setSearchFocused(false);
    }
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
        {NAV_LINKS.map(({ href, label }) => (
          <Link key={href} href={href} style={linkStyle}>
            {pathname === href && <span style={dotStyle} />}
            <span>{label}</span>
          </Link>
        ))}
        <form
          onSubmit={handleSearch}
          className="kbk-header-search"
          style={{ position: "relative" }}
        >
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value.toUpperCase());
              setHighlightIdx(-1);
            }}
            onFocus={() => {
              if (blurTimeout.current) clearTimeout(blurTimeout.current);
              setSearchFocused(true);
            }}
            onBlur={() => {
              blurTimeout.current = setTimeout(() => setSearchFocused(false), 150);
            }}
            onKeyDown={handleKeyDown}
            placeholder="SEARCH"
            maxLength={5}
            autoComplete="off"
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
          {showDropdown && (
            <ul
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                margin: 0,
                padding: 0,
                listStyle: "none",
                background: "#F5F0E5",
                border: "1px solid rgba(33,28,21,0.25)",
                borderTop: "none",
                zIndex: 100,
                maxHeight: 200,
                overflowY: "auto",
              }}
            >
              {suggestions.map((t, i) => (
                <li
                  key={t}
                  onMouseDown={() => navigate(t)}
                  onMouseEnter={() => setHighlightIdx(i)}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    letterSpacing: "0.12em",
                    padding: "5px 10px",
                    cursor: "pointer",
                    background:
                      i === highlightIdx
                        ? "rgba(33,28,21,0.08)"
                        : "transparent",
                    color: "#211C15",
                  }}
                >
                  {t}
                </li>
              ))}
            </ul>
          )}
        </form>
        <span className="kbk-header-date">
          {dateTime.date} · {dateTime.time} · {dateTime.isOpen ? "開場中 open" : "閉場 closed"}
        </span>
      </nav>
    </header>
  );
}
