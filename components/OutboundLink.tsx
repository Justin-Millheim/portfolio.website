"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { track } from "@/lib/analytics";

// Drop-in replacement for <a> that records an `outbound_click` event with a
// `label` (e.g. "linkedin") so we can see which external links people follow.
export default function OutboundLink({
  label,
  children,
  onClick,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { label: string; children: ReactNode }) {
  return (
    <a
      {...rest}
      onClick={(e) => {
        track("outbound_click", { label, href: rest.href ?? null });
        onClick?.(e);
      }}
    >
      {children}
    </a>
  );
}
