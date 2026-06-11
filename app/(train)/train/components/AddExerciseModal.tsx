"use client";

import { useMemo, useState } from "react";
import { EXERCISES } from "@/lib/train/exercises";
import type { Exercise, WorkoutPlan } from "@/lib/train/types";

// Which plan phase an exercise belongs to, from its library type.
function groupOf(ex: Exercise): "warmup" | "circuit" | "cooldown" {
  if (ex.type === "warmup") return "warmup";
  if (ex.type === "cooldown") return "cooldown";
  return "circuit";
}

const GROUPS: { key: "warmup" | "circuit" | "cooldown"; label: string; icon: string }[] = [
  { key: "warmup", label: "Warm Up", icon: "🔥" },
  { key: "circuit", label: "Main Workout", icon: "⚡" },
  { key: "cooldown", label: "Cool Down", icon: "🧘" },
];

export default function AddExerciseModal({
  plan,
  onAdd,
  onOpenExercise,
  onClose,
}: {
  plan: WorkoutPlan;
  onAdd: (exerciseId: string) => void;
  onOpenExercise: (ex: Exercise) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inPlan = useMemo(() => new Set(plan.items.map((i) => i.exerciseId)), [plan]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXERCISES
      .filter((e) => !inPlan.has(e.id))
      .filter((e) => q === "" || e.name.toLowerCase().includes(q) || e.muscleLabel.toLowerCase().includes(q));
  }, [query, inPlan]);

  return (
    <div className="t-modal-scrim" onClick={onClose}>
      <div className="t-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: 22, margin: 0 }}>Add an exercise</h2>
          <button onClick={onClose} aria-label="Close"
            style={{ background: "#1d1d1d", border: "1px solid #333", color: "var(--t-muted)", borderRadius: 10, width: 36, height: 36, fontSize: 18, cursor: "pointer" }}>
            ✕
          </button>
        </div>

        <input
          type="text"
          autoFocus
          placeholder="Search moves (e.g. squat, plank, curl)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ marginBottom: 16 }}
        />

        {results.length === 0 && (
          <p style={{ color: "var(--t-muted)", fontSize: 14, textAlign: "center", padding: "12px 0" }}>
            No matches. Try a different word.
          </p>
        )}

        {GROUPS.map(({ key, label, icon }) => {
          const group = results.filter((e) => groupOf(e) === key);
          if (group.length === 0) return null;
          return (
            <div key={key} style={{ marginBottom: 18 }}>
              <div className="t-eyebrow" style={{ marginBottom: 8 }}>{icon} {label}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {group.map((e) => (
                  <div key={e.id} className="t-row">
                    <button
                      onClick={() => onOpenExercise(e)}
                      aria-label={`How to do ${e.name}`}
                      style={{ background: "none", border: "none", textAlign: "left", color: "var(--t-ink)", cursor: "pointer", flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12, padding: 0 }}
                    >
                      <span style={{ fontSize: 20 }}>{e.emoji}</span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.name}</span>
                        <span className="t-mono" style={{ fontSize: 11, color: "var(--t-faint)" }}>{e.muscleLabel} · tap for how-to</span>
                      </span>
                    </button>
                    <button
                      onClick={() => onAdd(e.id)}
                      className="t-mono"
                      style={{
                        flex: "0 0 auto", background: "linear-gradient(135deg,var(--t-flame),var(--t-amber))", border: "none",
                        color: "#fff", borderRadius: 9, padding: "9px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                      }}
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
