"use client";

import type { Outline } from "@/lib/sally/types";
import SallyMark from "./SallyMark";

// Phase 2 work surface: the approved blueprint recap and the single deliberate
// "write it" control. While the silent pipeline runs (draft → two audits →
// deliver, PRD §9.1) the writer sees only an in-world "Sally is writing…"
// state — never the machinery.

const STAGE_COPY: Record<number, string> = {
  1: "Sally is writing…",
  2: "Humming it back to herself…",
  3: "One last read-through…",
};

export default function WritePanel({
  outline,
  draftCount,
  stage,
  onWrite,
}: {
  outline: Outline;
  draftCount: number;        // existing drafts → CTA reads as re-draft
  stage: number | null;      // pipeline stage when busy
  onWrite: () => void;
}) {
  return (
    <div className="sb-panel sb-fadein">
      <div className="sb-eyebrow">The blueprint — approved ✓</div>
      <h2 className="sb-serif sb-outline-title">{outline.workingTitle}</h2>
      <p className="sb-hint" style={{ marginTop: 4 }}>
        {outline.emotionalCore} · anchored on <em>{outline.centralMetaphor}</em> ·{" "}
        {outline.structure.map((s) => s.label).join(" → ")}
      </p>

      {stage !== null ? (
        <div className="sb-writing-state">
          <div className="sb-bob"><SallyMark size={92} expression="thinking" /></div>
          <div className="sb-mono sb-writing-copy">{STAGE_COPY[stage] ?? STAGE_COPY[1]}</div>
          <div className="sb-writing-bar"><i style={{ width: `${Math.min(stage, 3) * 30 + 8}%` }} /></div>
          <p className="sb-hint">A full first draft takes her a few minutes. Worth it.</p>
        </div>
      ) : (
        <div className="sb-write-cta">
          <button className="sb-btn sb-btn-primary sb-gate-btn sb-big" onClick={onWrite}>
            {draftCount > 0 ? `Sally, re-draft it (v${draftCount + 1}) →` : "Sally, write the first draft →"}
          </button>
          <p className="sb-hint">
            She&apos;ll write the whole song against the blueprint, then walk it with you section by section.
          </p>
        </div>
      )}
    </div>
  );
}
