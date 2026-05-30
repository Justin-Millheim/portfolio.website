"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ContactModal from "@/components/ContactModal";

const links: [string, string][] = [
  ["/", "Home"],
  ["/work", "Work"],
  ["/projects", "Projects"],
  ["/about", "About"],
];

export default function Nav() {
  const path = usePathname();
  const [contactOpen, setContactOpen] = useState(false);
  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link className="logo" href="/">
          Justin <b>Millheim</b>
        </Link>
        <div className="nav-links">
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={`nav-link${path === href ? " active" : ""}`}
            >
              {label}
            </Link>
          ))}
          <button className="btn-talk" onClick={() => setContactOpen(true)}>
            Connect
          </button>
        </div>
      </div>
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </nav>
  );
}
