import { Boxes, Users, Sparkles, ArrowRight, ArrowUpRight, Mail } from "lucide-react";
import { projects } from "@/content/projects";
import Reveal from "@/components/Reveal";
import Testimonials from "@/components/Testimonials";
import ContactButton from "@/components/ContactButton";
import ContentLink from "@/components/ContentLink";

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
        </div>
      </header>

      <section className="section" style={{ paddingTop: "clamp(28px,5vw,56px)" }}>
        <div className="wrap">
          <Reveal>
            <div className="sec-head">
              <h2 className="serif">What I&rsquo;m about</h2>
              <div className="rule" />
            </div>
            <div className="modes">
              {modes.map((m) => (
                <ContentLink key={m.title} className="mode" to={m.href} kind="mode_card" label={m.title}>
                  <div className="ic">
                    <m.icon size={22} />
                  </div>
                  <h3>{m.title}</h3>
                  <p>{m.line}</p>
                  <span className="more">
                    explore <ArrowRight size={13} />
                  </span>
                </ContentLink>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <Reveal>
            <div className="sec-head">
              <h2 className="serif">What I&rsquo;ve been up to</h2>
              <div className="rule" />
              <ContentLink className="nav-link" to="/projects" kind="section_link" label="see_recent_projects">
                See recent projects →
              </ContentLink>
            </div>
            <div className="grid">
              {featured.map((p) => (
                <ContentLink key={p.id} className="tile" to={p.post ? `/blog/${p.post}` : "/projects"} kind="featured_tile" label={p.title}>
                  <span className="dom">{p.tags.join(" · ")}</span>
                  <h4>{p.title}</h4>
                  <p>{p.blurb}</p>
                  <span className="go">
                    <ArrowUpRight size={17} />
                  </span>
                </ContentLink>
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
            <p>I love a good build. Tell me what you&rsquo;re working on and let&rsquo;s talk shop. Maybe I can help.</p>
            <div className="cta-btns">
              <ContactButton className="btn solid" source="home_cta">
                <Mail size={15} /> Start a conversation
              </ContactButton>
              <ContentLink className="btn" to="/work" kind="cta_link" label="see_my_work">
                See my work
              </ContentLink>
            </div>
          </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
