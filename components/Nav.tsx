"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useContact } from "@/components/ContactContext";

const links: [string, string][] = [
  ["/", "Home"],
  ["/work", "Work"],
  ["/projects", "Projects"],
  ["/blog", "Blog"],
  ["/about", "About"],
];

function isActive(href: string, path: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
}

export default function Nav() {
  const path = usePathname();
  const { open } = useContact();
  const [menuOpen, setMenuOpen] = useState(false);
  const current = links.find(([href]) => isActive(href, path)) || links[0];

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link className="logo" href="/">
          Justin <b>Millheim</b>
        </Link>

        {/* Desktop: full tab bar */}
        <div className="nav-links nav-desktop">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className={`nav-link${isActive(href, path) ? " active" : ""}`}>
              {label}
            </Link>
          ))}
          <button className="btn-talk" onClick={open}>
            Connect
          </button>
        </div>

        {/* Mobile: current tab + dropdown, then Connect */}
        <div className="nav-mobile">
          <div className="nav-dd">
            <button
              className="nav-dd-btn"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-haspopup="true"
            >
              {current[1]} <ChevronDown size={14} style={{ transform: menuOpen ? "rotate(180deg)" : "none", transition: ".2s" }} />
            </button>
            {menuOpen && (
              <>
                <div className="nav-dd-scrim" onClick={() => setMenuOpen(false)} />
                <div className="nav-dd-menu">
                  {links.map(([href, label]) => (
                    <Link
                      key={href}
                      href={href}
                      className={`nav-dd-item${isActive(href, path) ? " active" : ""}`}
                      onClick={() => setMenuOpen(false)}
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
          <button className="btn-talk" onClick={open}>
            Connect
          </button>
        </div>
      </div>
    </nav>
  );
}
