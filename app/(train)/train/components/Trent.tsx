// Trent the Tiger Trainer — the app mascot.
// Rendered as the tiger emoji for now (clean and dependency-free). When the
// real Canva artwork is available as a small asset, swap this back to an
// <img src="/train/trent.png" /> — the { size, className, style } contract is
// unchanged so every placement keeps working.
export default function Trent({
  size = 96,
  className,
  style,
  title = "Trent the Tiger Trainer",
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}) {
  return (
    <span
      role="img"
      aria-label={title}
      title={title}
      className={className}
      style={{
        fontSize: Math.round(size * 0.86),
        lineHeight: 1,
        display: "inline-block",
        ...style,
      }}
    >
      🐯
    </span>
  );
}
