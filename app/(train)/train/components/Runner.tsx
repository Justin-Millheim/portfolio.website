"use client";

import { useEffect, useRef, useState } from "react";
import type {
  Exercise, ExerciseLog, PhaseTimes, Phase, PlanItem, RunnerSnapshot, StepSnapshot, WorkoutPlan,
} from "@/lib/train/types";
import { getExercise } from "@/lib/train/exercises";
import { getStore, suggestNextWeight, type ExercisePrefs } from "@/lib/train/storage";
import { cheerFx, isMuted, setMuted, unlockAudio } from "@/lib/train/sound";
import { formatTime } from "@/lib/train/format";
import SessionTimer from "./SessionTimer";
import Celebration from "./Celebration";
import { useConfirm } from "./ConfirmProvider";

const READY_SECS = 10; // brief "get ready / up next" transition between exercises

function parseTarget(reps: string): number | null {
  if (/second/i.test(reps)) return null;
  const m = reps.match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

// "each side" timed moves should run long enough to do both sides.
function isEachSide(it: PlanItem): boolean {
  return /each side/i.test(it.reps);
}
function effDuration(it: PlanItem): number | undefined {
  if (it.duration == null) return undefined;
  return isEachSide(it) ? it.duration * 2 : it.duration;
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
  plan, initial, prefs, onComplete, onExit, onOpenExercise, onPersist, onTogglePreferred, onToggleBlocked,
}: {
  plan: WorkoutPlan;
  initial?: RunnerSnapshot | null;
  prefs: ExercisePrefs;
  onComplete: (logs: ExerciseLog[], totalSeconds: number, phaseTimes: PhaseTimes) => void;
  onExit: (mode: "save" | "discard", logs: ExerciseLog[], totalSeconds: number, phaseTimes: PhaseTimes) => void;
  onOpenExercise: (ex: Exercise) => void;
  onPersist: (snap: RunnerSnapshot) => void;
  onTogglePreferred: (id: string) => void;
  onToggleBlocked: (id: string) => void;
}) {
  const items = plan.items;
  const [itemIndex, setItemIndex] = useState(initial?.itemIndex ?? 0);
  const [currentSet, setCurrentSet] = useState(initial?.currentSet ?? 1);
  const [subMode, setSubMode] = useState<"work" | "rest" | "ready">(initial?.subMode ?? "work");
  const [timer, setTimer] = useState<number | null>(initial?.timer ?? (items[0] ? effDuration(items[0]) ?? null : null));
  const [timerActive, setTimerActive] = useState(initial?.timerActive ?? false);
  const [paused, setPaused] = useState(false);
  const [logs, setLogs] = useState<ExerciseLog[]>(() => initial?.logs ?? emptyLogs(plan));
  const [stepHistory, setStepHistory] = useState<StepSnapshot[]>(initial?.stepHistory ?? []);

  // Per-set input drafts (weight optional, reps optional).
  const [weightDraft, setWeightDraft] = useState<number | null>(null);
  const [repsDraft, setRepsDraft] = useState<number | null>(null);
  const [progressHint, setProgressHint] = useState<string | null>(null);

  const [cheer, setCheer] = useState(0);
  const [finaleCheer, setFinaleCheer] = useState(0);
  const { confirm } = useConfirm();
  const [muted, setMutedState] = useState(false);

  // Master session clock + per-phase buckets (timestamp-based so it stays
  // accurate even if the tab is backgrounded/throttled).
  const totalRef = useRef(initial?.totalSeconds ?? 0);
  const bucketRef = useRef<PhaseTimes>(initial?.phaseTimes ?? { warmup: 0, circuit: 0, cooldown: 0 });
  const phaseRef = useRef<Phase>(items[initial?.itemIndex ?? 0]?.phase ?? "circuit");
  const lastTickRef = useRef<number>(Date.now());
  const [elapsed, setElapsed] = useState(initial?.totalSeconds ?? 0);

  // Countdown is driven by an absolute end-timestamp so it survives throttling.
  const timerEndRef = useRef<number | null>(null);
  const firedRef = useRef(false);

  const item = items[itemIndex];
  const ex = getExercise(item.exerciseId) as Exercise;
  const isTimed = item.duration != null;
  const dur = effDuration(item);

  useEffect(() => { phaseRef.current = item.phase; }, [itemIndex, item.phase]);
  useEffect(() => { setMutedState(isMuted()); }, []);

  // Unlock audio on the first tap inside the runner (autoplay policy).
  useEffect(() => {
    const unlock = () => { unlockAudio(); window.removeEventListener("pointerdown", unlock); };
    window.addEventListener("pointerdown", unlock);
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  // Keep the device awake during the workout (iOS 16.4+, Android, desktop).
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const wakeLock = (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock;
    const request = async () => {
      try { if (wakeLock) lock = await wakeLock.request("screen"); } catch { /* non-fatal */ }
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
    setProgressHint(null);
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
      getStore().list().then((sessions) => {
        if (!alive) return;
        const sug = suggestNextWeight(sessions, ex.id, parseTarget(item.reps));
        setWeightDraft(sug.suggested ?? sug.lastWeight);
        setProgressHint(sug.hint);
      });
      return () => { alive = false; };
    }
    setWeightDraft(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemIndex, currentSet]);

  // Master clock — accumulate real elapsed deltas; catches up after a tab returns.
  useEffect(() => {
    if (paused) return;
    lastTickRef.current = Date.now();
    const tick = () => {
      const now = Date.now();
      const delta = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      totalRef.current += delta;
      bucketRef.current[phaseRef.current] += delta;
      setElapsed(Math.round(totalRef.current));
    };
    const id = setInterval(tick, 1000);
    const onVis = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [paused]);

  // Countdown driven by the absolute end-timestamp.
  const onZeroRef = useRef<() => void>(() => {});
  onZeroRef.current = () => {
    cheerFx(); // ding + buzz whenever a timer elapses
    if (subMode === "ready") enterWork();
    else if (subMode === "rest") finishRest();
    else completeSet();
  };
  useEffect(() => {
    if (paused || !timerActive) return;
    // Self-heal: arm the end-timestamp if it isn't set (e.g. on resume).
    if (timerEndRef.current == null && timer != null) {
      timerEndRef.current = Date.now() + timer * 1000;
      firedRef.current = false;
    }
    const tick = () => {
      const end = timerEndRef.current;
      if (end == null) return;
      const remaining = Math.max(0, Math.round((end - Date.now()) / 1000));
      setTimer(remaining);
      if (remaining <= 0 && !firedRef.current) {
        firedRef.current = true;
        onZeroRef.current();
      }
    };
    tick();
    const id = setInterval(tick, 500);
    const onVis = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [timerActive, paused]);

  // Persist a resume snapshot whenever anything meaningful changes.
  useEffect(() => {
    onPersist({
      itemIndex, currentSet, subMode, timer, timerActive,
      logs, stepHistory, totalSeconds: Math.round(totalRef.current), phaseTimes: roundedBuckets(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemIndex, currentSet, subMode, timer, timerActive, logs, stepHistory, elapsed]);

  function roundedBuckets(): PhaseTimes {
    return {
      warmup: Math.round(bucketRef.current.warmup),
      circuit: Math.round(bucketRef.current.circuit),
      cooldown: Math.round(bucketRef.current.cooldown),
    };
  }

  function lastWeightInItem(idx: number, set: number): number | null {
    const log = logs[idx];
    if (!log) return null;
    for (let i = set - 2; i >= 0; i--) {
      if (log.sets[i]?.weight != null) return log.sets[i].weight;
    }
    return null;
  }

  function armTimer(seconds: number) {
    timerEndRef.current = Date.now() + seconds * 1000;
    firedRef.current = false;
    setTimer(seconds);
    setTimerActive(true);
  }
  function disarmTimer(seconds: number | null) {
    timerEndRef.current = null;
    firedRef.current = false;
    setTimer(seconds);
    setTimerActive(false);
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
      if (item.rest > 0) armTimer(item.rest); else disarmTimer(null);
    } else {
      doAdvance(true);
    }
  }

  function finishRest() {
    pushStep();
    setSubMode("work");
    disarmTimer(dur ?? null); // timed next set waits for Start
  }

  // Brief "get ready / up next" transition before each new exercise.
  function enterReady(idx: number) {
    setItemIndex(idx);
    setCurrentSet(1);
    setSubMode("ready");
    armTimer(READY_SECS);
  }

  function enterWork() {
    setSubMode("work");
    const d = effDuration(items[itemIndex]);
    if (d != null) armTimer(d); // auto-start the timed move after the ready beat
    else disarmTimer(null);
  }

  function resetForItem(idx: number) {
    setCurrentSet(1);
    setSubMode("work");
    disarmTimer(effDuration(items[idx]) ?? null);
  }

  function doAdvance(completed = false) {
    const nextIdx = itemIndex + 1;
    if (nextIdx >= items.length) {
      onComplete(logs, Math.round(totalRef.current), roundedBuckets());
      return;
    }
    // Celebration timing: a cheer between main moves and at the end of warm-up;
    // the big finale fires once, when the cool-down phase is first reached.
    const pA = items[itemIndex].phase;
    const pB = items[nextIdx].phase;
    if (pB === "cooldown" && pA !== "cooldown") {
      setFinaleCheer((c) => c + 1);
    } else if (completed && ((pA === "warmup" && pB === "circuit") || (pA === "circuit" && pB === "circuit"))) {
      setCheer((c) => c + 1);
    }
    enterReady(nextIdx);
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

  function prev() {
    if (stepHistory.length === 0) return;
    const last = stepHistory[stepHistory.length - 1];
    setStepHistory(stepHistory.slice(0, -1));
    setItemIndex(last.itemIndex);
    setCurrentSet(last.currentSet);
    setSubMode(last.subMode);
    disarmTimer(last.timer);
  }

  function togglePause() {
    if (!paused) {
      if (timerEndRef.current != null) {
        const rem = Math.max(0, Math.round((timerEndRef.current - Date.now()) / 1000));
        setTimer(rem);
      }
      timerEndRef.current = null;
      setPaused(true);
    } else {
      if (timerActive && timer != null) {
        timerEndRef.current = Date.now() + timer * 1000;
        firedRef.current = false;
      }
      setPaused(false);
    }
  }

  function addTime(sec: number) {
    if (timerEndRef.current == null) { armTimer((timer ?? 0) + sec); return; }
    timerEndRef.current += sec * 1000;
    firedRef.current = false;
    setTimer((t) => (t ?? 0) + sec);
    if (!timerActive) setTimerActive(true);
  }

  function toggleMute() {
    const n = !muted;
    setMuted(n);
    setMutedState(n);
    if (!n) unlockAudio();
  }

  async function handleExit() {
    const r = await confirm({
      title: "Exit workout?",
      message: "Save your progress so far, or discard it. Either way you'll see your summary.",
      confirmLabel: "Save & see summary",
      altLabel: "Discard",
      cancelLabel: "Keep going",
    });
    if (r === "cancel") return;
    const finalLogs = logs.map((l) => (l.sets.some((s) => s.completed) || l.skipped ? l : { ...l, skipped: true }));
    onExit(r === "confirm" ? "save" : "discard", finalLogs, Math.round(totalRef.current), roundedBuckets());
  }

  const overallPct = Math.round((itemIndex / items.length) * 100);
  const canPrev = stepHistory.length > 0;

  return (
    <div className="t-wrap t-fadein" style={{ paddingTop: 56 }}>
      <SessionTimer seconds={elapsed} phase={item.phase} />
      <Celebration id={cheer} variant="exercise" />
      <Celebration id={finaleCheer} variant="finale" />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span className="t-eyebrow" style={{ color: "var(--t-amber)" }}>{PHASE_HEADING[item.phase]}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={toggleMute} aria-label={muted ? "Unmute sounds" : "Mute sounds"} title={muted ? "Unmute" : "Mute"}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, lineHeight: 1, color: "var(--t-muted)" }}>
            {muted ? "🔇" : "🔔"}
          </button>
          <span className="t-mono" style={{ fontSize: 11, color: "var(--t-faint)" }}>{itemIndex + 1} / {items.length}</span>
        </div>
      </div>
      <div style={{ height: 3, background: "#262626", borderRadius: 2, marginBottom: 18 }}>
        <div style={{ height: "100%", width: `${overallPct}%`, background: "linear-gradient(90deg,var(--t-flame),var(--t-amber))", borderRadius: 2, transition: "width 0.4s" }} />
      </div>

      {subMode === "ready" ? (
        <div className="t-card t-fadein" style={{ textAlign: "center", borderRadius: 20, padding: 28 }}>
          <div className="t-eyebrow" style={{ marginBottom: 6 }}>Up next</div>
          <div style={{ fontSize: 44 }}>{ex.emoji}</div>
          <h2 style={{ fontSize: 23, margin: "6px 0 2px" }}>{ex.name}</h2>
          <p className="t-mono" style={{ color: "var(--t-muted)", fontSize: 12, margin: "0 0 18px" }}>
            {item.sets > 1 ? `${item.sets} sets · ` : ""}{item.reps}
          </p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Ring value={timer} active={!paused} amber label="GET READY" />
          </div>
          <button className="t-btn t-btn-primary" style={{ marginTop: 20 }} onClick={enterWork}>Start now →</button>
          <button className="t-btn t-btn-quiet" style={{ marginTop: 10 }} onClick={skipExercise}>Skip this exercise</button>
        </div>
      ) : subMode === "rest" ? (
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
              {isEachSide(item) && (
                <div className="t-mono" style={{ fontSize: 11, color: "var(--t-amber)", marginTop: 10, textAlign: "center" }}>
                  ↔ Switch sides at the halfway mark
                </div>
              )}
              <div style={{ display: "flex", gap: 10, marginTop: 16, width: "100%" }}>
                {!timerActive ? (
                  <button className="t-btn t-btn-primary" onClick={() => { unlockAudio(); armTimer(dur ?? 0); }}>▶ Start {dur}s</button>
                ) : (
                  <button className="t-btn t-btn-ghost" onClick={togglePause}>{paused ? "▶ Resume" : "⏸ Pause"}</button>
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
              {progressHint && (
                <div className="t-mono" style={{ marginTop: 10, fontSize: 11, color: "var(--t-amber)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span aria-hidden>📈</span> {progressHint}
                </div>
              )}
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
              onClick={() => onTogglePreferred(ex.id)}
              aria-pressed={prefs.preferred.includes(ex.id)}
              className="t-mono"
              style={{
                flex: 1, padding: "10px 8px", borderRadius: 9, cursor: "pointer", fontSize: 11.5, fontWeight: 700,
                background: prefs.preferred.includes(ex.id) ? "linear-gradient(135deg,rgba(255,106,50,0.2),rgba(255,174,61,0.12))" : "#161616",
                border: `1px solid ${prefs.preferred.includes(ex.id) ? "var(--t-flame)" : "#2a2a2a"}`,
                color: prefs.preferred.includes(ex.id) ? "var(--t-ink)" : "var(--t-muted)",
              }}
            >
              {prefs.preferred.includes(ex.id) ? "👍 Liked" : "👍 this exercise"}
            </button>
            <button
              onClick={() => {
                if (prefs.blocked.includes(ex.id)) { onToggleBlocked(ex.id); return; }
                confirm({ title: "Don't suggest this exercise?", message: "It won't appear in future generated workouts. You can undo this anytime.", confirmLabel: "Don't suggest", cancelLabel: "Cancel", danger: true }).then((r) => { if (r === "confirm") onToggleBlocked(ex.id); });
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
              {prefs.blocked.includes(ex.id) ? "👎 Hidden" : "👎 this exercise"}
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
                confirm({ title: "Skip ahead?", message: "This skips the exercises between here and there.", confirmLabel: "Skip ahead", cancelLabel: "Cancel" }).then((r) => { if (r === "confirm") jumpTo(globalIdx); });
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

      <button className="t-btn t-btn-quiet" style={{ marginTop: 20 }} onClick={handleExit}>Exit workout</button>
    </div>
  );
}

function Ring({ value, active, amber, label }: { value: number | null; active: boolean; amber?: boolean; label?: string }) {
  const color = amber ? "var(--t-amber)" : "var(--t-flame)";
  return (
    <div style={{
      width: 120, height: 120, borderRadius: "50%",
      border: `4px solid ${active ? color : "#2a2a2a"}`,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: "#0d0d0d", transition: "border-color 0.3s",
      boxShadow: active ? `0 0 20px ${amber ? "rgba(255,174,61,0.25)" : "rgba(255,106,50,0.3)"}` : "none",
    }}>
      {label && <span className="t-mono" style={{ fontSize: 9, letterSpacing: 1, color: "var(--t-faint)" }}>{label}</span>}
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
  const valueRef = useRef(value);
  valueRef.current = value;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dec = () => onChange(Math.max(min, (valueRef.current ?? 0) - step));
  const inc = () => onChange((valueRef.current ?? 0) + step);

  // Press-and-hold to repeat, gradually accelerating.
  function startHold(fn: () => void) {
    fn();
    let delay = 350;
    const run = () => {
      fn();
      delay = Math.max(55, delay - 35);
      timeoutRef.current = setTimeout(run, delay);
    };
    timeoutRef.current = setTimeout(run, 420);
  }
  function stopHold() {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  }
  useEffect(() => () => stopHold(), []);

  return (
    <div>
      <div className="t-entry-label" style={{ color: "var(--t-faint)" }}>{label}</div>
      <div className="t-stepper">
        <button type="button" aria-label={`Decrease ${label}`}
          onPointerDown={(e) => { e.preventDefault(); startHold(dec); }}
          onPointerUp={stopHold} onPointerLeave={stopHold} onPointerCancel={stopHold}>−</button>
        <input
          type="number" inputMode="decimal" placeholder={placeholder}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
        <button type="button" aria-label={`Increase ${label}`}
          onPointerDown={(e) => { e.preventDefault(); startHold(inc); }}
          onPointerUp={stopHold} onPointerLeave={stopHold} onPointerCancel={stopHold}>＋</button>
      </div>
    </div>
  );
}
