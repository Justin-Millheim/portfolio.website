"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import ContactModal from "@/components/ContactModal";

const ContactCtx = createContext<{ open: () => void }>({ open: () => {} });

export const useContact = () => useContext(ContactCtx);

export default function ContactProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <ContactCtx.Provider value={{ open: () => setIsOpen(true) }}>
      {children}
      <ContactModal open={isOpen} onClose={() => setIsOpen(false)} />
    </ContactCtx.Provider>
  );
}
