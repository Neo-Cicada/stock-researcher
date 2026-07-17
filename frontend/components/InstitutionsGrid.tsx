import Link from "next/link";
import type { InstitutionView } from "@/lib/dashboard";
import { colors } from "@/lib/colors";

// A woodblock "hanko" seal card per institution: a stamped kanji, the name, its
// category, and a cheap 13F portfolio summary. The whole card links into the
// institution's holdings page.
export default function InstitutionsGrid({
  institutions,
}: {
  institutions: InstitutionView[];
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
        gap: 14,
      }}
    >
      {institutions.map((inst, i) => (
        <Link
          key={inst.slug}
          href={`/institutions/${inst.slug}`}
          data-rise
          className="kbk-inst-card"
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "16px 16px 15px",
            background: colors.paperCard,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "rgba(33,28,21,0.16)",
            textDecoration: "none",
            color: colors.ink,
            cursor: "pointer",
            overflow: "hidden",
            animationDelay: `${i * 40}ms`,
          }}
        >
          {/* Stamped seal */}
          <span
            style={{
              flexShrink: 0,
              width: 46,
              height: 46,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-mincho)",
              fontSize: 24,
              fontWeight: 700,
              color: colors.paper,
              background: colors.hanko,
              transform: `rotate(${(i % 2 === 0 ? -1 : 1) * 2.5}deg)`,
            }}
          >
            {inst.kanji}
          </span>

          <span style={{ minWidth: 0, flex: 1 }}>
            <span
              style={{
                display: "block",
                fontFamily: "var(--font-mincho)",
                fontSize: 17,
                fontWeight: 700,
                letterSpacing: "0.01em",
                lineHeight: 1.15,
              }}
            >
              {inst.name}
            </span>
            <span
              style={{
                display: "block",
                fontFamily: "var(--font-mono)",
                fontSize: 9.5,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                opacity: 0.5,
                marginTop: 3,
              }}
            >
              {inst.category}
            </span>
            <span
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                marginTop: 9,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 15,
                  fontWeight: 600,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {inst.portfolioValue}
              </span>
              {inst.period && (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.08em",
                    opacity: 0.45,
                  }}
                >
                  {inst.period}
                </span>
              )}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
