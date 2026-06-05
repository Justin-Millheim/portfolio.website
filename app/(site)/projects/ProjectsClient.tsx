"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/content/projects";
import { track } from "@/lib/analytics";

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
  const reduce = useReducedMotion();

  const toggle = (t: string) =>
    setSelected((s) => {
      const next = s.includes(t) ? s.filter((x) => x !== t) : [...s, t];
      track("filter_apply", { where: "projects", value: t, active: !s.includes(t) });
      return next;
    });

  const switchView = (v: "shipped" | "blog") => {
    if (v !== view) track("view_toggle", { value: v });
    setView(v);
  };

  const shown = selected.length
    ? projects.filter((p) => p.tags.some((t) => selected.includes(t)))
    : projects;

  return (
    <>
      <div className="toggle">
        <button className={view === "shipped" ? "on" : ""} onClick={() => switchView("shipped")}>
          Shipped
        </button>
        <button className={view === "blog" ? "on" : ""} onClick={() => switchView("blog")}>
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
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              className="grid"
              key={selected.join("|") || "all"}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: reduce ? 0.12 : 0.26, ease: [0.22, 1, 0.36, 1] }}
            >
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
                return p.post ? (
                  <Link
                    key={p.id}
                    className="tile"
                    href={`/blog/${p.post}`}
                    onClick={() => track("content_click", { to: `/blog/${p.post}`, kind: "project_tile", label: p.title, from: "/projects" })}
                  >
                    {inner}
                  </Link>
                ) : (
                  <div key={p.id} className="tile" style={{ cursor: "default" }}>
                    {inner}
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </>
      ) : (
        <div className="feed">
          {log.map((l) => (
            <Link
              key={l.slug}
              className="entry"
              href={`/blog/${l.slug}`}
              onClick={() => track("content_click", { to: `/blog/${l.slug}`, kind: "project_log_entry", label: l.title, from: "/projects" })}
            >
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
