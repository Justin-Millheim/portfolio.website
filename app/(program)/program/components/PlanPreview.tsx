"use client";

import type { Exercise, ProgramPrefs, RunnableSession, RunStep, SessionLog } from "@/lib/program/types";
import { getExercise } from "@/lib/program/exercises";
import { PHASE_LABEL } from "@/lib/program/format";
import ProgramPortal from "./ProgramPortal";

// "Here's Week 2, Day 1." A read-only ordered list — warm-up, main (this week's
// sets/reps with last block's weight inline), cool-down. Tap a name for how-to;
// ⇄ Swap opens the curated substitution sheet. No reroll — the program is fixed.
export default function PlanPreview({
  session,
  sessions,
  prefs,
  onApprove,
  onBack,
  onOpenExercise,
  onSwap,
}: {
  session: RunnableSession;
  sessions: SessionLog[];
  prefs: ProgramPrefs;
  onApprove: () => void;
  onBack: () => void;
  onOpenExercise: (ex: Exercise) => void;
  onSwap: (exerciseId: string) => void;
}) {
  const phases: ("warmup" | "main" | "cooldown")[] = ["warmup", "main", "cooldown"];

  return (
    <div className="t-wrap t-fadein" style={{ paddingTop: 40, paddingBottom: 120 }}>
      <button onClick={onBack} className="t-mono" style={{ background: "none", border: "none", color: "var(--t-muted)", fontSize: 13, cursor: "pointer", padding: "4px 0", marginBottom: 8 }}>
        ← Back
      </button>
      <div className="t-eyebrow" style={{ marginBottom: 4 }}>
        Week {session.week} · Day {session.day}
      </div>
      <h1 style={{ fontSize: 25, fontWeight: 700, margin: "0 0 4px" }}>{session.title}</h1>
      <p style={{ color: "var(--t-muted)", fontSize: 13, margin: "0 0 22px" }}>
        {session.steps.length} moves · tap a name for how-to, ⇄ to swap equipment.
      </p>

      {phases.map((phase) => {
        const steps = session.steps.filter((s) => s.phase === phase);
        if (steps.length === 0) return null;
        return (
          <div key={phase} style={{ marginBottom: 18 }}>
            <div className="t-eyebrow" style={{ color: "var(--t-amber)", marginBottom: 10 }}>
              {phase === "warmup" ? "🔥 " : phase === "main" ? "⚡ " : "🧘 "}{PHASE_LABEL[phase]}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {steps.map((step, i) => (
                <StepRow
                  key={`${phase}-${i}`}
                  step={step}
                  lastWeight={lastWeightFor(sessions, step.exerciseId)}
                  isSubbed={!!prefs.subs[step.exerciseId]}
                  onOpen={() => {
                    const ex = getExercise(step.exerciseId);
                    if (ex) onOpenExercise(ex);
                  }}
                  onSwap={() => onSwap(step.exerciseId)}
                />
              ))}
            </div>
          </div>
        );
      })}

      <ProgramPortal>
        <div className="t-sticky-footer">
          <button className="t-btn t-btn-primary approve" onClick={onApprove}>
            Approve &amp; start →
          </button>
        </div>
      </ProgramPortal>
    </div>
  );
}

function StepRow({
  step, lastWeight, isSubbed, onOpen, onSwap,
}: {
  step: RunStep;
  lastWeight: number | null;
  isSubbed: boolean;
  onOpen: () => void;
  onSwap: () => void;
}) {
  const ex = getExercise(step.exerciseId);
  const name = step.subLabel ?? ex?.name ?? step.exerciseId;
  const canSwap = (ex?.subs?.length ?? 0) > 0;

  return (
    <div className="t-row" style={{ alignItems: "flex-start" }}>
      <span style={{ fontSize: 22, lineHeight: 1, marginTop: 1 }}>{ex?.emoji}</span>
      <button
        onClick={onOpen}
        style={{ flex: 1, background: "none", border: "none", textAlign: "left", color: "var(--t-ink)", cursor: "pointer", padding: 0 }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
          {name}
          {isSubbed && <span className="t-mono" style={{ fontSize: 9, color: "var(--t-amber)", border: "1px solid var(--t-amber)", borderRadius: 6, padding: "1px 5px" }}>SWAP</span>}
        </div>
        <div className="t-mono" style={{ fontSize: 11, color: "var(--t-muted)", marginTop: 3 }}>
          {step.display}
          {step.loaded && lastWeight != null && (
            <span style={{ color: "var(--t-amber)" }}> · last {lastWeight} lb</span>
          )}
        </div>
      </button>
      {canSwap && (
        <button
          onClick={onSwap}
          aria-label={`Swap ${name}`}
          className="t-mono"
          style={{ background: "#1d1d1d", border: "1px solid #333", color: "var(--t-amber)", borderRadius: 9, padding: "7px 10px", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          ⇄ Swap
        </button>
      )}
    </div>
  );
}

// Newest-first scan for the most recent logged weight on a lift.
function lastWeightFor(sessions: SessionLog[], exerciseId: string): number | null {
  for (const s of sessions) {
    const log = s.exercises.find((l) => l.exerciseId === exerciseId);
    if (!log) continue;
    for (let i = log.sets.length - 1; i >= 0; i--) {
      const w = log.sets[i].weight;
      if (w != null) return w;
    }
  }
  return null;
}
