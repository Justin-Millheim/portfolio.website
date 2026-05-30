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
              More than anything, I am <span className="hl">a maker</span>. Long before it was a career, I
              was the one who could not leave a half-built thing alone. I would take it apart to understand
              it, then put it back together better. That itch has never gone away.
            </p>
            <p>
              These days it shows up as building for the joy of it: AI tools and side projects, trips I plan
              for friends like they are products, the occasional song, something on the laser bed. I am a
              serial hobbyist with a soft spot for{" "}
              <span className="hl">the outdoors and the slightly-too-ambitious adventure</span>, usually
              with an audiobook going on the way there.
            </p>
            <p>
              What ties it together is people. The things I am proudest of are the ones that brought a group
              together, or left something better for whoever came next. The professional version (product
              manager, MBA, the Adobe internship) is real and lives on the Work page, but it grows out of
              the same thing: I love turning a messy idea into something that works, alongside people I care
              about.
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
                <a className="btn" href="mailto:jaymillheim@gmail.com">
                  <Mail size={15} /> Email
                </a>
                <a className="btn" href="https://github.com/Justin-Millheim" target="_blank" rel="noopener noreferrer">
                  <Github size={15} /> GitHub
                </a>
                <a className="btn" href="https://suno.com/@jkmillheim" target="_blank" rel="noopener noreferrer">
                  <Music size={15} /> Suno
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
