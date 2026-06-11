"use client";

import { useState } from "react";

// Renders the Trent the Tiger Trainer mascot. Falls back to the 🐯 emoji if the
// image asset isn't present yet, so the UI is never broken.
export default function Trent({
  size = 96,
  className,
  style,
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [ok, setOk] = useState(true);
  if (!ok) {
    return (
      <span aria-hidden className={className} style={{ fontSize: Math.round(size * 0.86), lineHeight: 1, display: "inline-block", ...style }}>
        🐯
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/train/trent.png"
      alt="Trent the Tiger Trainer"
      width={size}
      height={size}
      onError={() => setOk(false)}
      className={className}
      style={{ width: size, height: size, objectFit: "contain", display: "block", ...style }}
    />
  );
}
