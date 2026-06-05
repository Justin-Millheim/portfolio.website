"use client";

import type { Exercise, Phase, WorkoutPlan } from "@/lib/train/types";
import { getExercise } from "@/lib/train/exercises";
import { EQUIPMENT_LABEL, FOCUS_LABEL } from "@/lib/train/format";

const PHASE_META: { key: Phase; label: string; icon: string }[] = [
  { key: "warmup", label: "Warm Up", icon: "🔥" },
  { key: "circuit", label: "Circuit", icon: "⚡" },
  { key: "cooldown", label: "Cool Down", icon: "🧘" },
];

export default function PlanPreview({
  plan,
  onApprove,
  onReroll,
  onSwap,
  onOpenExercise,
  onBack,
}: {
  plan: WorkoutPlan;
  onApprove: () => void;
  onReroll: () => void;
  onSwap: (index: number) => void;
  onOpenExercise: (ex: Exercise) => void;
  onBack: () => void;
}) {
  return (
    <div className="t-wrap t-fadein" style={{ paddingTop: 36 }}>
      <button onClick={onBack} className="t-mono" style={{ background: "none", border: "none", color: "var(--t-muted)", fontSize: 13, cursor: "pointer", marginBottom: 8 }}>
        ← Change
      </button>
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 4px" }}>
        Your <span style={{ color: "var(--t-flame)" }}>{FOCUS_LABEL[plan.focus]}</span> plan
      </h1>
      <p className="t-mono" style={{ color: "var(--t-muted)", fontSize: 12, margin: "0 0 20px" }}>
        ~{plan.durationTarget} MIN · {EQUIPMENT_LABEL[plan.equipment].toUpperCase()} · {plan.items.length} MOVES
      </p>

      {PHASE_META.map(({ key, label, icon }) => {
        const items = plan.items.map((it, i) => ({ it, i })).filter(({ it }) => it.phase === key);
        if (items.length === 0) return null;
        return (
          <div key={key} style={{ marginBottom: 18 }}>
            <div className="t-eyebrow" style={{ marginBottom: 8 }}>{icon} {label}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map(({ it, i }) => {
                const ex = getExercise(it.exerciseId) as Exercise;
                const canSwap = key !== "warmup";
                return (
                  <div key={i} className="t-card" style={{ padding: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <button
                        onClick={() => onOpenExercise(ex)}
                        style={{ background: "none", border: "none", textAlign: "left", color: "var(--t-ink)", cursor: "pointer", flex: 1, display: "flex", alignItems: "center", gap: 12, padding: 0 }}
                      >
                        <span style={{ fontSize: 22 }}>{ex.emoji}</span>
                        <span>
                          <span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>{ex.name}</span>
                          <span className="t-mono" style={{ fontSize: 11, color: "var(--t-muted)" }}>
                            {it.sets > 1 ? `${it.sets} × ` : ""}{it.reps}{ex.loaded ? " · weighted" : ""}
                          </span>
                        </span>
                      </button>
                      <span className="t-mono" style={{ fontSize: 10, color: "var(--t-faint)" }}>info ›</span>
                    </div>
                    {canSwap && (
                      <button
                        onClick={() => onSwap(i)}
                        className="t-mono"
                        style={{
                          marginTop: 10, width: "100%", padding: "9px",
                          background: "#1d1d1d", border: "1px solid #333", borderRadius: 9,
                          color: "var(--t-amber)", fontSize: 12, cursor: "pointer", letterSpacing: 0.5,
                        }}
                      >
                        ⟳ Swap for a similar move
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <button className="t-btn t-btn-ghost" style={{ marginTop: 8, marginBottom: 12 }} onClick={onReroll}>
        ⟳ Reroll whole plan
      </button>
      <button className="t-btn t-btn-primary" onClick={onApprove}>
        Approve &amp; Start →
      </button>
      <p className="t-mono" style={{ textAlign: "center", color: "var(--t-faint)", fontSize: 11, marginTop: 12 }}>
        Tap an exercise name to see how to do it · Swap to trade it for a similar one.
      </p>
    </div>
  );
}
