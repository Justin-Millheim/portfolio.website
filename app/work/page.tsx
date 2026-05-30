import { Download } from "lucide-react";
import { experience, workTags } from "@/content/experience";
import WorkClient from "./WorkClient";

export const metadata = {
  title: "Work — Justin Millheim",
  description: "Interactive résumé. Filter by what you care about.",
};

const education = [
  ["MBA · Product Management", "University of Utah · David Eccles", "2025 – 2027"],
  ["M.S. Information Systems", "University of Utah · dual degree", "2025 – 2027"],
  ["B.A. Chinese & Global Business", "Brigham Young University", "Advanced Mandarin · ACTFL Advanced-Mid"],
];

export default function WorkPage() {
  return (
    <section className="section" style={{ paddingTop: "clamp(48px,7vw,90px)" }}>
      <div className="wrap">
        <div className="eyebrow">The résumé, queryable</div>
        <div className="sec-head" style={{ marginTop: 10 }}>
          <h2 className="serif">Work</h2>
          <div className="rule" />
          {/* TODO: drop resume.pdf into /public */}
          <a className="btn solid" href="/resume.pdf">
            <Download size={14} /> Résumé
          </a>
        </div>
        <p style={{ color: "var(--muted)", marginBottom: 26, maxWidth: "56ch" }}>
          Filter by what you care about. The experience re-sorts to show the relevant proof. Tap a role to open the case.
        </p>

        <WorkClient experience={experience} tags={workTags} />

        <div className="sec-head" style={{ marginTop: 50 }}>
          <h2 className="serif" style={{ fontSize: 24 }}>
            Education
          </h2>
          <div className="rule" />
        </div>
        <div className="grid">
          {education.map(([d, s, n]) => (
            <div className="tile" key={d} style={{ cursor: "default", minHeight: "auto" }}>
              <h4>{d}</h4>
              <p style={{ color: "var(--ink)", opacity: 0.85 }}>{s}</p>
              <span className="dom">{n}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
