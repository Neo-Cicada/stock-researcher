import BoardHeading from "@/components/BoardHeading";
import BoardLegend from "@/components/BoardLegend";
import BoardSkeleton from "@/components/BoardSkeleton";
import { EVENTS_LEGEND } from "./legend";

// Route-level Suspense boundary: this is what the router can prefetch and swap
// in the instant the nav link is clicked, instead of leaving the old page on
// screen while the FRED calendar is fetched.
export default function EventsLoading() {
  return (
    <main data-screen-label="Events" className="kbk-page-main">
      <BoardHeading
        sideLabel="経済指標"
        title="Economic Events"
        stamp="指標"
        subtitle="reading the almanac…"
      >
        <BoardLegend items={EVENTS_LEGEND} />
      </BoardHeading>

      <BoardSkeleton />
    </main>
  );
}
