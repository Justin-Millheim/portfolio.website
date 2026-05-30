"use client";

import type { ReactNode } from "react";
import { useContact } from "@/components/ContactContext";

export default function ContactButton({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const { open } = useContact();
  return (
    <button className={className} onClick={open} type="button">
      {children}
    </button>
  );
}
