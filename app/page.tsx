import Link from "next/link";
import { Boxes, Users, Sparkles, ArrowRight, ArrowUpRight, Mail, ChevronDown } from "lucide-react";
import { projects } from "@/content/projects";
import Reveal from "@/components/Reveal";
import Testimonials from "@/components/Testimonials";

const modes = [
  { icon: Boxes, title: "Builder", line: "Tools, systems, and side projects I can not leave alone, built to make the work better.", href: "/blog/what-builder-means" },
  { icon: Users, title: "Connector", line: "Communities, events, and experiences I design so people do their best work together.", href: "/blog/what-connector-means" },
  { icon: Sparkles, title: "AI Enthusiast", line: "All-in on agentic AI: Claude Skills, MCP, and the workflows reshaping how product gets built.", href: "/blog/what-ai-enthusiast-means" },
];

export default function Home() {
  const featured = projects.filter((p) => p.featured);

  return (
    <>
      <header className="hero">
        <div className="wrap">
          <div className="eyebrow rv" style={{ animationDelay: ".05s" }}>
            Builder · Connector · AI Enthusiast
          </div>
          <h1 className="rv" style={{ animationDelay: ".15s" }}>
            Cleaner systems, closer teams, <em>better work.</em>
          </h1>
          <p className="sub rv" style={{ animationDelay: ".3s" }}>
            I build tools, systems, and communities &mdash; and I&rsquo;m all-in<br />
            on where AI is taking the work.
          </p>
          <div className="now rv" style={{ animationDelay: ".45s" }}>
            <span className="dot" />
            <div>
              <div className="label">Currently</div>
              <p>
                PM intern at Adobe, building Claude Skills, MCP workflows, and internal tooling, while finishing my MBA at Utah. President of the Product Management Association, Chair for Lassonde&rsquo;s Get Seeded program, and VP of the MBA Student Association.
              </p>
              <p style={{ color: "var(--muted)", marginTop: 10 }}>
                Off the clock I&rsquo;m usually building something by hand or somewhere with bad cell service.
              </p>
            </div>
          </div>
          <div className="scroll-cue rv" style={{ animationDelay: ".6s" }}>
            <ChevronDown size={15} /> what I&rsquo;m about
          </div>
        </div>
      </header>

      <section className="section" style={{ paddingTop: "clamp(12px,3vw,32px)" }}>
        <div className="wrap">
          <Reveal>
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
          </Reveal>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <Reveal>
            <div className="sec-head">
              <h2 className="serif">Recent Projects</h2>
              <div className="rule" />
              <Link className="nav-link" href="/projects">
                see all →
              </Link>
            </div>
            <div className="grid">
              {featured.map((p) => (
                <Link key={p.id} className="tile" href={p.post ? `/blog/${p.post}` : "/projects"}>
                  <span className="dom">{p.tags.join(" · ")}</span>
                  <h4>{p.title}</h4>
                  <p>{p.blurb}</p>
                  <span className="go">
                    <ArrowUpRight size={17} />
                  </span>
                </Link>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <Reveal>
            <Testimonials />
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <Reveal>
          <div className="cta">
            <h2 className="serif">Got a project in mind?</h2>
            <p>I love a good build. Tell me what you&rsquo;re working on and let&rsquo;s talk shop.</p>
            <div className="cta-btns">
              <Link className="btn solid" href="/about">
                <Mail size={15} /> Start a conversation
              </Link>
              <Link className="btn" href="/work">
                See my work
              </Link>
            </div>
          </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
