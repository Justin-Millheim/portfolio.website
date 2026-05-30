"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, Minus } from "lucide-react";
import type { Experience } from "@/content/experience";

const GROUPS: { key: Experience["group"]; label: string }[] = [
  { key: "professional", label: "Professional Experience" },
  { key: "leadership", label: "Leadership & Community" },
];

function Logo({ e }: { e: Experience }) {
  const initial = e.org.replace(/^The\s+/i, "").charAt(0).toUpperCase();
  return (
    <div
      style={{
        flex: "0 0 auto", width: 46, height: 46, borderRadius: 12,
        background: "#fff", border: "1px solid var(--line, #e7e3da)",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden", marginRight: 16,
      }}
      aria-hidden
    >
      {e.logo ? (
        <Image src={e.logo} alt="" width={34} height={34} style={{ objectFit: "contain", maxWidth: 34, maxHeight: 34, width: "auto", height: "auto" }} />
      ) : (
        <span style={{ fontWeight: 700, fontSize: 18, color: "var(--muted)" }}>{initial}</span>
      )}
    </div>
  );
}

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

  const renderRole = (e: Experience) => {
    const isOpen = open === e.id;
    return (
      <div className="exp" key={e.id}>
        <div className="exp-head" onClick={() => setOpen(isOpen ? null : e.id)}>
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            <Logo e={e} />
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
  };

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

      {GROUPS.map((g) => {
        const roles = shown.filter((e) => e.group === g.key);
        if (roles.length === 0) return null;
        return (
          <div key={g.key} style={{ marginTop: 8 }}>
            <div
              className="eyebrow"
              style={{ marginTop: 26, marginBottom: 14, paddingBottom: 8, borderBottom: "1px solid var(--line, #e7e3da)" }}
            >
              {g.label}
            </div>
            {roles.map(renderRole)}
          </div>
        );
      })}
    </>
  );
}
