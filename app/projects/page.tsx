import { projects, projectDomains } from "@/content/projects";
import { getLogPosts, formatDate } from "@/lib/log";
import ProjectsClient from "./ProjectsClient";

export const metadata = {
  title: "Projects — Justin Millheim",
  description: "Things I have shipped, and things I am shipping right now.",
};

export default function ProjectsPage() {
  const log = getLogPosts().map((p) => ({ ...p, dateLabel: formatDate(p.date) }));
  return (
    <section className="section" style={{ paddingTop: "clamp(48px,7vw,90px)" }}>
      <div className="wrap">
        <div className="eyebrow">Things shipped, and things shipping</div>
        <div className="sec-head" style={{ marginTop: 10 }}>
          <h2 className="serif">Projects</h2>
          <div className="rule" />
        </div>
        <p style={{ color: "var(--muted)", marginBottom: 26, maxWidth: "58ch" }}>
          Software, systems, models, things I made by hand, and experiences built for other people. One builder behind all of it.
        </p>
        <ProjectsClient projects={projects} domains={projectDomains} log={log} />
      </div>
    </section>
  );
}
