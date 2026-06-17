"use client";

import { useEffect } from "react";

// Drifts the fixed noise texture slightly as the page scrolls, for a subtle
// parallax. Sets a CSS variable that body::before consumes. Respects the user's
// reduced-motion preference and throttles with requestAnimationFrame.
export default function ScrollFX() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const shift = window.scrollY * 0.3;
        document.documentElement.style.setProperty("--noise-shift", `${shift}px`);
        raf = 0;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}
