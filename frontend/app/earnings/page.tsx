import { connection } from "next/server";
import BoardHeading from "@/components/BoardHeading";
import BoardLegend from "@/components/BoardLegend";
import EarningsBoard from "@/components/EarningsBoard";
import { EARNINGS_SCHEDULE } from "@/lib/dashboard";
import { fetchEarnings } from "@/lib/api";
import { EARNINGS_LEGEND } from "./legend";

// Rendered per request (connection()) so an unreachable backend can't bake
// mock into a prerendered page. The fetch cache roughly matches the backend's
// own 1h Finnhub cache — a per-click re-fetch only ever re-read the same
// cached calendar.
export const revalidate = 600;

async function getEarnings() {
  // Falls back to the mock EARNINGS_SCHEDULE when the endpoint is unavailable.
  return (await fetchEarnings()) ?? EARNINGS_SCHEDULE;
}

export default async function EarningsPage() {
  await connection();
  const earnings = await getEarnings();
  const reportCount = earnings.length;

  return (
    <main data-screen-label="Earnings" className="kbk-page-main">
      <BoardHeading
        sideLabel="決算予定"
        title="Earnings Schedule"
        stamp="決算"
        subtitle={
          <>
            {reportCount} upcoming {reportCount === 1 ? "report" : "reports"} ·
            tap a row for the stock
          </>
        }
      >
        <BoardLegend items={EARNINGS_LEGEND} />
      </BoardHeading>

      <EarningsBoard earnings={earnings} />

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
          estimates · data delayed 15 min
        </span>
      </footer>
    </main>
  );
}
