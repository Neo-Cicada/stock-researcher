import BoardHeading from "@/components/BoardHeading";
import BoardLegend from "@/components/BoardLegend";
import BoardSkeleton from "@/components/BoardSkeleton";
import { EARNINGS_LEGEND } from "./legend";

// Route-level Suspense boundary — see app/events/loading.tsx.
export default function EarningsLoading() {
  return (
    <main data-screen-label="Earnings" className="kbk-page-main">
      <BoardHeading
        sideLabel="決算予定"
        title="Earnings Schedule"
        stamp="決算"
        subtitle="reading the almanac…"
      >
        <BoardLegend items={EARNINGS_LEGEND} />
      </BoardHeading>

      <BoardSkeleton />
    </main>
  );
}
