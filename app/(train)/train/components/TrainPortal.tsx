"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Renders children at <body> so position:fixed is always relative to the
// viewport (never trapped by an animated/transformed ancestor), while the
// display:contents .train-root wrapper keeps the theme variables + scoped CSS.
export default function TrainPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted || typeof document === "undefined") return null;
  return createPortal(
    <div className="train-root" style={{ display: "contents" }}>{children}</div>,
    document.body
  );
}
