import Link from "next/link";
import { MapPin, Github, Linkedin, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="foot-inner">
          <div className="foot-sign serif">
            Clearer systems, closer teams, better work. Let&rsquo;s build something.
          </div>
          <div className="foot-links">
            {/* TODO: replace with your real links */}
            <a className="icon-btn" href="https://www.linkedin.com/in/justin-millheim" aria-label="LinkedIn">
              <Linkedin size={18} />
            </a>
            <a className="icon-btn" href="https://github.com/REPLACE-ME" aria-label="GitHub">
              <Github size={18} />
            </a>
            <a className="icon-btn" href="mailto:jaymillheim@gmail.com" aria-label="Email">
              <Mail size={18} />
            </a>
          </div>
        </div>
        <div className="foot-meta">
          <span>
            <MapPin size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
            Wasatch Front, UT
          </span>
          <span>Built by me with Next.js, Claude Code, and Vercel</span>
          <Link href="/now">/now</Link>
          <span>© {new Date().getFullYear()} Justin Millheim</span>
        </div>
      </div>
    </footer>
  );
}
