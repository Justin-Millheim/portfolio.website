"use client";

import { useMemo, useState } from "react";
import type { Draft, DraftSection, MissType, SectionAction } from "@/lib/sally/types";
import { checkSingability, meterLine } from "@/lib/sally/meter";
import { sectionHeading } from "@/lib/sally/format";

// The live lyric sheet (PRD §9.2, §10): clean monospace text, one line per
// bar, bracketed labels with delivery cues, no line numbers. Every section
// carries the one-tap refine toolbar and a lock; the Syllable Meter renders
// per-line badges color-coded against the section budget (toggleable —
// it's a guide, not gospel).

export interface ActionRequest {
  section: DraftSection;
  action: SectionAction;
  note?: string | null;
  missType?: MissType | null;
}

const REGISTER_CHIPS = ["rawer", "softer", "bolder", "more detached", "more vulnerable", "funnier (one wit beat)"];
const MISS_CHIPS: { key: MissType; label: string; hint: string }[] = [
  { key: "content", label: "Imagery", hint: "the specifics/metaphor are wrong" },
  { key: "structure", label: "Structure", hint: "the shape is wrong — loops back to the blueprint" },
  { key: "register", label: "Energy", hint: "too aggressive / tender / detached / earnest" },
  { key: "craft", label: "How it sings", hint: "bars don't sit in the mouth" },
  { key: "unclear", label: "Not sure", hint: "let Sally diagnose it" },
];

export default function LyricSheet({
  draft,
  isLatest,
  versionCount,
  viewVersion,
  onViewVersion,
  busySection,
  onAction,
  onToggleLock,
  onCopy,
  onRedraft,
  allLocked,
  onGoSuno,
  disabled,
}: {
  draft: Draft;
  isLatest: boolean;
  versionCount: number;
  viewVersion: number;
  onViewVersion: (v: number) => void;
  busySection: { label: string; action: SectionAction } | null;
  onAction: (req: ActionRequest) => void;
  onToggleLock: (label: string) => void;
  onCopy: () => void;
  onRedraft: () => void;
  allLocked: boolean;
  onGoSuno: () => void;
  disabled: boolean;
}) {
  const [meterOn, setMeterOn] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<"menu" | "revise" | "register">("menu");
  const [note, setNote] = useState("");
  const [miss, setMiss] = useState<MissType | null>(null);
  const [showFlags, setShowFlags] = useState(false);

  const flags = useMemo(() => checkSingability(draft.sections), [draft.sections]);

  const weakSet = useMemo(() => {
    const set = new Set<string>();
    for (const w of draft.weakLines) set.add(`${w.section}::${w.line.trim()}`);
    return set;
  }, [draft.weakLines]);

  function openDrawer(label: string) {
    setOpenSection(openSection === label ? null : label);
    setDrawer("menu");
    setNote("");
    setMiss(null);
  }

  function fire(section: DraftSection, action: SectionAction, opts?: { note?: string | null; missType?: MissType | null }) {
    setOpenSection(null);
    onAction({ section, action, note: opts?.note ?? null, missType: opts?.missType ?? null });
  }

  const interactive = isLatest && !disabled;

  return (
    <div className="sb-panel sb-fadein">
      <div className="sb-sheet-head">
        <div>
          <h2 className="sb-serif sb-sheet-title">{draft.title}</h2>
          <div className="sb-mono sb-sheet-sub">
            draft v{draft.version} · words &amp; music
            {!isLatest && <span className="sb-old-badge"> — older version, read-only</span>}
          </div>
        </div>
        <div className="sb-sheet-tools">
          {versionCount > 1 && (
            <select
              className="sb-version-pick sb-mono"
              value={viewVersion}
              onChange={(e) => onViewVersion(Number(e.target.value))}
              title="Browse draft versions"
            >
              {Array.from({ length: versionCount }, (_, i) => i + 1).map((v) => (
                <option key={v} value={v}>v{v}</option>
              ))}
            </select>
          )}
          <button
            className={`sb-tool ${meterOn ? "on" : ""}`}
            onClick={() => setMeterOn(!meterOn)}
            title="Syllable meter — an aid, not gospel"
          >
            ## meter
          </button>
          <button className="sb-tool" onClick={() => setShowFlags(!showFlags)} title="Run the singability sweep">
            ♪ check
          </button>
          <button className="sb-tool" onClick={onCopy} title="Copy the full lyric sheet">
            ⧉ copy
          </button>
        </div>
      </div>

      {showFlags && (
        <div className="sb-flagbox">
          <div className="sb-eyebrow">Singability sweep — {flags.length ? `${flags.length} flag${flags.length > 1 ? "s" : ""}` : "all clear"}</div>
          {flags.length === 0 ? (
            <p className="sb-hint">Every bar sits in budget with clean tails. Sing it.</p>
          ) : (
            <ul>
              {flags.map((f, i) => (
                <li key={i}>
                  <span className="sb-mono sb-flag-where">{f.section}</span> “{f.line}” —{" "}
                  {f.meter.flags.includes("over") && `${f.meter.syllables} syl (budget ${f.meter.budget?.min}–${f.meter.budget?.max})`}
                  {f.meter.flags.includes("cluster") && " consonant-cluster tail"}
                  {f.meter.flags.includes("closed-tail") && " closed chorus tail (wants an open vowel)"}
                </li>
              ))}
            </ul>
          )}
          <p className="sb-mono sb-meter-disclaimer">syllable counts are heuristic — a guide, not gospel</p>
        </div>
      )}

      <div className="sb-sheet">
        {draft.sections.map((section) => {
          const busyHere = busySection?.label === section.label;
          const drawerOpen = openSection === section.label && interactive;
          return (
            <div key={section.label} className={`sb-section ${section.locked ? "locked" : ""} ${busyHere ? "busy" : ""}`}>
              <div className="sb-section-head">
                <span className="sb-mono sb-section-label">[{sectionHeading(section)}]</span>
                <div className="sb-section-tools">
                  {interactive && (
                    <button
                      className={`sb-tool ${drawerOpen ? "on" : ""}`}
                      onClick={() => openDrawer(section.label)}
                      disabled={!!busySection || section.locked}
                      title="Refine this section"
                    >
                      refine
                    </button>
                  )}
                  {interactive && (
                    <button
                      className={`sb-lock ${section.locked ? "on" : ""}`}
                      onClick={() => onToggleLock(section.label)}
                      disabled={!!busySection}
                      title={section.locked ? "Unlock this section" : "Lock it — this section is done"}
                    >
                      {section.locked ? "✓ locked" : "lock"}
                    </button>
                  )}
                </div>
              </div>

              {busyHere ? (
                <div className="sb-section-busy sb-mono">Sally&apos;s reworking this one…</div>
              ) : (
                <div className="sb-lines">
                  {section.lines.map((line, i) => {
                    const m = meterOn ? meterLine(section, i) : null;
                    const weak = weakSet.has(`${section.label}::${line.trim()}`);
                    const tone = m
                      ? m.flags.includes("over")
                        ? "red"
                        : m.flags.includes("near")
                          ? "amber"
                          : "green"
                      : "";
                    return (
                      <div key={i} className="sb-line">
                        <span className={`sb-line-text ${weak ? "weak" : ""}`} title={weak ? "Sally flagged this one — ask her about it" : undefined}>
                          {line}
                        </span>
                        {m && (
                          <span className={`sb-syl ${tone}`}>
                            {m.syllables}
                            {(m.flags.includes("cluster") || m.flags.includes("closed-tail")) && (
                              <i title={m.flags.includes("cluster") ? "consonant-cluster tail" : "closed chorus tail"}>△</i>
                            )}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {drawerOpen && !busyHere && (
                <div className="sb-drawer">
                  {drawer === "menu" && (
                    <div className="sb-drawer-grid">
                      <button className="sb-chip" onClick={() => setDrawer("revise")}>↻ revise…</button>
                      <button className="sb-chip" onClick={() => fire(section, "tighten")}>tighten</button>
                      <button className="sb-chip" onClick={() => setDrawer("register")}>make it more…</button>
                      <button className="sb-chip" onClick={() => fire(section, "more_specific")}>more specific</button>
                      <button className="sb-chip" onClick={() => fire(section, "alternatives")}>3 alternatives</button>
                      <button className="sb-chip" onClick={() => fire(section, "punch_ending")}>punch up the ending</button>
                    </div>
                  )}
                  {drawer === "register" && (
                    <div className="sb-drawer-grid">
                      {REGISTER_CHIPS.map((chip) => (
                        <button key={chip} className="sb-chip" onClick={() => fire(section, "register", { note: chip })}>
                          {chip}
                        </button>
                      ))}
                      <button className="sb-chip quiet" onClick={() => setDrawer("menu")}>← back</button>
                    </div>
                  )}
                  {drawer === "revise" && (
                    <div className="sb-revise-box">
                      <div className="sb-eyebrow">What kind of miss is it?</div>
                      <div className="sb-drawer-grid">
                        {MISS_CHIPS.map((c) => (
                          <button
                            key={c.key}
                            className={`sb-chip ${miss === c.key ? "on" : ""}`}
                            title={c.hint}
                            onClick={() => setMiss(c.key)}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Anything specific? (optional)"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                      <div className="sb-row-gap">
                        <button
                          className="sb-btn sb-btn-ghost"
                          onClick={() => fire(section, "revise", { note: note.trim() || null, missType: miss ?? "unclear" })}
                        >
                          Send it back to Sally
                        </button>
                        <button className="sb-btn sb-btn-quiet" onClick={() => setDrawer("menu")}>← back</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isLatest && (
        <div className="sb-sheet-foot">
          <button className="sb-btn sb-btn-quiet" onClick={onRedraft} disabled={disabled || !!busySection}>
            ↺ Re-draft from the blueprint
          </button>
          <button
            className="sb-btn sb-btn-primary sb-gate-btn"
            onClick={onGoSuno}
            disabled={!allLocked || disabled || !!busySection}
            title={allLocked ? "All sections locked — to the booth" : "Lock every section to unlock the Suno prompt"}
          >
            {allLocked ? "To the booth — Suno prompt →" : `Lock all sections to continue (${draft.sections.filter((s) => s.locked).length}/${draft.sections.length})`}
          </button>
        </div>
      )}
    </div>
  );
}
