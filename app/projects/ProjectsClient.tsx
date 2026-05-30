"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/content/projects";

const MotionLink = motion.create(Link);

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
  const [view, setView] = useState<"shipped" | "blog">("shipped");
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (t: string) =>
    setSelected((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));

  const shown = selected.length
    ? projects.filter((p) => p.tags.some((t) => selected.includes(t)))
    : projects;

  return (
    <>
      <div className="toggle">
        <button className={view === "shipped" ? "on" : ""} onClick={() => setView("shipped")}>
          Shipped
        </button>
        <button className={view === "blog" ? "on" : ""} onClick={() => setView("blog")}>
          Blog
        </button>
      </div>

      {view === "shipped" ? (
        <>
          <div className="chips">
            <button className={`chip${selected.length === 0 ? " on" : ""}`} onClick={() => setSelected([])}>
              All
            </button>
            {domains.map((d) => (
              <button key={d} className={`chip${selected.includes(d) ? " on" : ""}`} onClick={() => toggle(d)}>
                {d}
              </button>
            ))}
          </div>
          <div className="grid">
            <AnimatePresence mode="popLayout" initial={false}>
              {shown.map((p) => {
                const inner = (
                  <>
                    <span className="dom">{p.tags.join(" · ")}</span>
                    <h4>{p.title}</h4>
                    <p>{p.blurb}</p>
                    {p.post && (
                      <span className="go">
                        <ArrowUpRight size={17} />
                      </span>
                    )}
                  </>
                );
                const anim = {
                  layout: true,
                  initial: { opacity: 0, scale: 0.96 },
                  animate: { opacity: 1, scale: 1 },
                  exit: { opacity: 0, scale: 0.96 },
                  transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
                };
                return p.post ? (
                  <MotionLink key={p.id} className="tile" href={`/blog/${p.post}`} {...anim}>
                    {inner}
                  </MotionLink>
                ) : (
                  <motion.div key={p.id} className="tile" style={{ cursor: "default" }} {...anim}>
                    {inner}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </>
      ) : (
        <div className="feed">
          {log.map((l) => (
            <Link key={l.slug} className="entry" href={`/blog/${l.slug}`}>
              <div className="d">{l.dateLabel}</div>
              <div className="entry-title serif">{l.title}</div>
              <p>{l.excerpt}</p>
            </Link>
          ))}
          {log.length === 0 && (
            <p style={{ color: "var(--muted)" }}>No posts yet. Add an .mdx file to content/blog/.</p>
          )}
        </div>
      )}
    </>
  );
}
