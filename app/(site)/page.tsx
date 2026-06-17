import { Fragment } from "react";
import Image from "next/image";
import { Mail, CalendarClock } from "lucide-react";
import { projects } from "@/content/projects";
import { getLogPosts, formatDate } from "@/lib/log";
import { scheduleUrl } from "@/content/site";
import Reveal from "@/components/Reveal";
import Testimonials from "@/components/Testimonials";
import ContactButton from "@/components/ContactButton";
import ContentLink from "@/components/ContentLink";
import OutboundLink from "@/components/OutboundLink";
import ModeCards from "@/components/home/ModeCards";
import FeaturedTiles from "@/components/home/FeaturedTiles";
import FeatureSpot from "@/components/home/FeatureSpot";
import Stats from "@/components/home/Stats";

// Headline split into words so each can rise on its own (per-word stagger).
// `em` flags the words that carry the ember-italic emphasis.
const heroWords: { t: string; em?: boolean }[] = [
  { t: "Cleaner" },
  { t: "systems," },
  { t: "closer" },
  { t: "teams," },
  { t: "better", em: true },
  { t: "work.", em: true },
];

export default function Home() {
  const featured = projects.filter((p) => p.featured);
  const flagship = featured.find((p) => p.id === "pma-cc");
  const tiles = featured.filter((p) => p.id !== "pma-cc");
  const recent = getLogPosts().slice(0, 3);

  return (
    <>
      <header className="hero">
        <div className="wrap">
          <div className="hero-grid">
            <div className="hero-copy">
              <div className="eyebrow rv" style={{ animationDelay: ".05s" }}>
                Builder · Connector · AI Enthusiast
              </div>
              <h1 className="hero-h1">
                {heroWords.map((w, i) => (
                  <Fragment key={i}>
                    <span className="word-wrap" style={{ ["--wi" as string]: i } as React.CSSProperties}>
                      {w.em ? <em>{w.t}</em> : w.t}
                    </span>
                    {i < heroWords.length - 1 ? " " : ""}
                  </Fragment>
                ))}
              </h1>
              <p className="sub rv" style={{ animationDelay: ".55s" }}>
                I build tools, systems, and communities &mdash; and I&rsquo;m all-in<br />
                on where AI is taking the work.
              </p>
              <div className="now rv" style={{ animationDelay: ".7s" }}>
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
            <Reveal variant="right" delay={0.25}>
              <div className="hero-figure">
                <div className="hero-figure__panel" aria-hidden="true" />
                <Image
                  className="hero-figure__img"
                  src="/headshot-cutout.png"
                  alt="Justin Millheim"
                  width={1020}
                  height={1022}
                  sizes="(max-width:860px) 60vw, 360px"
                  priority
                />
              </div>
            </Reveal>
          </div>
        </div>
      </header>

      <Stats />

      <section className="section" style={{ paddingTop: "clamp(28px,5vw,56px)" }}>
        <div className="wrap">
          <Reveal>
            <div className="sec-head">
              <h2 className="serif">What I&rsquo;m about</h2>
              <div className="rule" />
            </div>
          </Reveal>
          <ModeCards />
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
          </Reveal>
          {flagship && (
            <Reveal variant="up">
              <FeatureSpot
                p={flagship}
                metric="A handoff-ready Notion operating system: pipeline, CRM, and live KPI dashboard, so each new presidency starts ahead."
              />
            </Reveal>
          )}
          <div style={{ marginTop: flagship ? "clamp(18px,2.5vw,28px)" : 0 }}>
            <FeaturedTiles items={tiles} />
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <Reveal variant="scale">
            <Testimonials />
          </Reveal>
        </div>
      </section>

      {recent.length >= 2 && (
        <section className="section section--alt">
          <div className="wrap">
            <Reveal>
              <div className="sec-head">
                <h2 className="serif">From the blog</h2>
                <div className="rule" />
                <ContentLink className="nav-link" to="/blog" kind="section_link" label="read_the_blog">
                  Read the blog →
                </ContentLink>
              </div>
            </Reveal>
            <div className="feed">
              {recent.map((l, i) => (
                <Reveal key={l.slug} delay={i * 0.06}>
                  <ContentLink className="entry" to={`/blog/${l.slug}`} kind="home_blog_entry" label={l.title}>
                    <div className="d">{formatDate(l.date)}</div>
                    <div className="entry-title serif">{l.title}</div>
                    <p>{l.excerpt}</p>
                  </ContentLink>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="wrap">
          <Reveal variant="scale">
            <div className="cta">
              <h2 className="serif">Got a project in mind?</h2>
              <p>I love a good build. Tell me what you&rsquo;re working on and let&rsquo;s talk shop. Maybe I can help.</p>
              <div className="cta-btns">
                <ContactButton className="btn solid" source="home_cta">
                  <Mail size={15} /> Start a conversation
                </ContactButton>
                {scheduleUrl ? (
                  <OutboundLink label="schedule" className="btn" href={scheduleUrl} target="_blank" rel="noopener noreferrer">
                    <CalendarClock size={15} /> Book 30 minutes
                  </OutboundLink>
                ) : null}
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
