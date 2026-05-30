import { Mountain, Compass, BookOpen, Hammer, Sparkles, Github, Linkedin, Mail } from "lucide-react";

export const metadata = {
  title: "About — Justin Millheim",
  description: "Builder PM, MBA candidate, and serial maker along the Wasatch Front.",
};

const offClock = [
  { icon: Mountain, label: "Rock hounding" },
  { icon: Compass, label: "Fishing the Wasatch" },
  { icon: BookOpen, label: "Stormlight Archive" },
  { icon: Hammer, label: "Laser engraving" },
  { icon: Sparkles, label: "Camping" },
];

export default function AboutPage() {
  return (
    <section className="section" style={{ paddingTop: "clamp(48px,7vw,90px)" }}>
      <div className="wrap">
        <div className="eyebrow">Who is behind the workshop</div>
        <div className="sec-head" style={{ marginTop: 10 }}>
          <h2 className="serif">About</h2>
          <div className="rule" />
        </div>
        <div className="about">
          {/* TODO: replace this placeholder with a real photo (next/image, 4:5) */}
          <div className="photo">[ your photo here, a good one, 4:5 ]</div>
          <div>
            <p>
              I am a builder PM finishing my MBA at the University of Utah. Before grad school I did SaaS
              product management. Before that I got a degree in{" "}
              <span className="hl">Mandarin Chinese</span>, which taught me more about ambiguity and
              patience than any PM course has.
            </p>
            <p>
              The thread running through everything I do is the same. I like turning a vague, messy thing
              into a <span className="hl">system that makes the experience better</span> for the people
              inside it, whether that is a product roadmap, a student org&rsquo;s operating system, a weekend
              trip for friends, or a slab of walnut on a laser bed.
            </p>
            <p>
              When I am not building software, you will find me along the Wasatch Front. Rock hounding for
              geodes, chasing fresh DWR stocking reports, deep in the Stormlight Archive, or camping
              somewhere with bad cell service and good views.
            </p>
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
                Always up to talk product, AI tooling, or where the trout are biting.
              </p>
              <div className="connect">
                <a className="btn" href="https://www.linkedin.com/in/justin-millheim">
                  <Linkedin size={15} /> LinkedIn
                </a>
                <a className="btn" href="https://github.com/Justin-Millheim">
                  <Github size={15} /> GitHub
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
