import { connection } from "next/server";
import BoardHeading from "@/components/BoardHeading";
import BoardLegend from "@/components/BoardLegend";
import EventsBoard from "@/components/EventsBoard";
import { TODAYS_EVENTS } from "@/lib/dashboard";
import { fetchEconomicEvents } from "@/lib/api";
import { EVENTS_LEGEND } from "./legend";

// Rendered per request (connection()) so an unreachable backend can't bake
// mock into a prerendered page, but the FRED fetch is cached for 15 min —
// release dates change daily at most, so a per-click round-trip bought nothing
// but a stalled nav.
export const revalidate = 900;

async function getEvents() {
  // Falls back to the mock TODAYS_EVENTS when the endpoint is unavailable
  // (Finnhub unreachable/unconfigured, or the calendar premium-gated).
  return (await fetchEconomicEvents()) ?? TODAYS_EVENTS;
}

export default async function EventsPage() {
  await connection();
  const events = await getEvents();
  const eventCount = events.length;

  return (
    <main data-screen-label="Events" className="kbk-page-main">
      <BoardHeading
        sideLabel="経済指標"
        title="Economic Events"
        stamp="指標"
        subtitle={
          <>
            {eventCount} upcoming{" "}
            {eventCount === 1 ? "release" : "releases"} · CPI · FOMC · jobs
          </>
        }
      >
        <BoardLegend items={EVENTS_LEGEND} />
      </BoardHeading>

      <EventsBoard events={events} />

      <footer className="kbk-footer">
        {/* <span style={{ fontSize: 10.5, letterSpacing: "0.16em", opacity: 0.5 }}>RESEARCH, NOT INVESTMENT ADVICE.</span> */}
        <span
          className="kbk-footer-right"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            opacity: 0.4,
          }}
        >
          times shown in exchange-local · data delayed
        </span>
      </footer>
    </main>
  );
}
