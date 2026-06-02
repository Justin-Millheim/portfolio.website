"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import ContactModal from "@/components/ContactModal";
import { track } from "@/lib/analytics";

// `source` records where the modal was opened from (e.g. "nav", "home_cta",
// "nav_mobile") so we can see which surfaces actually drive outreach.
const ContactCtx = createContext<{ open: (source?: string) => void }>({ open: () => {} });

export const useContact = () => useContext(ContactCtx);

export default function ContactProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  function open(source = "unknown") {
    track("contact_open", { source, page: pathname });
    setIsOpen(true);
  }

  return (
    <ContactCtx.Provider value={{ open }}>
      {children}
      <ContactModal open={isOpen} onClose={() => setIsOpen(false)} />
    </ContactCtx.Provider>
  );
}
