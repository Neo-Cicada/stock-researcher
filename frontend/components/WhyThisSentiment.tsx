import type { Post } from "@/lib/types";
import { colors } from "@/lib/colors";
import PetalMeter from "./PetalMeter";
import BareTwig from "./BareTwig";

export default function WhyThisSentiment({
  posts,
  insufficient,
  quietNote,
}: {
  posts: Post[];
  insufficient: boolean;
  quietNote: string;
}) {
  return (
    <aside className="kbk-sidebar">
      <h2 style={{ fontFamily: "var(--font-mincho)", fontWeight: 700, fontSize: 17, margin: "0 0 4px 0" }}>
        Why this sentiment
      </h2>
      <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 16 }}>representative posts, weighted by reach</div>

      {insufficient ? (
        <BareTwig width={92} height={44} twigCount={2} note={quietNote} />
      ) : (
        <>
          {posts.map((p, i) => {
            const scoreColor = p.score >= 50 ? colors.bullish : colors.bearish;
            const scoreLabel = (p.score >= 50 ? "bullish " : "bearish ") + p.score;
            return (
              <article key={i} style={{ paddingBottom: 15, marginBottom: 15, borderBottom: "1px solid rgba(33,28,21,0.16)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, opacity: 0.65 }}>{p.src}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, opacity: 0.4, marginLeft: "auto" }}>{p.time}</span>
                </div>
                <p style={{ fontSize: 12.5, lineHeight: 1.5, margin: "0 0 8px 0" }}>{p.text}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <PetalMeter score={p.score} width={52} height={13} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: scoreColor }}>{scoreLabel}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, opacity: 0.5, marginLeft: "auto" }}>{p.up}</span>
                </div>
              </article>
            );
          })}
          <div style={{ paddingTop: 2 }}>
            <BareTwig
              width={80}
              height={38}
              strokeWidth={2.2}
              opacity={0.8}
              twigCount={1}
              titleSize={13}
              note="X/Twitter feed paused — no fresh posts in 3h."
            />
          </div>
        </>
      )}
    </aside>
  );
}
