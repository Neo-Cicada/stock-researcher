import type { CSSProperties, ReactNode } from "react";
import { glossFor } from "@/lib/glossary";

// Where the translation card sits relative to the glossed text.
//  "top"    — above, centered (the default)
//  "bottom" — below, centered (text near the top of the viewport)
//  "right"  — to the right, vertically centered (vertical-writing labels)
//  "inline-right" — same as right, but tucked close enough to stay inside a
//                   clipping (overflow: hidden) parent such as a seal card
export type GlossPlacement = "top" | "bottom" | "right" | "inline-right";

// Renders `text` (or `children`) with a hover/focus tooltip carrying its English
// reading. Plain markup + a CSS-only tooltip, so it works inside both server and
// client components. Falls back to an unadorned span when we have no gloss.
export default function Gloss({
  text,
  children,
  placement = "top",
  style,
  className,
}: {
  text: string;
  children?: ReactNode;
  placement?: GlossPlacement;
  style?: CSSProperties;
  className?: string;
}) {
  const gloss = glossFor(text);
  const body = children ?? text;

  if (!gloss) {
    return (
      <span className={className} style={style}>
        {body}
      </span>
    );
  }

  return (
    <span
      className={className ? `${className} kbk-gloss` : "kbk-gloss"}
      data-gloss={gloss}
      data-gloss-pos={placement}
      aria-label={`${text} — ${gloss}`}
      style={style}
    >
      {body}
    </span>
  );
}
