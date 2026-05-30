import Link from "next/link";
import { Compass, Boxes, Users, ArrowRight, ArrowUpRight, Mail, ChevronDown } from "lucide-react";
import { projects } from "@/content/projects";
import { getLogPosts, formatDate } from "@/lib/log";

const modes = [
  { icon: Compass, title: "Product", line: "Strategy, analytics, and shipping. The day job and the craft.", href: "/work" },
  { icon: Boxes, title: "Builder", line: "AI tools, automations, and side projects I could not leave alone.", href: "/projects" },
  { icon: Users, title: "Connector", line: "Communities, events, and experiences I design for other people.", href: "/projects" },
];

export default function Home() {
  const featured = projects.filter((p) => p.featured);
  const log = getLogPosts().slice(0, 2);

  return (
    <>
      <header className="hero">
        <div className="wrap">
          <div className="eyebrow rv" style={{ animationDelay: ".05s" }}>
            Builder PM · MBA @ Utah
          </div>
          <h1 className="rv" style={{ animationDelay: ".15s" }}>
            Clearer systems, closer teams, <em>better work.</em>
          </h1>
          <p className="sub rv" style={{ animationDelay: ".3s" }}>
            I am a builder PM and MBA candidate at the University of Utah, shipping AI tooling on Adobe&rsquo;s Analytics Platform team.
          </p>
          <div className="now rv" style={{ animationDelay: ".45s" }}>
            <span className="dot" />
            <div>
              <div className="label">Currently</div>
              <p>
                PM intern at Adobe (Lehi) on Customer Journey Analytics, building Claude Skills, MCP workflows, and internal tooling.{" "}
                <span style={{ color: "var(--muted)" }}>
                  Also deep in the Stormlight Archive, chasing DWR stocking reports, and engraving things that probably should not be engraved.
                </span>
              </p>
            </div>
          </div>
          <div className="scroll-cue rv" style={{ animationDelay: ".6s" }}>
            <ChevronDown size={15} /> three ways in
          </div>
        </div>
      </header>

      <section className="section">
        <div className="wrap">
          <div className="modes">
            {modes.map((m) => (
              <Link key={m.title} className="mode" href={m.href}>
                <div className="ic">
                  <m.icon size={22} />
                </div>
                <h3>{m.title}</h3>
                <p>{m.line}</p>
                <span className="more">
                  explore <ArrowRight size={13} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sec-head">
            <h2 className="serif">Selected work</h2>
            <div className="rule" />
            <Link className="nav-link" href="/projects">
              see all →
            </Link>
          </div>
          <div className="grid">
            {featured.map((p) => (
              <Link key={p.id} className="tile" href="/projects">
                <span className="dom">{p.domain}</span>
                <h4>{p.title}</h4>
                <p>{p.blurb}</p>
                <span className="go">
                  <ArrowUpRight size={17} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="widget">
            <div className="lab">Currently building</div>
            {log.map((l) => (
              <Link key={l.slug} className="wlog" href={`/log/${l.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div className="d">{formatDate(l.date)}</div>
                <h5>{l.title}</h5>
                <p>{l.excerpt}</p>
              </Link>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 22 }}>
            <Link className="btn" href="/projects">
              Read the build log <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="cta">
            <h2 className="serif">Let&rsquo;s build something.</h2>
            <p>Always up to talk product, AI tooling, or where the trout are biting.</p>
            <div className="cta-btns">
              <Link className="btn solid" href="/about">
                <Mail size={15} /> Get in touch
              </Link>
              <Link className="btn" href="/work">
                See my work
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
