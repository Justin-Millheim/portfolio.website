"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";

// Invisible. Mounted on each blog post. Fires:
//   - blog_view       once on open (slug + title) — the "opened" denominator
//   - blog_progress   once per scroll-depth milestone (25/50/75/100%)
//
// "Read rate" for a post = blog_progress(depth=75) / blog_view. Comparing
// blog_progress(depth=75) counts across slugs answers "which posts get read
// more." The milestone ladder shows where readers drop off within a post.
const MILESTONES = [25, 50, 75, 100];

export default function ReadTracker({ slug, title }: { slug: string; title: string }) {
  const fired = useRef<Set<number>>(new Set());

  useEffect(() => {
    track("blog_view", { slug, title });

    let ticking = false;
    const measure = () => {
      ticking = false;
      const el = document.documentElement;
      const scrollable = el.scrollHeight - el.clientHeight;
      // If the whole post fits on screen there's nothing to scroll — count it
      // as fully read once and stop.
      const pct = scrollable <= 0 ? 100 : (el.scrollTop / scrollable) * 100;
      for (const m of MILESTONES) {
        if (pct >= m && !fired.current.has(m)) {
          fired.current.add(m);
          track("blog_progress", { slug, depth: m });
        }
      }
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(measure);
    };

    measure(); // catch short posts / initial position
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [slug, title]);

  return null;
}
