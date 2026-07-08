import type { Theme } from "@/lib/dashboard";
import BareTwig from "./BareTwig";

export default function ThemesColumn({ themes, quietNote }: { themes: Theme[]; quietNote: string }) {
  return (
    <aside style={{ borderLeft: "1px solid rgba(33,28,21,0.3)", paddingLeft: 32 }}>
      <h2 style={{ fontFamily: "var(--font-mincho)", fontWeight: 700, fontSize: 18, margin: "0 0 18px 0" }}>Today&rsquo;s Themes</h2>

      {themes.map((theme) => (
        <article
          key={theme.title}
          style={{ paddingBottom: 18, marginBottom: 18, borderBottom: "1px solid rgba(33,28,21,0.18)" }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span
              style={{
                fontFamily: "var(--font-mincho)",
                background: "#BE3B33",
                color: "#F5F0E5",
                fontSize: 13,
                fontWeight: 700,
                width: 24,
                height: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `rotate(${theme.rotation}deg)`,
                flex: "0 0 auto",
              }}
            >
              {theme.stamp}
            </span>
            <h3 style={{ fontFamily: "var(--font-mincho)", fontSize: 15, fontWeight: 700, margin: 0, lineHeight: 1.35 }}>
              {theme.title}
            </h3>
          </div>
          <p style={{ fontSize: 12, lineHeight: 1.55, margin: "8px 0 10px 0", opacity: 0.78 }}>{theme.summary}</p>
          <div style={{ display: "flex", gap: 6 }}>
            {theme.tickers.map((t) => (
              <span
                key={t}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10.5,
                  border: "1px solid rgba(33,28,21,0.4)",
                  padding: "2px 7px",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </article>
      ))}

      <article style={{ padding: "6px 0 4px 0" }}>
        <BareTwig width={92} height={44} note={quietNote} />
      </article>
    </aside>
  );
}
