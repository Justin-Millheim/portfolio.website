"use client";

import { useEffect, useRef, useState } from "react";
import type { Exercise, ExerciseLog, PhaseTimes, Phase, WorkoutPlan } from "@/lib/train/types";
import { getExercise } from "@/lib/train/exercises";
import { getStore } from "@/lib/train/storage";
import { formatTime } from "@/lib/train/format";
import SessionTimer from "./SessionTimer";

function parseTarget(reps: string): number | null {
  const m = reps.match(/\d+/);
  if (!m) return null;
  // Timed prescriptions ("30 seconds") aren't a rep target.
  if (/second/i.test(reps)) return null;
  return parseInt(m[0], 10);
}

function emptyLogs(plan: WorkoutPlan): ExerciseLog[] {
  return plan.items.map((it) => ({
    exerciseId: it.exerciseId,
    phase: it.phase,
    skipped: false,
    sets: Array.from({ length: it.sets }, (_, i) => ({
      setNumber: i + 1,
      weight: null,
      reps: null,
      rpe: null,
      completed: false,
    })),
  }));
}

const PHASE_HEADING: Record<Phase, string> = {
  warmup: "Warm Up",
  circuit: "Circuit",
  cooldown: "Cool Down",
};

export default function Runner({
  plan,
  onComplete,
  onExit,
  onOpenExercise,
}: {
  plan: WorkoutPlan;
  onComplete: (logs: ExerciseLog[], totalSeconds: number, phaseTimes: PhaseTimes) => void;
  onExit: () => void;
  onOpenExercise: (ex: Exercise) => void;
}) {
  const items = plan.items;
  const [itemIndex, setItemIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [subMode, setSubMode] = useState<"work" | "rest">("work");
  const [timer, setTimer] = useState<number | null>(items[0]?.duration ?? null);
  const [timerActive, setTimerActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [logs, setLogs] = useState<ExerciseLog[]>(() => emptyLogs(plan));

  // Per-set input drafts.
  const [weightDraft, setWeightDraft] = useState<number | null>(null);
  const [repsDraft, setRepsDraft] = useState<number | null>(null);
  const [rpeDraft, setRpeDraft] = useState<number | null>(null);

  // Master session clock + per-phase buckets (drive the corner widget & splits).
  const totalRef = useRef(0);
  const bucketRef = useRef<PhaseTimes>({ warmup: 0, circuit: 0, cooldown: 0 });
  const phaseRef = useRef<Phase>(items[0]?.phase ?? "circuit");
  const [elapsed, setElapsed] = useState(0);

  const item = items[itemIndex];
  const ex = getExercise(item.exerciseId) as Exercise;
  const isTimed = item.duration != null;
  const isLoaded = ex.loaded;

  // Keep the phase bucket pointer in sync with the current item.
  useEffect(() => {
    phaseRef.current = item.phase;
  }, [itemIndex, item.phase]);

  // Load drafts (incl. last-used weight pre-fill) whenever we move to a new item.
  useEffect(() => {
    setRepsDraft(parseTarget(item.reps));
    setRpeDraft(null);
    if (ex.loaded) {
      let alive = true;
      getStore().lastWeight(ex.id).then((w) => {
        if (alive) setWeightDraft(w);
      });
      return () => {
        alive = false;
      };
    }
    setWeightDraft(null);
  }, [itemIndex, item.reps, ex]);

  // Master clock: ticks continuously while not paused.
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      totalRef.current += 1;
      bucketRef.current[phaseRef.current] += 1;
      setElapsed(totalRef.current);
    }, 1000);
    return () => clearInterval(id);
  }, [paused]);

  // Countdown for timed work / rest. A ref handler avoids stale closures.
  const onZeroRef = useRef<() => void>(() => {});
  onZeroRef.current = () => {
    if (subMode === "rest") finishRest();
    else completeSet();
  };
  useEffect(() => {
    if (paused || !timerActive || timer === null) return;
    if (timer > 0) {
      const id = setTimeout(() => setTimer((t) => (t ?? 1) - 1), 1000);
      return () => clearTimeout(id);
    }
    onZeroRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer, timerActive, paused]);

  function recordSet(completed: boolean) {
    setLogs((prev) => {
      const next = prev.map((l) => ({ ...l, sets: l.sets.map((s) => ({ ...s })) }));
      const set = next[itemIndex].sets[currentSet - 1];
      set.completed = completed;
      set.reps = repsDraft;
      set.rpe = rpeDraft;
      set.weight = isLoaded ? weightDraft : null;
      return next;
    });
  }

  function completeSet() {
    recordSet(true);
    if (currentSet < item.sets) {
      setCurrentSet((s) => s + 1);
      setSubMode("rest");
      setTimer(item.rest > 0 ? item.rest : null);
      setTimerActive(item.rest > 0);
    } else {
      advance(false);
    }
  }

  function finishRest() {
    setSubMode("work");
    setTimer(item.duration ?? null);
    setTimerActive(false);
    setRpeDraft(null);
    setRepsDraft(parseTarget(item.reps));
  }

  function resetForItem(idx: number) {
    setCurrentSet(1);
    setSubMode("work");
    setTimer(items[idx].duration ?? null);
    setTimerActive(false);
  }

  function advance(skip: boolean) {
    if (skip) {
      setLogs((prev) => {
        const next = prev.map((l) => ({ ...l, sets: l.sets.map((s) => ({ ...s })) }));
        const anyDone = next[itemIndex].sets.some((s) => s.completed);
        if (!anyDone) next[itemIndex].skipped = true;
        return next;
      });
    }
    const nextIdx = itemIndex + 1;
    if (nextIdx < items.length) {
      setItemIndex(nextIdx);
      resetForItem(nextIdx);
    } else {
      finish();
    }
  }

  function prev() {
    if (itemIndex === 0) return;
    const p = itemIndex - 1;
    setItemIndex(p);
    resetForItem(p);
  }

  function finish() {
    onComplete(logs, totalRef.current, { ...bucketRef.current });
  }

  // ---- progress across the whole plan ----
  const overallPct = Math.round((itemIndex / items.length) * 100);

  return (
    <div className="t-wrap t-fadein" style={{ paddingTop: 56 }}>
      <SessionTimer seconds={elapsed} phase={item.phase} />

      {/* phase + overall progress */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span className="t-eyebrow" style={{ color: "var(--t-amber)" }}>
          {PHASE_HEADING[item.phase]}
        </span>
        <span className="t-mono" style={{ fontSize: 11, color: "var(--t-faint)" }}>
          {itemIndex + 1} / {items.length}
        </span>
      </div>
      <div style={{ height: 3, background: "#1a1a1a", borderRadius: 2, marginBottom: 18 }}>
        <div style={{ height: "100%", width: `${overallPct}%`, background: "linear-gradient(90deg,var(--t-flame),var(--t-amber))", borderRadius: 2, transition: "width 0.4s" }} />
      </div>

      {/* ===== REST ===== */}
      {subMode === "rest" ? (
        <div className="t-card" style={{ textAlign: "center", borderRadius: 20, padding: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>😮‍💨</div>
          <h2 style={{ fontSize: 22, color: "var(--t-amber)", margin: "0 0 4px" }}>Rest</h2>
          <p className="t-mono" style={{ color: "var(--t-muted)", fontSize: 12, margin: "0 0 18px" }}>
            Set {currentSet} of {item.sets} next
          </p>
          <Ring value={timer} active={!paused} amber />
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button className="t-btn t-btn-ghost" onClick={() => setPaused((p) => !p)}>
              {paused ? "▶ Resume" : "⏸ Pause"}
            </button>
            <button className="t-btn t-btn-primary" onClick={finishRest}>Skip Rest →</button>
          </div>
        </div>
      ) : (
        /* ===== WORK ===== */
        <div className="t-card t-fadein" style={{ borderRadius: 20, padding: 24 }} key={`${itemIndex}-${currentSet}`}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              <div className="t-eyebrow" style={{ marginBottom: 4 }}>{ex.muscleLabel}</div>
              <h2 style={{ fontSize: 23, margin: 0 }}>
                {ex.emoji} {ex.name}
              </h2>
            </div>
            <button
              onClick={() => onOpenExercise(ex)}
              aria-label="How to"
              className="t-mono"
              style={{ background: "#161616", border: "1px solid #2a2a2a", color: "var(--t-amber)", borderRadius: 10, padding: "8px 10px", fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              ? How-to
            </button>
          </div>

          {/* set dots */}
          {item.sets > 1 && (
            <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
              {Array.from({ length: item.sets }, (_, i) => i + 1).map((s) => (
                <div key={s} style={{
                  width: 9, height: 9, borderRadius: "50%",
                  background: s < currentSet ? "var(--t-flame)" : s === currentSet ? "var(--t-amber)" : "#2a2a2a",
                }} />
              ))}
            </div>
          )}

          {/* targets */}
          <div style={{ background: "#0d0d0d", borderRadius: 12, padding: "12px 14px", marginBottom: 14, display: "flex", gap: 22 }}>
            <Stat label="SET" value={`${currentSet}/${item.sets}`} amber />
            <Stat label="TARGET" value={item.reps} />
            {item.rest > 0 && <Stat label="REST" value={`${item.rest}s`} muted />}
          </div>

          {/* timed hold OR weight logging */}
          {isTimed ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 16 }}>
              <Ring value={timer} active={timerActive && !paused} />
              {!timerActive ? (
                <button className="t-btn t-btn-primary" style={{ marginTop: 16 }} onClick={() => setTimerActive(true)}>
                  ▶ Start {item.duration}s
                </button>
              ) : (
                <button className="t-btn t-btn-ghost" style={{ marginTop: 16 }} onClick={() => setPaused((p) => !p)}>
                  {paused ? "▶ Resume" : "⏸ Pause"}
                </button>
              )}
            </div>
          ) : (
            isLoaded && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Field label="Weight (lb)" >
                    <input
                      type="number" inputMode="decimal" placeholder="—"
                      value={weightDraft ?? ""}
                      onChange={(e) => setWeightDraft(e.target.value === "" ? null : Number(e.target.value))}
                    />
                  </Field>
                  <Field label="Reps done">
                    <input
                      type="number" inputMode="numeric" placeholder="—"
                      value={repsDraft ?? ""}
                      onChange={(e) => setRepsDraft(e.target.value === "" ? null : Number(e.target.value))}
                    />
                  </Field>
                </div>
                <RpePicker value={rpeDraft} onChange={setRpeDraft} />
              </div>
            )
          )}

          {/* primary action */}
          {!isTimed && (
            <button className="t-btn t-btn-primary" onClick={completeSet}>
              {currentSet < item.sets ? `✓ Set ${currentSet} done → rest` : "✓ Final set done →"}
            </button>
          )}
          {isTimed && (
            <button className="t-btn t-btn-quiet" style={{ marginTop: 4 }} onClick={completeSet}>
              Mark done →
            </button>
          )}
        </div>
      )}

      {/* nav controls */}
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button className="t-btn t-btn-quiet" onClick={prev} disabled={itemIndex === 0}>◀ Prev</button>
        <button className="t-btn t-btn-quiet" onClick={() => advance(true)}>Skip ▶</button>
      </div>

      {/* up next */}
      {itemIndex + 1 < items.length && (
        <div style={{ marginTop: 14, background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 12, padding: "12px 14px" }}>
          <div className="t-eyebrow" style={{ marginBottom: 8 }}>Up Next</div>
          {items.slice(itemIndex + 1, itemIndex + 4).map((it, i) => {
            const e = getExercise(it.exerciseId);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
                <span style={{ opacity: 0.5 }}>{e?.emoji}</span>
                <span style={{ fontSize: 13, color: "#777" }}>{e?.name}</span>
                <span className="t-mono" style={{ fontSize: 11, color: "#444", marginLeft: "auto" }}>{it.reps}</span>
              </div>
            );
          })}
        </div>
      )}

      <button className="t-btn t-btn-quiet" style={{ marginTop: 20 }} onClick={onExit}>
        Exit workout
      </button>
    </div>
  );
}

function Ring({ value, active, amber }: { value: number | null; active: boolean; amber?: boolean }) {
  const color = amber ? "var(--t-amber)" : "var(--t-flame)";
  return (
    <div style={{
      width: 120, height: 120, borderRadius: "50%",
      border: `4px solid ${active ? color : "#222"}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0d0d0d", transition: "border-color 0.3s",
      boxShadow: active ? `0 0 20px ${amber ? "rgba(255,159,30,0.25)" : "rgba(255,90,30,0.3)"}` : "none",
    }}>
      <span className="t-mono" style={{ fontSize: 30, fontWeight: 700, color: active ? color : "var(--t-ink)" }}>
        {value !== null ? formatTime(value) : "--"}
      </span>
    </div>
  );
}

function Stat({ label, value, amber, muted }: { label: string; value: string; amber?: boolean; muted?: boolean }) {
  return (
    <div>
      <div className="t-mono" style={{ fontSize: 10, color: "var(--t-faint)", letterSpacing: 1, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 700, color: amber ? "var(--t-amber)" : muted ? "var(--t-muted)" : "var(--t-ink)" }}>{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <div className="t-eyebrow" style={{ marginBottom: 5 }}>{label}</div>
      {children}
    </label>
  );
}

function RpePicker({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div className="t-eyebrow" style={{ marginBottom: 6 }}>How hard? (RPE)</div>
      <div style={{ display: "flex", gap: 5 }}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className="t-mono"
            style={{
              flex: 1, padding: "8px 0", borderRadius: 7, cursor: "pointer",
              fontSize: 12, fontWeight: 700,
              background: value === n ? "linear-gradient(135deg,var(--t-flame),var(--t-amber))" : "#161616",
              border: `1px solid ${value === n ? "var(--t-flame)" : "#222"}`,
              color: value === n ? "#fff" : "#777",
            }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
