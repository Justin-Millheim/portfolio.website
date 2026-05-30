import { Github, Linkedin, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="foot-inner">
          <div className="foot-sign serif">
            Cleaner systems, closer teams, better work. Let&rsquo;s build something.
          </div>
          <div className="foot-links">
            <a className="icon-btn" href="https://www.linkedin.com/in/justin-millheim" aria-label="LinkedIn">
              <Linkedin size={18} />
            </a>
            <a className="icon-btn" href="https://github.com/Justin-Millheim" aria-label="GitHub">
              <Github size={18} />
            </a>
            <a className="icon-btn" href="mailto:jaymillheim@gmail.com" aria-label="Email">
              <Mail size={18} />
            </a>
          </div>
        </div>
        <div className="foot-meta">
          <span>Designed and built by me with Claude Code, caffeine, GitHub, and Vercel</span>
          <span className="foot-copy">© {new Date().getFullYear()} Justin Millheim</span>
        </div>
      </div>
    </footer>
  );
}
