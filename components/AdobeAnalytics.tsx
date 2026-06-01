"use client";

/**
 * AdobeAnalytics — client component that fires page-view events on:
 *   1. Initial page load
 *   2. Every client-side (soft) navigation via usePathname + useSearchParams
 *
 * Mount once inside the root layout. No props required.
 */

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackPageView } from "@/lib/adobe/analytics";

export default function AdobeAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const prevUrl = useRef<string | null>(null);

  useEffect(() => {
    // Build the full path+query string so we don't re-fire when nothing changed.
    const qs = searchParams.toString();
    const currentUrl = qs ? `${pathname}?${qs}` : pathname;

    if (currentUrl === prevUrl.current) return;
    prevUrl.current = currentUrl;

    trackPageView(pathname);
  }, [pathname, searchParams]);

  return null;
}
