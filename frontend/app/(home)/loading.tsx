import Gloss from "@/components/Gloss";
import TrendingSkeleton from "@/components/TrendingSkeleton";

const THEME_CARDS = [1, 2, 3, 4];

// Route-level Suspense boundary for the dashboard. Reproduces the page's
// layout — season branch, brush rule, table/themes grid — so returning to "/"
// paints immediately instead of holding the previous screen while trending,
// market-season and themes are fetched.
export default function DashboardLoading() {
  return (
    <main data-screen-label="Dashboard" className="kbk-page-main">
      <Gloss text="相場の季節" placement="right" className="kbk-abs-label" />

      <section className="kbk-branch-outer" aria-hidden="true">
        <div style={{ flex: 1, minWidth: 0 }}>
          <span
            data-skel
            style={{
              display: "block",
              height: 10,
              width: 190,
              background: "#211C15",
              marginBottom: 20,
            }}
          />
          <span
            data-skel
            style={{ display: "block", height: 128, background: "#211C15" }}
          />
        </div>
        <aside className="kbk-branch-gauge">
          <span
            data-skel
            style={{
              display: "block",
              height: 56,
              background: "#211C15",
              marginBottom: 12,
            }}
          />
          <span
            data-skel
            style={{ display: "block", height: 44, background: "#211C15" }}
          />
        </aside>
      </section>

      <svg
        viewBox="0 0 1100 8"
        preserveAspectRatio="none"
        style={{
          width: "100%",
          height: 7,
          display: "block",
          margin: "10px 0 30px 0",
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

      <section className="kbk-dash-grid">
        <div>
          <TrendingSkeleton />
        </div>

        <aside className="kbk-sidebar" aria-hidden="true">
          <h2
            style={{
              fontFamily: "var(--font-mincho)",
              fontWeight: 700,
              fontSize: 18,
              margin: "0 0 18px 0",
            }}
          >
            Today&rsquo;s Themes
          </h2>
          {THEME_CARDS.map((card) => (
            <div
              key={card}
              data-skel-row
              style={{
                paddingBottom: 18,
                marginBottom: 18,
                borderBottom: "1px solid rgba(33,28,21,0.18)",
                display: "flex",
                flexDirection: "column",
                gap: 9,
              }}
            >
              <span
                data-skel
                style={{ height: 12, width: "78%", background: "#211C15" }}
              />
              <span
                data-skel
                style={{ height: 8, background: "#211C15" }}
              />
              <span
                data-skel
                style={{ height: 8, width: "62%", background: "#211C15" }}
              />
            </div>
          ))}
        </aside>
      </section>
    </main>
  );
}
