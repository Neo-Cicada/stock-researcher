"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { KNOWN_TICKERS } from "@/lib/known-tickers";
import { fetchSymbolSearch } from "@/lib/api";

interface Suggestion {
  symbol: string;
  name: string;
}

const MAX_SUGGESTIONS = 6;

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
  { href: "/institutions", label: "INSTITUTIONS" },
] as const;

export default function Header() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
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
    const isOpen = day >= 1 && day <= 5 && mins >= 570 && mins < 960; // 9:30=570, 16:00=960
    return { date, time, isOpen };
  }, []);

  const [dateTime, setDateTime] = useState(formatDateTime);

  useEffect(() => {
    const id = setInterval(() => setDateTime(formatDateTime()), 60_000);
    return () => clearInterval(id);
  }, [formatDateTime]);

  // Debounced symbol search against the backend (any listed ticker), falling
  // back to the local known-ticker list when the backend returns nothing.
  useEffect(() => {
    const q = query.trim();
    const controller = new AbortController();
    const id = setTimeout(
      async () => {
        if (!q) {
          setSuggestions([]);
          return;
        }
        const remote = await fetchSymbolSearch(q, controller.signal);
        if (controller.signal.aborted) return;
        const localFallback: Suggestion[] = KNOWN_TICKERS.filter((t) =>
          t.startsWith(q.toUpperCase())
        )
          .slice(0, MAX_SUGGESTIONS)
          .map((symbol) => ({ symbol, name: "" }));
        setHighlightIdx(-1);
        setSuggestions(
          remote.length > 0
            ? remote
                .slice(0, MAX_SUGGESTIONS)
                .map((r) => ({ symbol: r.symbol, name: r.description }))
            : localFallback
        );
      },
      q ? 180 : 0
    );

    return () => {
      clearTimeout(id);
      controller.abort();
    };
  }, [query]);

  const showDropdown = searchFocused && suggestions.length > 0;

  const navigate = useCallback(
    (t: string) => {
      router.push(`/stock/${t.toLowerCase()}`);
      setQuery("");
      setHighlightIdx(-1);
      setMenuOpen(false);
    },
    [router]
  );

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (highlightIdx >= 0 && highlightIdx < suggestions.length) {
      navigate(suggestions[highlightIdx].symbol);
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
      <Link
        href="/"
        className="kbk-header-brand"
        style={{ textDecoration: "none", color: "inherit" }}
      >
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
      {/* <span className="kbk-header-tagline">RICE-PAPER MARKET RESEARCH</span> */}
      <button
        type="button"
        className="kbk-header-toggle"
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((o) => !o)}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
          {menuOpen ? (
            <g stroke="#211C15" strokeWidth="1.6" strokeLinecap="round">
              <line x1="5" y1="5" x2="17" y2="17" />
              <line x1="17" y1="5" x2="5" y2="17" />
            </g>
          ) : (
            <g stroke="#211C15" strokeWidth="1.6" strokeLinecap="round">
              <line x1="3" y1="6" x2="19" y2="6" />
              <line x1="3" y1="11" x2="19" y2="11" />
              <line x1="3" y1="16" x2="19" y2="16" />
            </g>
          )}
        </svg>
      </button>
      <nav className={`kbk-header-nav${menuOpen ? " kbk-header-nav--open" : ""}`}>
        {NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="kbk-nav-link"
            style={linkStyle}
            onClick={() => setMenuOpen(false)}
          >
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
              blurTimeout.current = setTimeout(
                () => setSearchFocused(false),
                150
              );
            }}
            onKeyDown={handleKeyDown}
            placeholder="SEARCH"
            maxLength={32}
            autoComplete="off"
            className="kbk-search-input"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              letterSpacing: "0.12em",
              background: "transparent",
              border: `1px solid rgba(33,28,21,${searchFocused ? 0.5 : 0.25})`,
              outline: "none",
              padding: "4px 10px",
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
                right: 0,
                minWidth: 240,
                margin: 0,
                padding: 0,
                listStyle: "none",
                background: "#F5F0E5",
                border: "1px solid rgba(33,28,21,0.25)",
                borderTop: "none",
                zIndex: 100,
                maxHeight: 240,
                overflowY: "auto",
              }}
            >
              {suggestions.map((s, i) => (
                <li
                  key={s.symbol}
                  onMouseDown={() => navigate(s.symbol)}
                  onMouseEnter={() => setHighlightIdx(i)}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 8,
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
                  <span>{s.symbol}</span>
                  {s.name && (
                    <span
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 10,
                        letterSpacing: "0.02em",
                        color: "rgba(33,28,21,0.55)",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {s.name}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </form>
        <span className="kbk-header-date">
          {dateTime.date} · {dateTime.time} ·{" "}
          {dateTime.isOpen ? "開場中 open" : "閉場 closed"}
        </span>
      </nav>
    </header>
  );
}
