"use client";

import { useState } from "react";
import Link from "next/link";
import type { Project } from "@/content/projects";

type LogItem = { slug: string; title: string; excerpt: string; dateLabel: string };

export default function ProjectsClient({
  projects,
  domains,
  log,
}: {
  projects: Project[];
  domains: string[];
  log: LogItem[];
}) {
  const [view, setView] = useState<"shipped" | "log">("shipped");
  const [domain, setDomain] = useState<string>("All");

  const shown = domain === "All" ? projects : projects.filter((p) => p.domain === domain);

  return (
    <>
      <div className="toggle">
        <button className={view === "shipped" ? "on" : ""} onClick={() => setView("shipped")}>
          Shipped
        </button>
        <button className={view === "log" ? "on" : ""} onClick={() => setView("log")}>
          Log
        </button>
      </div>

      {view === "shipped" ? (
        <>
          <div className="chips">
            <button className={`chip${domain === "All" ? " on" : ""}`} onClick={() => setDomain("All")}>
              All
            </button>
            {domains.map((d) => (
              <button key={d} className={`chip${domain === d ? " on" : ""}`} onClick={() => setDomain(d)}>
                {d}
              </button>
            ))}
          </div>
          <div className="grid">
            {shown.map((p) => (
              <div key={p.id} className="tile" style={{ cursor: "default" }}>
                <span className="dom">{p.domain}</span>
                <h4>{p.title}</h4>
                <p>{p.blurb}</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="feed">
          {log.map((l) => (
            <Link key={l.slug} className="entry" href={`/log/${l.slug}`}>
              <div className="d">{l.dateLabel}</div>
              <div className="entry-title serif">{l.title}</div>
              <p>{l.excerpt}</p>
            </Link>
          ))}
          {log.length === 0 && (
            <p style={{ color: "var(--muted)" }}>No posts yet. Add an .mdx file to content/log/.</p>
          )}
        </div>
      )}
    </>
  );
}
