"use client";

import type { Phase } from "@/lib/sally/types";

// The five-phase spine, made visible (PRD §14.2). Phase 0 (calibration) is
// silent and has no UI; the writer moves across 1–4. Gates are sacred:
// a step only lights up when its gate condition is met.
const STEPS: { phase: Phase; label: string }[] = [
  { phase: 1, label: "Intake" },
  { phase: 2, label: "Write" },
  { phase: 3, label: "Refine" },
  { phase: 4, label: "Suno" },
];

export default function PhaseStepper({
  current,
  reachable,
  onGo,
}: {
  current: Phase;
  reachable: Record<Phase, boolean>;
  onGo: (phase: Phase) => void;
}) {
  return (
    <div className="sb-stepper" role="tablist" aria-label="Song phases">
      {STEPS.map((s, i) => {
        const active = s.phase === current;
        const enabled = reachable[s.phase];
        return (
          <div key={s.phase} className="sb-step-cell">
            {i > 0 && <div className={`sb-step-rule ${reachable[s.phase] ? "on" : ""}`} />}
            <button
              role="tab"
              aria-selected={active}
              className={`sb-step ${active ? "active" : ""} ${enabled ? "" : "locked"}`}
              onClick={() => enabled && onGo(s.phase)}
              disabled={!enabled}
              title={enabled ? s.label : "Locked — finish the step before it"}
            >
              <span className="sb-step-num">{s.phase}</span>
              <span className="sb-step-label">{s.label}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
