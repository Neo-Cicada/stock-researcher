import EventsBoard from "@/components/EventsBoard";
import { TODAYS_EVENTS } from "@/lib/dashboard";
import { fetchEconomicEvents } from "@/lib/api";

export const dynamic = "force-dynamic";

async function getEvents() {
  // Falls back to the mock TODAYS_EVENTS when the endpoint is unavailable
  // (Finnhub unreachable/unconfigured, or the calendar premium-gated).
  return (await fetchEconomicEvents()) ?? TODAYS_EVENTS;
}

export default async function EventsPage() {
  const events = await getEvents();
  const eventCount = events.length;

  return (
    <main data-screen-label="Events" className="kbk-page-main">
      <span className="kbk-abs-label">経済指標</span>

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
          Economic Events
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
          指標
        </span>
        <span style={{ fontSize: 12, opacity: 0.55 }}>
          {eventCount} upcoming {eventCount === 1 ? "release" : "releases"} ·
          CPI · FOMC · jobs
        </span>
      </div>

      {/* Impact legend */}
      <div
        style={{
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          margin: "2px 0 0",
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            letterSpacing: "0.06em",
            opacity: 0.7,
          }}
        >
          <span
            style={{
              width: 11,
              height: 11,
              borderRadius: "50%",
              background: "#BE3B33",
              boxShadow: "0 0 0 3px rgba(190,59,51,0.12)",
              display: "inline-block",
            }}
          />
          high impact
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            letterSpacing: "0.06em",
            opacity: 0.7,
          }}
        >
          <span
            style={{
              width: 11,
              height: 11,
              borderRadius: "50%",
              background: "#211C15",
              display: "inline-block",
            }}
          />
          medium
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            letterSpacing: "0.06em",
            opacity: 0.7,
          }}
        >
          <span
            style={{
              width: 11,
              height: 11,
              borderRadius: "50%",
              borderWidth: 1.5,
              borderStyle: "solid",
              borderColor: "#211C15",
              display: "inline-block",
            }}
          />
          low
        </span>
      </div>

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
