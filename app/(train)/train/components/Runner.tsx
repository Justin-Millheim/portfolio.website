"use client";

import { useEffect, useRef, useState } from "react";
import type {
  Exercise, ExerciseLog, PhaseTimes, Phase, RunnerSnapshot, StepSnapshot, WorkoutPlan,
} from "@/lib/train/types";
import { getExercise } from "@/lib/train/exercises";
import { getStore, loadPrefs, toggleBlocked, togglePreferred, type ExercisePrefs } from "@/lib/train/storage";
import { formatTime } from "@/lib/train/format";
import SessionTimer from "./SessionTimer";

function parseTarget(reps: string): number | null {
  if (/second/i.test(reps)) return null;
  const m = reps.match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

function emptyLogs(plan: WorkoutPlan): ExerciseLog[] {
  return plan.items.map((it) => ({
    exerciseId: it.exerciseId,
    phase: it.phase,
    skipped: false,
    sets: Array.from({ length: it.sets }, (_, i) => ({
      setNumber: i + 1, weight: null, reps: null, rpe: null, completed: false,
    })),
  }));
}

const PHASE_HEADING: Record<Phase, string> = {
  warmup: "🔥 Warm Up", circuit: "⚡ Circuit", cooldown: "🧘 Cool Down",
};

export default function Runner({
  plan, initial, onComplete, onExit, onOpenExercise, onPersist,
}: {
  plan: WorkoutPlan;
  initial?: RunnerSnapshot | null;
  onComplete: (logs: ExerciseLog[], totalSeconds: number, phaseTimes: PhaseTimes) => void;
  onExit: () => void;
  onOpenExercise: (ex: Exercise) => void;
  onPersist: (snap: RunnerSnapshot) => void;
}) {
  const items = plan.items;
  const [itemIndex, setItemIndex] = useState(initial?.itemIndex ?? 0);
  const [currentSet, setCurrentSet] = useState(initial?.currentSet ?? 1);
  const [subMode, setSubMode] = useState<"work" | "rest">(initial?.subMode ?? "work");
  const [timer, setTimer] = useState<number | null>(initial?.timer ?? items[0]?.duration ?? null);
  const [timerActive, setTimerActive] = useState(initial?.timerActive ?? false);
  const [paused, setPaused] = useState(false);
  const [logs, setLogs] = useState<ExerciseLog[]>(() => initial?.logs ?? emptyLogs(plan));
  const [stepHistory, setStepHistory] = useState<StepSnapshot[]>(initial?.stepHistory ?? []);

  // Per-set input drafts (weight optional, reps optional).
  const [weightDraft, setWeightDraft] = useState<number | null>(null);
  const [repsDraft, setRepsDraft] = useState<number | null>(null);

  // Exercise preferences (prefer / don't-suggest) — affect future plans.
  const [prefs, setPrefs] = useState<ExercisePrefs>({ preferred: [], blocked: [] });
  useEffect(() => { setPrefs(loadPrefs()); }, []);

  // Master session clock + per-phase buckets.
  const totalRef = useRef(initial?.totalSeconds ?? 0);
  const bucketRef = useRef<PhaseTimes>(initial?.phaseTimes ?? { warmup: 0, circuit: 0, cooldown: 0 });
  const phaseRef = useRef<Phase>(items[initial?.itemIndex ?? 0]?.phase ?? "circuit");
  const [elapsed, setElapsed] = useState(initial?.totalSeconds ?? 0);

  const item = items[itemIndex];
  const ex = getExercise(item.exerciseId) as Exercise;
  const isTimed = item.duration != null;

  useEffect(() => { phaseRef.current = item.phase; }, [itemIndex, item.phase]);

  // Keep the device awake during the workout (iOS 16.4+, Android, desktop).
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const wakeLock = (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock;
    const request = async () => {
      try {
        if (wakeLock) lock = await wakeLock.request("screen");
      } catch { /* user agent may reject; non-fatal */ }
    };
    request();
    const onVis = () => { if (document.visibilityState === "visible") request(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      try { lock?.release(); } catch { /* noop */ }
    };
  }, []);

  // Load drafts when we move between sets/exercises (also on back-navigation).
  useEffect(() => {
    const log = logs[itemIndex];
    const s = log?.sets[currentSet - 1];
    if (s && (s.completed || s.weight != null || s.reps != null)) {
      setWeightDraft(s.weight);
      setRepsDraft(s.reps ?? parseTarget(item.reps));
      return;
    }
    setRepsDraft(parseTarget(item.reps));
    const inItem = lastWeightInItem(itemIndex, currentSet);
    if (inItem != null) { setWeightDraft(inItem); return; }
    if (ex.loaded) {
      let alive = true;
      getStore().lastWeight(ex.id).then((w) => { if (alive) setWeightDraft(w); });
      return () => { alive = false; };
    }
    setWeightDraft(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemIndex, currentSet]);

  // Master clock — ticks continuously unless paused.
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      totalRef.current += 1;
      bucketRef.current[phaseRef.current] += 1;
      setElapsed(totalRef.current);
    }, 1000);
    return () => clearInterval(id);
  }, [paused]);

  // Countdown for timed work / rest.
  const onZeroRef = useRef<() => void>(() => {});
  onZeroRef.current = () => { if (subMode === "rest") finishRest(); else completeSet(); };
  useEffect(() => {
    if (paused || !timerActive || timer === null) return;
    if (timer > 0) {
      const id = setTimeout(() => setTimer((t) => (t ?? 1) - 1), 1000);
      return () => clearTimeout(id);
    }
    onZeroRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer, timerActive, paused]);

  // Persist a resume snapshot whenever anything meaningful changes (incl. clock).
  useEffect(() => {
    onPersist({
      itemIndex, currentSet, subMode, timer, timerActive,
      logs, stepHistory, totalSeconds: totalRef.current, phaseTimes: { ...bucketRef.current },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemIndex, currentSet, subMode, timer, timerActive, logs, stepHistory, elapsed]);

  function lastWeightInItem(idx: number, set: number): number | null {
    const log = logs[idx];
    if (!log) return null;
    for (let i = set - 2; i >= 0; i--) {
      if (log.sets[i]?.weight != null) return log.sets[i].weight;
    }
    return null;
  }

  function pushStep() {
    setStepHistory((h) => [...h, { itemIndex, currentSet, subMode, timer, timerActive }]);
  }

  function recordSet(completed: boolean) {
    setLogs((prev) => {
      const next = prev.map((l) => ({ ...l, sets: l.sets.map((s) => ({ ...s })) }));
      const s = next[itemIndex].sets[currentSet - 1];
      s.completed = completed;
      s.weight = weightDraft;
      s.reps = repsDraft;
      return next;
    });
  }

  function completeSet() {
    recordSet(true);
    pushStep();
    if (currentSet < item.sets) {
      setCurrentSet((s) => s + 1);
      setSubMode("rest");
      setTimer(item.rest > 0 ? item.rest : null);
      setTimerActive(item.rest > 0);
    } else {
      doAdvance();
    }
  }

  function finishRest() {
    pushStep();
    setSubMode("work");
    setTimer(item.duration ?? null);
    setTimerActive(false);
  }

  function resetForItem(idx: number) {
    setCurrentSet(1);
    setSubMode("work");
    setTimer(items[idx].duration ?? null);
    setTimerActive(false);
  }

  function doAdvance() {
    const nextIdx = itemIndex + 1;
    if (nextIdx < items.length) { setItemIndex(nextIdx); resetForItem(nextIdx); }
    else onComplete(logs, totalRef.current, { ...bucketRef.current });
  }

  function skipExercise() {
    setLogs((prev) => {
      const next = prev.map((l) => ({ ...l, sets: l.sets.map((s) => ({ ...s })) }));
      if (!next[itemIndex].sets.some((s) => s.completed)) next[itemIndex].skipped = true;
      return next;
    });
    pushStep();
    doAdvance();
  }

  function jumpTo(idx: number) {
    pushStep();
    setItemIndex(idx);
    resetForItem(idx);
  }

  // Previous = step back through the actual experience (set 2 -> rest -> set 1 -> …).
  function prev() {
    if (stepHistory.length === 0) return;
    const last = stepHistory[stepHistory.length - 1];
    setStepHistory(stepHistory.slice(0, -1));
    setItemIndex(last.itemIndex);
    setCurrentSet(last.currentSet);
    setSubMode(last.subMode);
    setTimer(last.timer);
    setTimerActive(false); // don't auto-resume a countdown on back-step
  }

  function addTime(sec: number) {
    setTimer((t) => (t ?? 0) + sec);
    setTimerActive(true);
  }

  const overallPct = Math.round((itemIndex / items.length) * 100);
  const canPrev = stepHistory.length > 0;

  return (
    <div className="t-wrap t-fadein" style={{ paddingTop: 56 }}>
      <SessionTimer seconds={elapsed} phase={item.phase} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span className="t-eyebrow" style={{ color: "var(--t-amber)" }}>{PHASE_HEADING[item.phase]}</span>
        <span className="t-mono" style={{ fontSize: 11, color: "var(--t-faint)" }}>{itemIndex + 1} / {items.length}</span>
      </div>
      <div style={{ height: 3, background: "#262626", borderRadius: 2, marginBottom: 18 }}>
        <div style={{ height: "100%", width: `${overallPct}%`, background: "linear-gradient(90deg,var(--t-flame),var(--t-amber))", borderRadius: 2, transition: "width 0.4s" }} />
      </div>

      {subMode === "rest" ? (
        <div className="t-card" style={{ textAlign: "center", borderRadius: 20, padding: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>😮‍💨</div>
          <h2 style={{ fontSize: 22, color: "var(--t-amber)", margin: "0 0 4px" }}>Rest</h2>
          <p className="t-mono" style={{ color: "var(--t-muted)", fontSize: 12, margin: "0 0 18px" }}>
            Set {currentSet} of {item.sets} next
          </p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Ring value={timer} active={!paused} amber />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button className="t-btn t-btn-ghost" onClick={() => addTime(15)}>＋15s</button>
            <button className="t-btn t-btn-primary" onClick={finishRest}>Skip rest →</button>
          </div>
        </div>
      ) : (
        <div className="t-card t-fadein" style={{ borderRadius: 20, padding: 24 }} key={`${itemIndex}-${currentSet}`}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              <div className="t-eyebrow" style={{ marginBottom: 4 }}>{ex.muscleLabel}</div>
              <h2 style={{ fontSize: 23, margin: 0 }}>{ex.emoji} {ex.name}</h2>
            </div>
            <button onClick={() => onOpenExercise(ex)} aria-label="How to do this exercise" className="t-mono"
              style={{ background: "#1d1d1d", border: "1px solid #333", color: "var(--t-amber)", borderRadius: 10, padding: "8px 11px", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
              ? How-to
            </button>
          </div>

          {item.sets > 1 && (
            <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
              {Array.from({ length: item.sets }, (_, i) => i + 1).map((s) => (
                <div key={s} style={{ width: 9, height: 9, borderRadius: "50%", background: s < currentSet ? "var(--t-flame)" : s === currentSet ? "var(--t-amber)" : "#3a3a3a" }} />
              ))}
            </div>
          )}

          <div style={{ background: "#0d0d0d", borderRadius: 12, padding: "12px 14px", marginBottom: 14, display: "flex", gap: 22 }}>
            <Stat label="SET" value={`${currentSet}/${item.sets}`} amber />
            <Stat label="TARGET" value={item.reps} />
            {item.rest > 0 && <Stat label="REST" value={`${item.rest}s`} muted />}
          </div>

          {isTimed ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 16 }}>
              <Ring value={timer} active={timerActive && !paused} />
              <div style={{ display: "flex", gap: 10, marginTop: 16, width: "100%" }}>
                {!timerActive ? (
                  <button className="t-btn t-btn-primary" onClick={() => setTimerActive(true)}>▶ Start {item.duration}s</button>
                ) : (
                  <button className="t-btn t-btn-ghost" onClick={() => setPaused((p) => !p)}>{paused ? "▶ Resume" : "⏸ Pause"}</button>
                )}
                <button className="t-btn t-btn-ghost" onClick={() => addTime(30)} style={{ maxWidth: 120 }}>＋30s</button>
              </div>
            </div>
          ) : (
            <div className="t-entry" style={{ marginBottom: 14 }}>
              <div className="t-entry-label">Log your set <span style={{ textTransform: "none", color: "var(--t-faint)" }}>· optional</span></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Stepper label="Weight (lb)" value={weightDraft} step={5} min={0} placeholder="—" onChange={setWeightDraft} />
                <Stepper label="Reps done" value={repsDraft} step={1} min={0} placeholder="—" onChange={setRepsDraft} />
              </div>
            </div>
          )}

          {!isTimed ? (
            <button className="t-btn t-btn-primary" onClick={completeSet}>
              {currentSet < item.sets ? `✓ Set ${currentSet} done → rest` : "✓ Final set done →"}
            </button>
          ) : (
            <button className="t-btn t-btn-quiet" onClick={completeSet}>Mark done →</button>
          )}

          {/* Personalize: bias future plans toward / away from this move. */}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              onClick={() => setPrefs(togglePreferred(ex.id))}
              aria-pressed={prefs.preferred.includes(ex.id)}
              className="t-mono"
              style={{
                flex: 1, padding: "10px 8px", borderRadius: 9, cursor: "pointer", fontSize: 11.5, fontWeight: 700,
                background: prefs.preferred.includes(ex.id) ? "linear-gradient(135deg,rgba(255,106,50,0.2),rgba(255,174,61,0.12))" : "#161616",
                border: `1px solid ${prefs.preferred.includes(ex.id) ? "var(--t-flame)" : "#2a2a2a"}`,
                color: prefs.preferred.includes(ex.id) ? "var(--t-ink)" : "var(--t-muted)",
              }}
            >
              {prefs.preferred.includes(ex.id) ? "★ Preferred" : "☆ Prefer this"}
            </button>
            <button
              onClick={() => {
                if (prefs.blocked.includes(ex.id)) { setPrefs(toggleBlocked(ex.id)); return; }
                if (confirm("Stop suggesting this exercise in future workouts?")) setPrefs(toggleBlocked(ex.id));
              }}
              aria-pressed={prefs.blocked.includes(ex.id)}
              className="t-mono"
              style={{
                flex: 1, padding: "10px 8px", borderRadius: 9, cursor: "pointer", fontSize: 11.5, fontWeight: 700,
                background: prefs.blocked.includes(ex.id) ? "#2a1410" : "#161616",
                border: `1px solid ${prefs.blocked.includes(ex.id) ? "var(--t-flame)" : "#2a2a2a"}`,
                color: prefs.blocked.includes(ex.id) ? "var(--t-amber)" : "var(--t-muted)",
              }}
            >
              {prefs.blocked.includes(ex.id) ? "✓ Won't suggest" : "🚫 Don't suggest"}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button className="t-btn t-btn-quiet" onClick={prev} disabled={!canPrev}>◀ Previous</button>
        <button className="t-btn t-btn-quiet" onClick={skipExercise}>Skip ▶</button>
      </div>

      {itemIndex + 1 < items.length && (
        <div style={{ marginTop: 14, background: "#0d0d0d", border: "1px solid #242424", borderRadius: 12, padding: "12px 14px" }}>
          <div className="t-eyebrow" style={{ marginBottom: 8 }}>Up Next · tap to skip ahead</div>
          {items.slice(itemIndex + 1, itemIndex + 4).map((it, i) => {
            const e = getExercise(it.exerciseId);
            const globalIdx = itemIndex + 1 + i;
            return (
              <button key={globalIdx} onClick={() => {
                if (confirm("Are you sure you want to skip exercises in your workout?")) jumpTo(globalIdx);
              }}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", width: "100%", background: "none", border: "none", borderBottom: i < 2 ? "1px solid #1c1c1c" : "none", color: "var(--t-ink)", cursor: "pointer", textAlign: "left" }}>
                <span style={{ opacity: 0.7 }}>{e?.emoji}</span>
                <span style={{ fontSize: 13, color: "var(--t-muted)" }}>{e?.name}</span>
                <span className="t-mono" style={{ fontSize: 11, color: "var(--t-faint)", marginLeft: "auto" }}>{it.reps}</span>
              </button>
            );
          })}
        </div>
      )}

      <button className="t-btn t-btn-quiet" style={{ marginTop: 20 }} onClick={onExit}>Exit workout</button>
    </div>
  );
}

function Ring({ value, active, amber }: { value: number | null; active: boolean; amber?: boolean }) {
  const color = amber ? "var(--t-amber)" : "var(--t-flame)";
  return (
    <div style={{
      width: 120, height: 120, borderRadius: "50%",
      border: `4px solid ${active ? color : "#2a2a2a"}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0d0d0d", transition: "border-color 0.3s",
      boxShadow: active ? `0 0 20px ${amber ? "rgba(255,174,61,0.25)" : "rgba(255,106,50,0.3)"}` : "none",
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

function Stepper({ label, value, step, min, placeholder, onChange }: {
  label: string; value: number | null; step: number; min: number; placeholder: string;
  onChange: (v: number | null) => void;
}) {
  const dec = () => onChange(Math.max(min, (value ?? 0) - step));
  const inc = () => onChange((value ?? 0) + step);
  return (
    <div>
      <div className="t-entry-label" style={{ color: "var(--t-faint)" }}>{label}</div>
      <div className="t-stepper">
        <button type="button" aria-label={`Decrease ${label}`} onClick={dec}>−</button>
        <input
          type="number" inputMode="decimal" placeholder={placeholder}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
        <button type="button" aria-label={`Increase ${label}`} onClick={inc}>＋</button>
      </div>
    </div>
  );
}
