import InstitutionsGrid from "@/components/InstitutionsGrid";
import { INSTITUTIONS_MOCK } from "@/lib/dashboard";
import { fetchInstitutions } from "@/lib/api";

async function getInstitutions() {
  // Falls back to the mock shortlist when SEC EDGAR is unavailable.
  return (await fetchInstitutions()) ?? INSTITUTIONS_MOCK;
}

export default async function InstitutionsPage() {
  const institutions = await getInstitutions();
  const count = institutions.length;

  return (
    <main data-screen-label="Institutions" className="kbk-page-main">
      <span className="kbk-abs-label">機関投資家</span>

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
          Institutions
        </h1>
        <span
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
        >
          機関
        </span>
        <span style={{ fontSize: 12, opacity: 0.55 }}>
          {count} big holders · tap a seal for their 13F holdings
        </span>
      </div>

      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.04em",
          opacity: 0.5,
          margin: "6px 0 0",
          maxWidth: 620,
          lineHeight: 1.5,
        }}
      >
        The largest asset managers and funds, and the US-equity positions they
        report to the SEC each quarter on Form 13F.
      </p>

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

      <InstitutionsGrid institutions={institutions} />

      <footer className="kbk-footer">
        <span
          className="kbk-footer-right"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            opacity: 0.4,
          }}
        >
          source: SEC EDGAR 13F filings
        </span>
      </footer>
    </main>
  );
}
