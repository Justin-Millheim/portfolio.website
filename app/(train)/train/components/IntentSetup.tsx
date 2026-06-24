"use client";

import type { Constraint, Difficulty, Equipment, Focus } from "@/lib/train/types";
import { EQUIPMENT_LABEL, FOCUS_LABEL } from "@/lib/train/format";

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
  hasHistory,
  onPrevious,
  onHistory,
  account,
  onSignIn,
  onSignOut,
  showGuestNudge,
  onDismissNudge,
}: {
  value: Intent;
  onChange: (next: Intent) => void;
  onGenerate: () => void;
  hasHistory: boolean;
  onPrevious: () => void;
  onHistory: () => void;
  account: { mode: "guest" | "cloud"; email?: string } | null;
  onSignIn: () => void;
  onSignOut: () => void;
  showGuestNudge: boolean;
  onDismissNudge: () => void;
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
        <span className="t-eyebrow" style={{ color: "var(--t-flame)" }}>🐯 TRENT</span>
        {hasHistory && (
          <button onClick={onHistory} className="t-mono" style={{ background: "none", border: "none", color: "var(--t-muted)", fontSize: 13, cursor: "pointer" }}>
            Progress →
          </button>
        )}
      </div>
      <h1 style={{ fontSize: 30, fontWeight: 700, margin: "6px 0 4px", lineHeight: 1.15 }}>
        What are we <span style={{ color: "var(--t-flame)" }}>training</span> today?
      </h1>
      <p style={{ color: "var(--t-muted)", fontSize: 14, margin: "0 0 14px" }}>
        Tell me what you&apos;re feeling and I&apos;ll build the whole thing — warm‑up, workout, and cool‑down.
      </p>

      {account && (
        <div className="t-mono" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--t-faint)", marginBottom: 22 }}>
          {account.mode === "cloud" ? (
            <>
              <span style={{ color: "var(--t-muted)" }}>☁ {account.email ?? "Signed in"}</span>
              <button onClick={onSignOut} style={{ background: "none", border: "none", color: "var(--t-amber)", cursor: "pointer", fontFamily: "inherit", fontSize: 11 }}>Sign out</button>
            </>
          ) : (
            <>
              <span>Guest — saved on this device</span>
              <button onClick={onSignIn} style={{ background: "none", border: "none", color: "var(--t-amber)", cursor: "pointer", fontFamily: "inherit", fontSize: 11 }}>Sign in to sync →</button>
            </>
          )}
        </div>
      )}

      {showGuestNudge && (
        <div style={{ background: "linear-gradient(135deg, rgba(255,106,50,0.16), rgba(255,174,61,0.1))", border: "1px solid var(--t-flame)", borderRadius: 14, padding: "14px 16px", marginBottom: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <p style={{ fontSize: 13, color: "var(--t-ink)", margin: 0, lineHeight: 1.5 }}>
              <span style={{ fontWeight: 700 }}>🐯 Don&apos;t lose your progress.</span> Create an account to remember and save your workouts across devices.
            </p>
            <button onClick={onDismissNudge} aria-label="Dismiss" style={{ background: "none", border: "none", color: "var(--t-muted)", fontSize: 16, cursor: "pointer", lineHeight: 1, flex: "0 0 auto" }}>✕</button>
          </div>
          <button onClick={onSignIn} className="t-mono" style={{ marginTop: 12, width: "100%", padding: "11px", borderRadius: 10, cursor: "pointer", background: "linear-gradient(135deg,var(--t-flame),var(--t-amber))", border: "none", color: "#fff", fontSize: 13, fontWeight: 700 }}>
            Create an account →
          </button>
        </div>
      )}

      {hasHistory && (
        <button
          onClick={onPrevious}
          className="t-mono"
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "13px", marginBottom: 22, borderRadius: 12, cursor: "pointer",
            background: "var(--t-surface)", border: "1px solid var(--t-line)", color: "var(--t-ink)",
            fontSize: 13, fontWeight: 700,
          }}
        >
          ↺ Do a previous workout
        </button>
      )}

      <Label>I want to work…</Label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 22 }}>
        {FOCUS.map((f) => (
          <button key={f.id} className={`t-chip${value.focus === f.id ? " active" : ""}`} onClick={() => set({ focus: f.id })}>
            <span style={{ fontSize: 16 }}>{f.emoji}</span> {FOCUS_LABEL[f.id]}
          </button>
        ))}
      </div>

      <Label>For how long?</Label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 22 }}>
        {DURATIONS.map((d) => (
          <button key={d} className={`t-chip${value.minutes === d ? " active" : ""}`} onClick={() => set({ minutes: d })}>
            {d}<span style={{ fontSize: 10, opacity: 0.8 }}>m</span>
          </button>
        ))}
      </div>

      <Label>What do you have?</Label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 22 }}>
        {EQUIPMENT.map((eq) => (
          <button key={eq} className={`t-chip${value.equipment === eq ? " active" : ""}`} onClick={() => set({ equipment: eq })}>
            {EQUIPMENT_LABEL[eq]}
          </button>
        ))}
      </div>

      <Label>Any constraints? <span style={{ color: "var(--t-muted)", fontWeight: 400 }}>(optional)</span></Label>
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
        Build it, Trent →
      </button>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="t-eyebrow" style={{ marginBottom: 10 }}>{children}</div>;
}
