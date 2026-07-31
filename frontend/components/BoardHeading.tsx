import type { ReactNode } from "react";
import Gloss from "./Gloss";

/**
 * The shared masthead for the almanac-style pages (/events, /earnings,
 * /institutions): side label, title + hanko stamp + subtitle, an optional
 * legend or blurb, then the brush rule.
 *
 * Each page's loading.tsx renders this too, so the heading paints instantly on
 * navigation and the board below it swaps in with no layout shift. Keeping it
 * in one component is what stops the two copies drifting apart.
 */
export default function BoardHeading({
  sideLabel,
  title,
  stamp,
  subtitle,
  children,
}: {
  sideLabel: string;
  title: string;
  stamp: string;
  subtitle: ReactNode;
  children?: ReactNode;
}) {
  return (
    <>
      <Gloss text={sideLabel} placement="right" className="kbk-abs-label" />

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 14,
          flexWrap: "wrap",
          paddingTop: 44,
          marginBottom: 4,
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-mincho)",
            fontWeight: 800,
            fontSize: 30,
            letterSpacing: "0.02em",
            margin: 0,
          }}
        >
          {title}
        </h1>
        <Gloss
          text={stamp}
          style={{
            fontFamily: "var(--font-mincho)",
            background: "#BE3B33",
            color: "#F5F0E5",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.14em",
            padding: "4px 8px 3px",
            transform: "rotate(-2.5deg)",
            display: "inline-block",
          }}
        />
        <span style={{ fontSize: 12, opacity: 0.55 }}>{subtitle}</span>
      </div>

      {children}

      <svg
        viewBox="0 0 1100 8"
        preserveAspectRatio="none"
        style={{
          width: "100%",
          height: 7,
          display: "block",
          margin: "14px 0 26px 0",
        }}
      >
        <path
          d="M0 5 C 180 2, 420 7, 640 4 C 820 1.5, 980 5.5, 1100 3.5"
          fill="none"
          stroke="#211C15"
          strokeWidth={1.6}
          strokeLinecap="round"
          opacity={0.75}
        />
      </svg>
    </>
  );
}
