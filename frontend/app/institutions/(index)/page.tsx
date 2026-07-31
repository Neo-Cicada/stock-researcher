import { connection } from "next/server";
import BoardHeading from "@/components/BoardHeading";
import InstitutionsGrid from "@/components/InstitutionsGrid";
import { INSTITUTIONS_MOCK } from "@/lib/dashboard";
import { fetchInstitutions } from "@/lib/api";
import { INSTITUTIONS_BLURB_STYLE } from "./blurb";

// Rendered per request (connection()) so an unreachable EDGAR can't bake mock
// into a prerendered page. 13F filings are quarterly and this page fans out to
// SEC EDGAR for ~19 filers — by far the slowest nav — so cache the fetch for
// an hour.
export const revalidate = 3600;

async function getInstitutions() {
  // Falls back to the mock shortlist when SEC EDGAR is unavailable.
  return (await fetchInstitutions()) ?? INSTITUTIONS_MOCK;
}

export default async function InstitutionsPage() {
  await connection();
  const institutions = await getInstitutions();
  const count = institutions.length;

  return (
    <main data-screen-label="Institutions" className="kbk-page-main">
      <BoardHeading
        sideLabel="機関投資家"
        title="Institutions"
        stamp="機関"
        subtitle={`${count} big holders · tap a seal for their 13F holdings`}
      >
        <p style={INSTITUTIONS_BLURB_STYLE}>
          The largest asset managers and funds, and the US-equity positions they
          report to the SEC each quarter on Form 13F.
        </p>
      </BoardHeading>

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
