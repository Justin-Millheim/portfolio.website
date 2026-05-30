import Image from "next/image";
import { Mountain, Compass, Hammer, Headphones, Music, Github, Linkedin, Mail } from "lucide-react";

export const metadata = {
  title: "About — Justin Millheim",
  description: "Product manager and builder finishing an MBA at the University of Utah. The story behind the work.",
};

const offClock = [
  { icon: Hammer, label: "Serial hobbyist" },
  { icon: Mountain, label: "Outdoor recreation" },
  { icon: Compass, label: "Extreme adventure" },
  { icon: Headphones, label: "Audiobook enthusiast" },
];

export default function AboutPage() {
  return (
    <section className="section" style={{ paddingTop: "clamp(48px,7vw,90px)" }}>
      <div className="wrap">
        <div className="eyebrow">The man behind the name</div>
        <div className="sec-head" style={{ marginTop: 10 }}>
          <h2 className="serif">About</h2>
          <div className="rule" />
        </div>
        <div className="about">
          <div className="photo" style={{ position: "relative", overflow: "hidden", padding: 0 }}>
            <Image
              src="/headshot.png"
              alt="Justin Millheim"
              fill
              sizes="300px"
              style={{ objectFit: "cover" }}
              priority
            />
          </div>
          <div>
            <p>
              I am a product manager. I have spent the last several years shipping software at companies
              like Domo, Visier, and Mity, and right now I am at Adobe while I finish an MBA and an M.S. in
              Information Systems at the University of Utah.
            </p>
            <p>
              What actually drives me is narrower than &ldquo;product.&rdquo; I like taking a messy,
              undefined thing and turning it into a{" "}
              <span className="hl">system that works</span> &mdash; a roadmap, a student club&rsquo;s
              operating system, or a weekend trip I have over-planned for my friends. If something is vague
              and a little broken, I have a hard time leaving it alone.
            </p>
            <p>
              Before any of this I studied{" "}
              <span className="hl">Mandarin Chinese</span>, which taught me more about sitting with
              ambiguity than any PM framework has. These days I am usually building something &mdash; a
              Claude skill, a side project, a gift on a laser bed &mdash; or outside somewhere without much
              cell service.
            </p>
            <div className="eyebrow" style={{ marginTop: 30, marginBottom: 12 }}>
              Off the Clock
            </div>
            <div className="oc">
              {offClock.map((o) => (
                <span className="oc-item" key={o.label}>
                  <o.icon size={15} /> {o.label}
                </span>
              ))}
            </div>
            <div style={{ marginTop: 34 }}>
              <div className="eyebrow" style={{ marginBottom: 12 }}>
                Reach me
              </div>
              <p style={{ fontSize: 15, color: "var(--muted)", marginBottom: 14 }}>
                Always up to talk product, AI tooling, or a project you cannot stop thinking about.
              </p>
              <div className="connect">
                <a className="btn" href="https://www.linkedin.com/in/justin-millheim" target="_blank" rel="noopener noreferrer">
                  <Linkedin size={15} /> LinkedIn
                </a>
                <a className="btn" href="https://github.com/Justin-Millheim" target="_blank" rel="noopener noreferrer">
                  <Github size={15} /> GitHub
                </a>
                <a className="btn" href="https://suno.com/@jkmillheim" target="_blank" rel="noopener noreferrer">
                  <Music size={15} /> Suno
                </a>
                <a className="btn" href="mailto:jaymillheim@gmail.com">
                  <Mail size={15} /> Email
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
