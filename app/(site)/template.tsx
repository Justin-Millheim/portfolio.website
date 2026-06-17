"use client";

import { motion, useReducedMotion } from "framer-motion";

// Fades each page in on navigation. template.tsx remounts on every route
// change (unlike layout.tsx), so this gives a soft cut between pages.
export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
