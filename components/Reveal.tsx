"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type Variant = "up" | "left" | "right" | "scale";

// Offsets per direction. `scale` adds a small zoom for full-width sections so
// they feel like they settle into place rather than just sliding.
const OFFSETS: Record<Variant, { x?: number; y?: number; scale?: number }> = {
  up: { y: 26 },
  left: { x: -48 },
  right: { x: 48 },
  scale: { y: 18, scale: 0.985 },
};

// Reveals its children once, when scrolled into view. `whileInView` is backed
// by IntersectionObserver, so this fires on scroll, not just on load.
export default function Reveal({
  children,
  delay = 0,
  variant = "up",
  y,
}: {
  children: ReactNode;
  delay?: number;
  variant?: Variant;
  y?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  const off = { ...OFFSETS[variant], ...(y !== undefined ? { y } : {}) };
  return (
    <motion.div
      initial={{ opacity: 0, ...off }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-90px" }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
