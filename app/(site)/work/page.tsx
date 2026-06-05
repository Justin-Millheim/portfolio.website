import Image from "next/image";
import { Download } from "lucide-react";
import { experience, workTags } from "@/content/experience";
import WorkClient from "./WorkClient";

export const metadata = {
  title: "Work — Justin Millheim",
  description: "Interactive resume. Filter as you like.",
};

const education = [
  { degree: "MBA · Product Management", school: "University of Utah", note: "2025 – 2027", logo: "/logos/utah.png" },
  { degree: "M.S. Information Systems", school: "University of Utah", note: "2025 – 2027", logo: "/logos/utah.png" },
  { degree: "B.A. Chinese & Global Business", school: "Brigham Young University", note: "Advanced Mandarin · ACTFL Advanced-Mid", logo: "/logos/byu.png" },
];

export default function WorkPage() {
  return (
    <section className="section" style={{ paddingTop: "clamp(48px,7vw,90px)" }}>
      <div className="wrap">
        <div className="eyebrow">The resume, on demand</div>
        <div className="sec-head" style={{ marginTop: 10 }}>
          <h2 className="serif">Work</h2>
          <div className="rule" />
          <a className="btn solid" href="/resume.pdf" target="_blank" rel="noopener noreferrer">
            <Download size={14} /> Resume
          </a>
        </div>
        <p style={{ color: "var(--muted)", marginBottom: 26, maxWidth: "56ch" }}>
          Filter as you like. Expand any role to learn more.
        </p>

        <WorkClient experience={experience} tags={workTags} />

        <div className="sec-head" style={{ marginTop: 50 }}>
          <h2 className="serif" style={{ fontSize: 24 }}>
            Education
          </h2>
          <div className="rule" />
        </div>
        <div className="grid">
          {education.map((e) => (
            <div className="tile" key={e.degree} style={{ cursor: "default", minHeight: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 10 }}>
                <span style={{ width: 38, height: 38, borderRadius: 10, background: "#fff", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flex: "0 0 auto" }}>
                  <Image src={e.logo} alt="" width={28} height={28} style={{ objectFit: "contain", width: "auto", height: "auto", maxWidth: 28, maxHeight: 28 }} />
                </span>
                <h4 style={{ margin: 0 }}>{e.degree}</h4>
              </div>
              <p style={{ color: "var(--ink)", opacity: 0.85 }}>{e.school}</p>
              <span className="dom">{e.note}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
