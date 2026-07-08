export default function GrainOverlay() {
  return (
    <svg
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        opacity: 0.045,
        zIndex: 40,
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <filter id="kbk-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves={2} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#kbk-grain)" />
    </svg>
  );
}
