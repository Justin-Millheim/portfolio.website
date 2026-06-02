import Image from "next/image";
import { Github, Linkedin, Mail, Music } from "lucide-react";
import OutboundLink from "@/components/OutboundLink";
import ContentLink from "@/components/ContentLink";

export const metadata = {
  title: "About — Justin Millheim",
  description: "Product manager and builder finishing an MBA at the University of Utah. The story behind the work.",
};

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
              for friends, the occasional song, something on the laser bed. I am a{" "}
              <span className="hl">serial hobbyist</span> with a fondness for outdoor recreation and overly
              ambitious adventures, usually with an audiobook playing on the way there.
            </p>
            <p>
              What truly fills my cup though are people and impact. The things I am proudest of are the times where I brought
              a group together, or when I left something better for whoever comes next. The professional
              version of my story can be found on my{" "}
              <ContentLink to="/work" className="text-link" kind="about_text_link" label="work_page">Work page</ContentLink>, but it grows out of the same
              principle: I love turning a messy idea into something that works, for the people I care about.
            </p>
            <div style={{ marginTop: 34 }}>
              <div className="eyebrow" style={{ marginBottom: 12 }}>
                Reach me
              </div>
              <p style={{ fontSize: 15, color: "var(--muted)", marginBottom: 14 }}>
                Always up to talk product, AI tooling, or a project you cannot stop thinking about.
              </p>
              <div className="connect">
                <OutboundLink label="linkedin" className="btn" href="https://www.linkedin.com/in/justin-millheim" target="_blank" rel="noopener noreferrer">
                  <Linkedin size={15} /> LinkedIn
                </OutboundLink>
                <OutboundLink label="email" className="btn" href="mailto:jaymillheim@gmail.com">
                  <Mail size={15} /> Email
                </OutboundLink>
                <OutboundLink label="github" className="btn" href="https://github.com/Justin-Millheim" target="_blank" rel="noopener noreferrer">
                  <Github size={15} /> GitHub
                </OutboundLink>
                <OutboundLink label="suno" className="btn" href="https://suno.com/@jkmillheim" target="_blank" rel="noopener noreferrer">
                  <Music size={15} /> Suno
                </OutboundLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
