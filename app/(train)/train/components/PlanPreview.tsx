"use client";

import { useEffect, useRef, useState } from "react";
import type { Exercise, Phase, PlanItem, WorkoutPlan } from "@/lib/train/types";
import { getExercise } from "@/lib/train/exercises";
import { EQUIPMENT_LABEL, FOCUS_LABEL } from "@/lib/train/format";

const PHASE_META: { key: Phase; label: string; icon: string }[] = [
  { key: "warmup", label: "Warm Up", icon: "🔥" },
  { key: "circuit", label: "Circuit", icon: "⚡" },
  { key: "cooldown", label: "Cool Down", icon: "🧘" },
];

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const a = [...arr];
  const [x] = a.splice(from, 1);
  a.splice(to, 0, x);
  return a;
}

export default function PlanPreview({
  plan,
  onApprove,
  onReroll,
  onSwap,
  onOpenExercise,
  onAddExercise,
  onReorder,
  onBack,
}: {
  plan: WorkoutPlan;
  onApprove: () => void;
  onReroll: () => void;
  onSwap: (index: number) => void;
  onOpenExercise: (ex: Exercise) => void;
  onAddExercise: () => void;
  onReorder: (items: PlanItem[]) => void;
  onBack: () => void;
}) {
  // Local working copy so live drag reordering doesn't fight the parent.
  const [order, setOrder] = useState<PlanItem[]>(plan.items);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const orderRef = useRef(order);
  orderRef.current = order;
  const dragRef = useRef<number | null>(dragIndex);
  dragRef.current = dragIndex;

  useEffect(() => { setOrder(plan.items); }, [plan]);

  // Drag reorder is constrained to within a phase (you can't drag a stretch
  // into the circuit). Pointer events so it works on touch + desktop.
  useEffect(() => {
    if (dragIndex == null) return;
    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      const di = dragRef.current;
      if (di == null) return;
      const ord = orderRef.current;
      const phase = ord[di]?.phase;
      const rows = Array.from(document.querySelectorAll<HTMLElement>("[data-train-row]"));
      let target = di;
      for (const row of rows) {
        if (row.dataset.phase !== phase) continue;
        const idx = Number(row.dataset.index);
        const rect = row.getBoundingClientRect();
        if (e.clientY >= rect.top && e.clientY <= rect.bottom) { target = idx; break; }
      }
      if (target !== di) {
        const next = moveItem(ord, di, target);
        orderRef.current = next;
        dragRef.current = target;
        setOrder(next);
        setDragIndex(target);
      }
    };
    const onUp = () => { onReorder(orderRef.current); setDragIndex(null); };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragIndex, onReorder]);

  return (
    <div className="t-wrap t-fadein" style={{ paddingTop: 36, paddingBottom: 110, userSelect: dragIndex != null ? "none" : "auto" }}>
      <button onClick={onBack} className="t-mono" style={{ background: "none", border: "none", color: "var(--t-muted)", fontSize: 13, cursor: "pointer", marginBottom: 8 }}>
        ← Change
      </button>
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 4px" }}>
        Your <span style={{ color: "var(--t-flame)" }}>{FOCUS_LABEL[plan.focus]}</span> plan
      </h1>
      <p className="t-mono" style={{ color: "var(--t-muted)", fontSize: 12, margin: "0 0 16px" }}>
        ~{plan.durationTarget} MIN · {EQUIPMENT_LABEL[plan.equipment].toUpperCase()} · {plan.items.length} MOVES
      </p>

      <div style={{ background: "var(--t-surface2)", border: "1px solid var(--t-line)", borderRadius: 12, padding: "12px 14px", marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: "var(--t-muted)", margin: 0, lineHeight: 1.6 }}>
          Review and approve today&apos;s plan. Tap{" "}
          <span aria-hidden style={{ display: "inline-flex", verticalAlign: "middle", width: 22, height: 22, borderRadius: "50%", background: "#1d1d1d", border: "1px solid #333", color: "var(--t-amber)", alignItems: "center", justifyContent: "center", fontSize: 13 }}>⟳</span>{" "}
          to swap a move, or drag{" "}
          <span aria-hidden style={{ verticalAlign: "middle", color: "var(--t-muted)", fontSize: 15 }}>⠿</span>{" "}
          to reorder it.
        </p>
      </div>

      {PHASE_META.map(({ key, label, icon }) => {
        const rows = order.map((it, i) => ({ it, i })).filter(({ it }) => it.phase === key);
        if (rows.length === 0) return null;
        return (
          <div key={key} style={{ marginBottom: 18 }}>
            <div className="t-eyebrow" style={{ marginBottom: 8 }}>{icon} {label}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {rows.map(({ it, i }) => {
                const ex = getExercise(it.exerciseId) as Exercise;
                const dragging = dragIndex === i;
                return (
                  <div
                    key={i}
                    data-train-row
                    data-index={i}
                    data-phase={key}
                    className="t-card"
                    style={{
                      padding: 10, display: "flex", alignItems: "center", gap: 8,
                      borderColor: dragging ? "var(--t-flame)" : undefined,
                      boxShadow: dragging ? "0 8px 22px rgba(0,0,0,0.5)" : undefined,
                      opacity: dragging ? 0.95 : 1,
                      transform: dragging ? "scale(1.015)" : "none",
                    }}
                  >
                    <button
                      aria-label={`Drag to reorder ${ex.name}`}
                      onPointerDown={(e) => { e.preventDefault(); setDragIndex(i); }}
                      style={{
                        flex: "0 0 auto", width: 30, alignSelf: "stretch", background: "none", border: "none",
                        color: "var(--t-faint)", fontSize: 18, cursor: "grab", touchAction: "none", padding: 0,
                      }}
                    >
                      ⠿
                    </button>
                    <button
                      onClick={() => onOpenExercise(ex)}
                      aria-label={`How to do ${ex.name}`}
                      style={{ background: "none", border: "none", textAlign: "left", color: "var(--t-ink)", cursor: "pointer", flex: 1, display: "flex", alignItems: "center", gap: 10, padding: 0, minWidth: 0 }}
                    >
                      <span style={{ fontSize: 22 }}>{ex.emoji}</span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>{ex.name}</span>
                        <span className="t-mono" style={{ fontSize: 11, color: "var(--t-muted)" }}>
                          {it.sets > 1 ? `${it.sets} × ` : ""}{it.reps}{ex.loaded ? " · weighted" : ""}
                        </span>
                      </span>
                    </button>
                    <button
                      onClick={() => onSwap(i)}
                      aria-label={`Swap ${ex.name} for a similar move`}
                      title="Swap for a similar move"
                      style={{
                        flex: "0 0 auto", width: 38, height: 38, borderRadius: "50%",
                        background: "#1d1d1d", border: "1px solid #333", color: "var(--t-amber)",
                        fontSize: 17, cursor: "pointer", lineHeight: 1,
                      }}
                    >
                      ⟳
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <button className="t-btn t-btn-ghost" style={{ marginTop: 8 }} onClick={onAddExercise}>
        ＋ Add an exercise
      </button>
      <p className="t-mono" style={{ textAlign: "center", color: "var(--t-faint)", fontSize: 11, marginTop: 14 }}>
        Tap a name for how-to · ⟳ to swap · ⠿ drag to reorder · ＋ to add your own.
      </p>

      {/* Always-visible action bar */}
      <div className="t-sticky-footer">
        <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 520, margin: "0 auto" }}>
          <button className="t-btn t-btn-ghost reroll" onClick={onReroll} aria-label="Reroll whole plan" title="Reroll whole plan">⟳</button>
          <button className="t-btn t-btn-primary approve" onClick={onApprove}>Approve &amp; Start →</button>
        </div>
      </div>
    </div>
  );
}
