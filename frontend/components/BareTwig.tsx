interface BareTwigProps {
  width?: number;
  height?: number;
  strokeWidth?: number;
  opacity?: number;
  twigCount?: 0 | 1 | 2;
  title?: string;
  titleSize?: number;
  note?: string;
}

// The "insufficient data" state: a bare twig with "Too quiet to read".
// Appears often by design — quiet corners of the market should look
// beautiful, not broken.
export default function BareTwig({
  width = 92,
  height = 44,
  strokeWidth = 2.4,
  opacity = 1,
  twigCount = 2,
  title = "Too quiet to read",
  titleSize = 14.5,
  note,
}: BareTwigProps) {
  return (
    <div style={{ textAlign: "left" }}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 92 44"
        style={{ display: "block", marginBottom: 6, opacity }}
      >
        <path
          d="M2 40 C 22 36, 40 28, 58 22 C 72 17, 82 12, 90 6"
          fill="none"
          stroke="#2A241C"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {twigCount >= 1 && (
          <path d="M34 30 Q 38 22, 36 14" fill="none" stroke="#2A241C" strokeWidth={1.3} strokeLinecap="round" />
        )}
        {twigCount >= 2 && (
          <path d="M62 20 Q 68 16, 68 8" fill="none" stroke="#2A241C" strokeWidth={1.1} strokeLinecap="round" />
        )}
      </svg>
      <div style={{ fontFamily: "var(--font-mincho)", fontSize: titleSize, fontStyle: "italic", opacity: 0.75 }}>
        {title}
      </div>
      {note && <div style={{ fontSize: 11, opacity: 0.45, marginTop: 3 }}>{note}</div>}
    </div>
  );
}
