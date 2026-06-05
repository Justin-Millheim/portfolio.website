"use client";

import type { Constraint, Difficulty, Equipment, Focus, WorkoutSession } from "@/lib/train/types";
import { EQUIPMENT_LABEL, FOCUS_LABEL, formatClock } from "@/lib/train/format";

export interface Intent {
  focus: Focus;
  minutes: number;
  equipment: Equipment;
  constraints: Constraint[];
  difficulty: Difficulty;
}

const FOCUS: { id: Focus; emoji: string }[] = [
  { id: "full", emoji: "🔥" },
  { id: "legs", emoji: "🦵" },
  { id: "arms", emoji: "💪" },
  { id: "core", emoji: "🧱" },
  { id: "cardio", emoji: "🏃" },
];

const DURATIONS = [15, 20, 30, 45, 60];

const EQUIPMENT: Equipment[] = ["bodyweight", "dumbbell", "bands", "full"];

const CONSTRAINTS: { id: Constraint; label: string }[] = [
  { id: "knee-friendly", label: "Easy on knees" },
  { id: "shoulder-friendly", label: "Easy on shoulders" },
  { id: "no-jumping", label: "No jumping" },
  { id: "quiet", label: "Apartment-friendly" },
  { id: "no-floor", label: "No floor work" },
];

export default function IntentSetup({
  value,
  onChange,
  onGenerate,
  recent,
  onRepeat,
  onHistory,
}: {
  value: Intent;
  onChange: (next: Intent) => void;
  onGenerate: () => void;
  recent: WorkoutSession[];
  onRepeat: (s: WorkoutSession) => void;
  onHistory: () => void;
}) {
  const set = (patch: Partial<Intent>) => onChange({ ...value, ...patch });
  const toggleConstraint = (c: Constraint) =>
    set({
      constraints: value.constraints.includes(c)
        ? value.constraints.filter((x) => x !== c)
        : [...value.constraints, c],
    });

  return (
    <div className="t-wrap t-fadein" style={{ paddingTop: 36 }}>
      <div className="t-accent-tr" />
      <div className="t-accent-bl" />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="t-eyebrow" style={{ color: "var(--t-flame)" }}>● BURN MODE</span>
        {recent.length > 0 && (
          <button onClick={onHistory} className="t-mono" style={{ background: "none", border: "none", color: "var(--t-muted)", fontSize: 12, cursor: "pointer" }}>
            History →
          </button>
        )}
      </div>
      <h1 style={{ fontSize: 30, fontWeight: 700, margin: "6px 0 4px", lineHeight: 1.15 }}>
        Today's <span style={{ color: "var(--t-flame)" }}>Workout</span>
      </h1>
      <p style={{ color: "var(--t-muted)", fontSize: 14, margin: "0 0 24px" }}>
        Tell me what you're feeling — I'll build the plan.
      </p>

      {/* FOCUS */}
      <Label>I want to work…</Label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 22 }}>
        {FOCUS.map((f) => (
          <button key={f.id} className={`t-chip${value.focus === f.id ? " active" : ""}`} onClick={() => set({ focus: f.id })}>
            <span style={{ fontSize: 16 }}>{f.emoji}</span> {FOCUS_LABEL[f.id]}
          </button>
        ))}
      </div>

      {/* DURATION */}
      <Label>For how long?</Label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 22 }}>
        {DURATIONS.map((d) => (
          <button key={d} className={`t-chip${value.minutes === d ? " active" : ""}`} onClick={() => set({ minutes: d })}>
            {d}<span style={{ fontSize: 10, opacity: 0.7 }}>m</span>
          </button>
        ))}
      </div>

      {/* EQUIPMENT */}
      <Label>What do you have?</Label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 22 }}>
        {EQUIPMENT.map((eq) => (
          <button key={eq} className={`t-chip${value.equipment === eq ? " active" : ""}`} onClick={() => set({ equipment: eq })}>
            {EQUIPMENT_LABEL[eq]}
          </button>
        ))}
      </div>

      {/* CONSTRAINTS */}
      <Label>Any constraints? <span style={{ color: "var(--t-faint)", fontWeight: 400 }}>(optional)</span></Label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
        {CONSTRAINTS.map((c) => (
          <button
            key={c.id}
            className={`t-chip${value.constraints.includes(c.id) ? " active" : ""}`}
            onClick={() => toggleConstraint(c.id)}
            style={{ flex: "0 0 auto", padding: "10px 12px" }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <button className="t-btn t-btn-primary" onClick={onGenerate}>
        Build my plan →
      </button>

      {/* REPEAT A RECENT WORKOUT */}
      {recent.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <Label>Or repeat a recent session</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recent.slice(0, 3).map((s) => (
              <button
                key={s.id}
                onClick={() => onRepeat(s)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, textAlign: "left",
                  background: "var(--t-surface)", border: "1px solid var(--t-line)",
                  borderRadius: 12, padding: "12px 14px", cursor: "pointer", color: "var(--t-ink)",
                }}
              >
                <span style={{ fontSize: 20 }}>{FOCUS.find((f) => f.id === s.focus)?.emoji}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{FOCUS_LABEL[s.focus]} · {s.durationTarget}m</div>
                  <div className="t-mono" style={{ fontSize: 11, color: "var(--t-faint)" }}>
                    {new Date(s.date).toLocaleDateString()} · {formatClock(s.totalSeconds)}
                  </div>
                </div>
                <span className="t-mono" style={{ marginLeft: "auto", color: "var(--t-amber)", fontSize: 12 }}>Repeat →</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="t-eyebrow" style={{ marginBottom: 10 }}>{children}</div>;
}
