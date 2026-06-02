"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { track } from "@/lib/analytics";

// Internal <Link> that records a `content_click` — which content surface pulled
// the visitor deeper into the site (home mode cards, featured/project tiles,
// section links). `kind` groups the surface; `label` identifies the item.
export default function ContentLink({
  to,
  kind,
  label,
  className,
  children,
}: {
  to: string;
  kind: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const from = usePathname();
  return (
    <Link href={to} className={className} onClick={() => track("content_click", { to, kind, label, from })}>
      {children}
    </Link>
  );
}
