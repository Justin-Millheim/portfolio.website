"use client";

import { useMemo, useState } from "react";
import { EXERCISES } from "@/lib/train/exercises";
import type { WorkoutPlan } from "@/lib/train/types";

// Search the library and insert an existing move into the plan.
export default function AddExerciseModal({
  plan,
  onAdd,
  onClose,
}: {
  plan: WorkoutPlan;
  onAdd: (exerciseId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inPlan = useMemo(() => new Set(plan.items.map((i) => i.exerciseId)), [plan]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXERCISES
      .filter((e) => !inPlan.has(e.id))
      .filter((e) => q === "" || e.name.toLowerCase().includes(q) || e.muscleLabel.toLowerCase().includes(q))
      .slice(0, 40);
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
          style={{ marginBottom: 14 }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {results.length === 0 && (
            <p style={{ color: "var(--t-muted)", fontSize: 14, textAlign: "center", padding: "12px 0" }}>
              No matches. Try a different word.
            </p>
          )}
          {results.map((e) => (
            <div key={e.id} className="t-row">
              <span style={{ fontSize: 20 }}>{e.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.name}</div>
                <div className="t-mono" style={{ fontSize: 11, color: "var(--t-faint)" }}>{e.muscleLabel}</div>
              </div>
              <button
                onClick={() => onAdd(e.id)}
                className="t-mono"
                style={{
                  background: "linear-gradient(135deg,var(--t-flame),var(--t-amber))", border: "none",
                  color: "#fff", borderRadius: 9, padding: "9px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                }}
              >
                + Add
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
