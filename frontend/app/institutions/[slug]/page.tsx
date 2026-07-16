import Link from "next/link";
import { notFound } from "next/navigation";
import HoldingsBoard from "@/components/HoldingsBoard";
import HoldingSearch from "@/components/HoldingSearch";
import {
  INSTITUTIONS_MOCK,
  buildInstitutionDetailMock,
  type InstitutionDetailView,
} from "@/lib/dashboard";
import { fetchInstitutionHoldings } from "@/lib/api";

const KNOWN = new Set(INSTITUTIONS_MOCK.map((i) => i.slug));

async function getDetail(slug: string): Promise<InstitutionDetailView> {
  // Real SEC 13F holdings, falling back to deterministic mock when EDGAR is
  // unavailable or the filing can't be parsed.
  return (await fetchInstitutionHoldings(slug)) ?? buildInstitutionDetailMock(slug);
}

export default async function InstitutionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!KNOWN.has(slug)) notFound();

  const inst = await getDetail(slug);

  return (
    <main data-screen-label="Institution" className="kbk-page-main">
      <span className="kbk-abs-label">保有株</span>

      <div style={{ paddingTop: 44 }}>
        <Link
          href="/institutions"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            opacity: 0.55,
            textDecoration: "none",
            color: "#211C15",
          }}
        >
          ← all institutions
        </Link>
      </div>

      {/* Title row: stamped seal + name + category */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          marginTop: 12,
        }}
      >
        <span
          style={{
            flexShrink: 0,
            width: 58,
            height: 58,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-mincho)",
            fontSize: 30,
            fontWeight: 700,
            color: "#F5F0E5",
            background: "#BE3B33",
            transform: "rotate(-2.5deg)",
          }}
        >
          {inst.kanji}
        </span>
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              fontFamily: "var(--font-mincho)",
              fontWeight: 800,
              fontSize: 30,
              letterSpacing: "0.01em",
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {inst.name}
          </h1>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10.5,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              opacity: 0.5,
            }}
          >
            {inst.category}
          </span>
        </div>
      </div>

      {/* Summary stat strip */}
      <div
        style={{
          display: "flex",
          gap: 28,
          flexWrap: "wrap",
          marginTop: 18,
          paddingBottom: 2,
        }}
      >
        <Stat label="PORTFOLIO VALUE" value={inst.portfolioValue} />
        <Stat label="POSITIONS" value={String(inst.positions)} />
        <Stat label="REPORTED" value={inst.period || "—"} />
      </div>

      {/* Ask whether they hold a specific stock — searches the entire 13F. */}
      <div style={{ marginTop: 18 }}>
        <HoldingSearch slug={inst.slug} name={inst.name} holdings={inst.holdings} />
      </div>

      <svg
        viewBox="0 0 1100 8"
        preserveAspectRatio="none"
        style={{ width: "100%", height: 7, display: "block", margin: "18px 0 24px 0" }}
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

      <HoldingsBoard holdings={inst.holdings} />

      <footer className="kbk-footer">
        <span
          className="kbk-footer-right"
          style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, opacity: 0.4 }}
        >
          source: SEC EDGAR Form 13F · holdings may lag up to a quarter
        </span>
      </footer>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.18em",
          opacity: 0.45,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 19,
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}
