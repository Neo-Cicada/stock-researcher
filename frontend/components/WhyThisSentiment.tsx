import type { NewsItem } from "@/lib/types";
import BareTwig from "./BareTwig";

export default function WhyThisSentiment({
  ticker,
  news,
}: {
  ticker: string;
  news: NewsItem[];
}) {
  return (
    <aside className="kbk-sidebar">
      <h2 style={{ fontFamily: "var(--font-mincho)", fontWeight: 700, fontSize: 17, margin: "0 0 4px 0" }}>
        Why this sentiment
      </h2>
      <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 16 }}>
        recent headlines · {ticker}
      </div>

      {news.length === 0 ? (
        <BareTwig
          width={92}
          height={44}
          twigCount={2}
          note={`No recent headlines for ${ticker}.`}
        />
      ) : (
        <>
          {news.map((n, i) => (
            <article
              key={i}
              style={{ paddingBottom: 15, marginBottom: 15, borderBottom: "1px solid rgba(33,28,21,0.16)" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, opacity: 0.65 }}>{n.src}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, opacity: 0.4, marginLeft: "auto" }}>{n.time}</span>
              </div>
              <a
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12.5, lineHeight: 1.5, color: "inherit", textDecoration: "none", display: "block" }}
              >
                {n.title}
                <span aria-hidden style={{ fontFamily: "var(--font-mono)", opacity: 0.4, marginLeft: 5 }}>→</span>
              </a>
            </article>
          ))}
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, opacity: 0.4, letterSpacing: "0.08em" }}>
            headlines via Finnhub · not investment advice
          </div>
        </>
      )}
    </aside>
  );
}
