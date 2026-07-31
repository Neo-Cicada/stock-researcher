import BoardHeading from "@/components/BoardHeading";
import SealGridSkeleton from "@/components/SealGridSkeleton";
import { INSTITUTIONS_BLURB_STYLE } from "./blurb";

// Route-level Suspense boundary — see app/events/loading.tsx. Matters most
// here: this page fans out to SEC EDGAR for every filer on the shortlist.
export default function InstitutionsLoading() {
  return (
    <main data-screen-label="Institutions" className="kbk-page-main">
      <BoardHeading
        sideLabel="機関投資家"
        title="Institutions"
        stamp="機関"
        subtitle="pressing the seals…"
      >
        <p style={INSTITUTIONS_BLURB_STYLE}>
          The largest asset managers and funds, and the US-equity positions they
          report to the SEC each quarter on Form 13F.
        </p>
      </BoardHeading>

      <SealGridSkeleton />
    </main>
  );
}
