"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Renders children at <body> so position:fixed is always relative to the
// viewport (never trapped by an animated/transformed ancestor). The wrapper
// keeps the .program-root class (so scoped CSS + theme vars apply) but is
// neutralized to a zero-size, unpositioned block so it creates no containing
// block of its own and adds no layout.
const NEUTRAL: React.CSSProperties = {
  position: "static",
  minHeight: 0,
  height: 0,
  margin: 0,
  background: "transparent",
  zIndex: "auto",
  overflow: "visible",
};

export default function ProgramPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted || typeof document === "undefined") return null;
  return createPortal(
    <div className="program-root" style={NEUTRAL}>{children}</div>,
    document.body
  );
}
