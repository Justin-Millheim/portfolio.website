"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import type { Experience } from "@/content/experience";

export default function WorkClient({
  experience,
  tags,
}: {
  experience: Experience[];
  tags: string[];
}) {
  const [filters, setFilters] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>("adobe");

  const toggleFilter = (t: string) =>
    setFilters((f) => (f.includes(t) ? f.filter((x) => x !== t) : [...f, t]));

  const shown = filters.length
    ? experience.filter((e) => e.tags.some((t) => filters.includes(t)))
    : experience;

  return (
    <>
      <div className="chips">
        <button
          className={`chip${filters.length === 0 ? " on" : ""}`}
          onClick={() => setFilters([])}
        >
          All
        </button>
        {tags.map((t) => (
          <button
            key={t}
            className={`chip${filters.includes(t) ? " on" : ""}`}
            onClick={() => toggleFilter(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {shown.map((e) => {
        const isOpen = open === e.id;
        return (
          <div className="exp" key={e.id}>
            <div className="exp-head" onClick={() => setOpen(isOpen ? null : e.id)}>
              <div>
                <div className="role">{e.role}</div>
                <div className="org">{e.org}</div>
                <div className="exp-tags">
                  {e.tags.map((t) => (
                    <span className="tag" key={t}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="dt">{e.dates}</div>
                <div className="exp-toggle" style={{ marginLeft: "auto", marginTop: 10 }}>
                  {isOpen ? <Minus size={16} /> : <Plus size={16} />}
                </div>
              </div>
            </div>
            {isOpen && (
              <div className="exp-body">
                <div className="exp-row">
                  <div className="k">Problem</div>
                  <div className="v">{e.problem}</div>
                </div>
                <div className="exp-row">
                  <div className="k">What I did</div>
                  <div className="v">{e.did}</div>
                </div>
                <div className="exp-row">
                  <div className="k">Impact</div>
                  <div className={`v${e.todo ? " todo" : ""}`}>{e.impact}</div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
