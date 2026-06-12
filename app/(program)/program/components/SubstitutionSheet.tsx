"use client";

import { getExercise } from "@/lib/program/exercises";
import ProgramPortal from "./ProgramPortal";

// Curated equipment swaps for one lift (PRD §5). Choosing a swap is sticky in
// prefs; progression still tracks under the original lift, so the chart never
// fragments. No add / remove / reorder — only these vetted equivalents.
export default function SubstitutionSheet({
  exerciseId,
  currentSubId,
  onChoose,
  onClose,
}: {
  exerciseId: string;
  currentSubId?: string;
  onChoose: (subId: string | null) => void;
  onClose: () => void;
}) {
  const ex = getExercise(exerciseId);
  if (!ex) return null;
  const subs = ex.subs ?? [];

  return (
   <ProgramPortal>
    <div className="t-modal-scrim" onClick={onClose}>
      <div className="t-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <div>
            <div className="t-eyebrow" style={{ color: "var(--t-flame)" }}>Swap equipment</div>
            <h2 style={{ fontSize: 22, margin: "4px 0 0" }}>{ex.emoji} {ex.name}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#999", borderRadius: 10, width: 36, height: 36, fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
        <p style={{ color: "var(--t-muted)", fontSize: 13, margin: "10px 0 18px", lineHeight: 1.5 }}>
          Pick a curated equivalent if you can&apos;t do this move. Your progress keeps tracking
          under {ex.name} either way.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Choice
            label={`${ex.name} (original)`}
            note="The prescribed move."
            selected={!currentSubId}
            onClick={() => { onChoose(null); onClose(); }}
          />
          {subs.map((s) => (
            <Choice
              key={s.id}
              label={s.label}
              note={s.note}
              selected={currentSubId === s.id}
              onClick={() => { onChoose(s.id); onClose(); }}
            />
          ))}
        </div>
      </div>
    </div>
   </ProgramPortal>
  );
}

function Choice({ label, note, selected, onClick }: { label: string; note: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      style={{
        textAlign: "left", cursor: "pointer", borderRadius: 12, padding: "13px 14px",
        background: selected ? "linear-gradient(135deg, rgba(255,106,50,0.18), rgba(255,174,61,0.1))" : "var(--t-surface2)",
        border: `1px solid ${selected ? "var(--t-flame)" : "var(--t-line)"}`,
        color: "var(--t-ink)",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
        {label}
        {selected && <span style={{ color: "var(--t-amber)", fontSize: 12 }}>✓</span>}
      </div>
      <div className="t-mono" style={{ fontSize: 11.5, color: "var(--t-muted)", marginTop: 4, lineHeight: 1.5 }}>{note}</div>
    </button>
  );
}
