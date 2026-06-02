"use client";

import type { ReactNode } from "react";
import { useContact } from "@/components/ContactContext";

export default function ContactButton({
  className,
  children,
  source = "contact_button",
}: {
  className?: string;
  children: ReactNode;
  source?: string;
}) {
  const { open } = useContact();
  return (
    <button className={className} onClick={() => open(source)} type="button">
      {children}
    </button>
  );
}
