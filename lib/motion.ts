import type { Variants } from "framer-motion";

// Shared scroll-reveal motion. Used by the staggered grids on the homepage
// (mode cards, featured tiles, stats). Keep the easing in sync with the CSS
// `rise` keyframe and the <Reveal> component so motion feels like one system.
export const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};
