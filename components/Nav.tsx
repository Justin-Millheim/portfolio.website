"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links: [string, string][] = [
  ["/", "Home"],
  ["/work", "Work"],
  ["/projects", "Projects"],
  ["/about", "About"],
];

export default function Nav() {
  const path = usePathname();
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
          <Link className="btn-talk" href="/about">
            Connect
          </Link>
        </div>
      </div>
    </nav>
  );
}
