"use client";

import { useEffect, useRef, useState } from "react";
import type { Exercise, Phase, PlanItem, WorkoutPlan } from "@/lib/train/types";
import { getExercise } from "@/lib/train/exercises";
import { EQUIPMENT_LABEL, FOCUS_LABEL } from "@/lib/train/format";
import TrainPortal from "./TrainPortal";

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

interface DragState {
  idx: number;          // global order index being dragged
  phase: Phase;
  startY: number;       // pointer y at drag start
  step: number;         // row height + gap (how far siblings slide)
  phaseStart: number;   // first global index of this phase
  count: number;        // rows in this phase
  centers: Map<number, number>; // global index -> original center y
}

export default function PlanPreview({
  plan, onApprove, onReroll, onSwap, onOpenExercise, onAddExercise, onReorder, onBack,
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
  const [order, setOrder] = useState<PlanItem[]>(plan.items);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dragY, setDragY] = useState(0);
  const [target, setTarget] = useState<number | null>(null); // local target position in phase

  const orderRef = useRef(order); orderRef.current = order;
  const dragRef = useRef<DragState | null>(drag); dragRef.current = drag;
  const targetRef = useRef<number | null>(target); targetRef.current = target;

  useEffect(() => { if (!drag) setOrder(plan.items); }, [plan, drag]);

  function startDrag(orderIdx: number, e: React.PointerEvent) {
    e.preventDefault();
    const ord = orderRef.current;
    const phase = ord[orderIdx].phase;
    const rows = Array.from(document.querySelectorAll<HTMLElement>("[data-train-row]"))
      .filter((r) => r.dataset.phase === phase);
    const centers = new Map<number, number>();
    let step = 64;
    for (const r of rows) {
      const idx = Number(r.dataset.index);
      const rect = r.getBoundingClientRect();
      centers.set(idx, rect.top + rect.height / 2);
      if (idx === orderIdx) step = rect.height + 8;
    }
    const phaseIdxs = [...centers.keys()].sort((a, b) => a - b);
    setDrag({ idx: orderIdx, phase, startY: e.clientY, step, phaseStart: phaseIdxs[0], count: phaseIdxs.length, centers });
    setDragY(0);
    setTarget(orderIdx - phaseIdxs[0]);
  }

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      const d = dragRef.current;
      if (!d) return;
      const dy = e.clientY - d.startY;
      setDragY(dy);
      const draggedCenter = (d.centers.get(d.idx) ?? 0) + dy;
      let localTarget = 0;
      d.centers.forEach((c, idx) => { if (idx !== d.idx && c < draggedCenter) localTarget += 1; });
      localTarget = Math.max(0, Math.min(d.count - 1, localTarget));
      setTarget(localTarget);
    };
    const onUp = () => {
      const d = dragRef.current;
      const lt = targetRef.current;
      if (d && lt != null) {
        const localFrom = d.idx - d.phaseStart;
        if (lt !== localFrom) {
          const ord = orderRef.current;
          const block = ord.slice(d.phaseStart, d.phaseStart + d.count);
          const moved = moveItem(block, localFrom, lt);
          const next = [...ord.slice(0, d.phaseStart), ...moved, ...ord.slice(d.phaseStart + d.count)];
          setOrder(next);
          onReorder(next);
        }
      }
      setDrag(null); setDragY(0); setTarget(null);
    };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [drag, onReorder]);

  // Visual offset for a row during an active drag.
  function rowTransform(globalIdx: number): { transform: string; z: number; dragging: boolean } {
    if (!drag) return { transform: "none", z: 1, dragging: false };
    if (globalIdx === drag.idx) return { transform: `translateY(${dragY}px) scale(1.02)`, z: 60, dragging: true };
    const localFrom = drag.idx - drag.phaseStart;
    const local = globalIdx - drag.phaseStart;
    const lt = target ?? localFrom;
    let shift = 0;
    if (globalIdx >= drag.phaseStart && globalIdx < drag.phaseStart + drag.count) {
      if (lt > localFrom && local > localFrom && local <= lt) shift = -drag.step;
      else if (lt < localFrom && local >= lt && local < localFrom) shift = drag.step;
    }
    return { transform: `translateY(${shift}px)`, z: 1, dragging: false };
  }

  return (
    <>
      <div className="t-wrap t-fadein" style={{ paddingTop: 36, paddingBottom: 120, userSelect: drag ? "none" : "auto" }}>
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
                  const t = rowTransform(i);
                  return (
                    <div
                      key={i}
                      data-train-row
                      data-index={i}
                      data-phase={key}
                      className="t-card"
                      style={{
                        padding: 10, display: "flex", alignItems: "center", gap: 8,
                        transform: t.transform,
                        zIndex: t.z, position: "relative",
                        transition: t.dragging ? "none" : "transform 0.18s ease",
                        borderColor: t.dragging ? "var(--t-flame)" : undefined,
                        boxShadow: t.dragging ? "0 10px 26px rgba(0,0,0,0.55)" : undefined,
                        opacity: t.dragging ? 0.97 : 1,
                      }}
                    >
                      <button
                        aria-label={`Drag to reorder ${ex.name}`}
                        onPointerDown={(e) => startDrag(i, e)}
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
      </div>

      {/* Portaled so the bar is always pinned to the viewport bottom. */}
      <TrainPortal>
        <div className="t-sticky-footer">
          <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 520, margin: "0 auto" }}>
            <button className="t-btn t-btn-ghost reroll" onClick={onReroll} aria-label="Reroll whole plan" title="Reroll whole plan">⟳</button>
            <button className="t-btn t-btn-primary approve" onClick={onApprove}>Approve &amp; Start →</button>
          </div>
        </div>
      </TrainPortal>
    </>
  );
}
