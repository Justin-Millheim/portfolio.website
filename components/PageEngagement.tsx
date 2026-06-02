"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics";

// Mounted once in the root layout. For every page (including client-side route
// changes) it accumulates *visible* time and the deepest scroll reached, then
// fires a single `page_engagement` event when the page is left — on SPA
// navigation, tab-hide, or unload. Visible-only timing means a tab left open in
// the background doesn't inflate "time on page".
export default function PageEngagement() {
  const pathname = usePathname();
  const state = useRef({ activeMs: 0, resumedAt: 0, maxScroll: 0, sent: false });

  useEffect(() => {
    const s = state.current;
    s.activeMs = 0;
    s.maxScroll = 0;
    s.sent = false;
    s.resumedAt = document.visibilityState === "visible" ? Date.now() : 0;

    const readScroll = () => {
      const el = document.documentElement;
      const scrollable = el.scrollHeight - el.clientHeight;
      const pct = scrollable <= 0 ? 100 : Math.round((el.scrollTop / scrollable) * 100);
      if (pct > s.maxScroll) s.maxScroll = pct;
    };
    const pause = () => {
      if (s.resumedAt) {
        s.activeMs += Date.now() - s.resumedAt;
        s.resumedAt = 0;
      }
    };
    const flush = () => {
      pause();
      if (s.sent) return;
      s.sent = true;
      track("page_engagement", {
        path: pathname,
        seconds: Math.round(s.activeMs / 1000),
        maxScroll: s.maxScroll,
      });
    };
    const onScroll = () => readScroll();
    const onVis = () => {
      if (document.visibilityState === "hidden") flush();
      else if (!s.resumedAt) s.resumedAt = Date.now();
    };

    readScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", flush);

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", flush);
      flush(); // SPA navigation to a new route
    };
  }, [pathname]);

  return null;
}
