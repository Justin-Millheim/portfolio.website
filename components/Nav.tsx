"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useContact } from "@/components/ContactContext";

const links: [string, string][] = [
  ["/", "Home"],
  ["/work", "Work"],
  ["/projects", "Projects"],
  ["/about", "About"],
];

export default function Nav() {
  const path = usePathname();
  const { open } = useContact();
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
          <button className="btn-talk" onClick={open}>
            Connect
          </button>
        </div>
      </div>
    </nav>
  );
}
