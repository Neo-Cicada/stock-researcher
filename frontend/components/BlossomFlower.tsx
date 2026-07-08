interface BlossomFlowerProps {
  color: string;
  petalRx?: number;
  petalRy?: number;
  centerR?: number;
  cy?: number;
  opacity?: number;
}

// A 5-petal blossom, radially symmetric. Caller wraps this in
// <g transform="translate(x,y) rotate(deg)"> to place it on a branch.
export function BlossomFlower({
  color,
  petalRx = 2.8,
  petalRy = 4.7,
  centerR = 1.7,
  cy = -4.6,
  opacity = 0.9,
}: BlossomFlowerProps) {
  return (
    <>
      {[0, 72, 144, 216, 288].map((deg) => (
        <ellipse
          key={deg}
          cx={0}
          cy={cy}
          rx={petalRx}
          ry={petalRy}
          fill={color}
          opacity={opacity}
          transform={deg ? `rotate(${deg})` : undefined}
        />
      ))}
      <circle r={centerR} fill="#E8B4B8" />
    </>
  );
}

// An unopened bud — used on the branch between bare twig and full bloom.
export function BudGlyph() {
  return (
    <>
      <ellipse cx={0} cy={-3} rx={2} ry={3.4} fill="#C99A98" opacity={0.9} />
      <ellipse cx={0} cy={-2} rx={1.1} ry={2} fill="#2A241C" opacity={0.35} />
    </>
  );
}
