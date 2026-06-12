"use client";

import { useEffect, useRef, useState } from "react";
import type {
  Exercise, ExerciseLog, Phase, PhaseTimes, RunStep, RunnableSession, RunnerSnapshot, SetLog, StepSnapshot,
} from "@/lib/program/types";
import { getExercise } from "@/lib/program/exercises";
import { getStore } from "@/lib/program/storage";
import { suggestNextWeight } from "@/lib/program/program-engine";
import { cheerFx, isMuted, playTick, setMuted, unlockAudio } from "@/lib/program/sound";
import { formatTime } from "@/lib/program/format";
import SessionTimer from "./SessionTimer";
import Celebration from "./Celebration";
import { useConfirm } from "./ConfirmProvider";

const READY_SECS = 10; // brief "get ready / up next" beat between exercises

const PHASE_HEADING: Record<Phase, string> = {
  warmup: "🔥 Warm Up", main: "⚡ Main", cooldown: "🧘 Cool Down",
};

// How many "units" a step has — sets for normal moves, rounds for the sled.
function unitsFor(step: RunStep): number {
  return step.setType === "rounds" ? (step.rounds ?? 1) : step.sets;
}

function emptyLogs(session: RunnableSession): ExerciseLog[] {
  return session.steps.map((step) => ({
    exerciseId: step.exerciseId,
    phase: step.phase,
    substitutedFor: step.subId ? step.subLabel : undefined,
    skipped: false,
    sets: Array.from({ length: unitsFor(step) }, (_, i): SetLog => ({
      setIndex: i + 1, weight: null, reps: null, durationSec: null, done: false,
    })),
  }));
}

export default function Runner({
  session, initial, onComplete, onExit, onOpenExercise, onPersist,
}: {
  session: RunnableSession;
  initial?: RunnerSnapshot | null;
  onComplete: (logs: ExerciseLog[], totalSeconds: number, phaseTimes: PhaseTimes) => void;
  onExit: (mode: "save" | "discard", logs: ExerciseLog[], totalSeconds: number, phaseTimes: PhaseTimes) => void;
  onOpenExercise: (ex: Exercise) => void;
  onPersist: (snap: RunnerSnapshot) => void;
}) {
  const steps = session.steps;
  const [stepIndex, setStepIndex] = useState(initial?.stepIndex ?? 0);
  const [currentSet, setCurrentSet] = useState(initial?.currentSet ?? 1);
  const [subMode, setSubMode] = useState<"work" | "rest" | "ready">(initial?.subMode ?? "work");
  const [timer, setTimer] = useState<number | null>(initial?.timer ?? (steps[0]?.durationSec ?? null));
  const [timerActive, setTimerActive] = useState(initial?.timerActive ?? false);
  const [paused, setPaused] = useState(false);
  const [logs, setLogs] = useState<ExerciseLog[]>(() => initial?.logs ?? emptyLogs(session));
  const [stepHistory, setStepHistory] = useState<StepSnapshot[]>(initial?.stepHistory ?? []);

  // Per-set input drafts.
  const [weightDraft, setWeightDraft] = useState<number | null>(null);
  const [repsDraft, setRepsDraft] = useState<number | null>(null);
  const [lDraft, setLDraft] = useState<number | null>(null);
  const [rDraft, setRDraft] = useState<number | null>(null);
  const [progressHint, setProgressHint] = useState<string | null>(null);

  const [cheer, setCheer] = useState(0);
  const [finaleCheer, setFinaleCheer] = useState(0);
  const { confirm } = useConfirm();
  const [muted, setMutedState] = useState(false);

  // Master clock + per-phase buckets (timestamp-based so it survives throttling).
  const totalRef = useRef(initial?.totalSeconds ?? 0);
  const bucketRef = useRef<PhaseTimes>(initial?.phaseTimes ?? { warmup: 0, main: 0, cooldown: 0 });
  const phaseRef = useRef<Phase>(steps[initial?.stepIndex ?? 0]?.phase ?? "main");
  const lastTickRef = useRef<number>(Date.now());
  const [elapsed, setElapsed] = useState(initial?.totalSeconds ?? 0);

  const timerEndRef = useRef<number | null>(null);
  const firedRef = useRef(false);
  const lastBeepRef = useRef<number | null>(null);

  const step = steps[stepIndex];
  const ex = getExercise(step.exerciseId) as Exercise;
  const units = unitsFor(step);
  const isTimed = step.setType === "timed";
  const isRounds = step.setType === "rounds";
  const isPerSide = step.setType === "reps-perside";
  const isFree = step.setType === "free";
  const dur = step.durationSec;
  const displayName = step.subLabel ?? ex.name;

  useEffect(() => { phaseRef.current = step.phase; }, [stepIndex, step.phase]);
  useEffect(() => { setMutedState(isMuted()); }, []);

  // Unlock audio on the first tap inside the runner (autoplay policy).
  useEffect(() => {
    const unlock = () => { unlockAudio(); window.removeEventListener("pointerdown", unlock); };
    window.addEventListener("pointerdown", unlock);
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  // Keep the device awake during the workout.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const wakeLock = (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock;
    const request = async () => { try { if (wakeLock) lock = await wakeLock.request("screen"); } catch { /* non-fatal */ } };
    request();
    const onVis = () => { if (document.visibilityState === "visible") request(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); try { lock?.release(); } catch { /* noop */ } };
  }, []);

  // Load drafts when we move between sets/exercises (also on back-navigation).
  useEffect(() => {
    setProgressHint(null);
    const log = logs[stepIndex];
    const s = log?.sets[currentSet - 1];
    const target = step.reps ?? null;
    if (s && (s.done || s.weight != null || s.reps != null)) {
      setWeightDraft(s.weight);
      setRepsDraft(s.reps ?? target);
      setLDraft(s.perSide?.l ?? s.reps ?? target);
      setRDraft(s.perSide?.r ?? s.reps ?? target);
      return;
    }
    setRepsDraft(target);
    setLDraft(target);
    setRDraft(target);
    const inItem = lastWeightInItem(stepIndex, currentSet);
    if (inItem != null) { setWeightDraft(inItem); return; }
    if (step.loaded) {
      let alive = true;
      getStore().listSessions().then((sessions) => {
        if (!alive) return;
        const sug = suggestNextWeight(sessions, step.exerciseId, target);
        setWeightDraft(sug.suggested ?? sug.lastWeight);
        setProgressHint(sug.hint);
      });
      return () => { alive = false; };
    }
    setWeightDraft(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, currentSet]);

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

  // Countdown driven by an absolute end-timestamp.
  const onZeroRef = useRef<() => void>(() => {});
  onZeroRef.current = () => {
    cheerFx();
    if (subMode === "ready") enterWork();
    else if (subMode === "rest") finishRest();
    else completeUnit();
  };
  useEffect(() => {
    if (paused || !timerActive) return;
    if (timerEndRef.current == null && timer != null) {
      timerEndRef.current = Date.now() + timer * 1000;
      firedRef.current = false;
    }
    const tick = () => {
      const end = timerEndRef.current;
      if (end == null) return;
      const remaining = Math.max(0, Math.round((end - Date.now()) / 1000));
      setTimer(remaining);
      if (remaining > 0 && remaining <= 3 && remaining !== lastBeepRef.current) {
        lastBeepRef.current = remaining;
        playTick();
      }
      if (remaining <= 0 && !firedRef.current) { firedRef.current = true; onZeroRef.current(); }
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
      stepIndex, currentSet, currentRound: currentSet, subMode, timer, timerActive,
      logs, stepHistory, totalSeconds: Math.round(totalRef.current), phaseTimes: roundedBuckets(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, currentSet, subMode, timer, timerActive, logs, stepHistory, elapsed]);

  function roundedBuckets(): PhaseTimes {
    return {
      warmup: Math.round(bucketRef.current.warmup),
      main: Math.round(bucketRef.current.main),
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
    lastBeepRef.current = null;
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
    setStepHistory((h) => [...h, { stepIndex, currentSet, currentRound: currentSet, subMode, timer, timerActive }]);
  }

  function recordUnit(done: boolean) {
    setLogs((prev) => {
      const next = prev.map((l) => ({ ...l, sets: l.sets.map((s) => ({ ...s })) }));
      const s = next[stepIndex].sets[currentSet - 1];
      s.done = done;
      if (isTimed) {
        s.durationSec = dur ?? null;
        s.weight = step.loaded ? weightDraft : null;
      } else if (isRounds) {
        s.weight = step.loaded ? weightDraft : null;
        s.reps = null;
      } else if (isPerSide) {
        s.weight = step.loaded ? weightDraft : null;
        s.perSide = { l: lDraft, r: rDraft };
        const both = [lDraft, rDraft].filter((x): x is number => x != null);
        s.reps = both.length ? Math.min(...both) : null;
      } else {
        s.weight = step.loaded ? weightDraft : null;
        s.reps = repsDraft;
      }
      return next;
    });
  }

  // Finish the current set/round.
  function completeUnit() {
    recordUnit(true);
    pushStep();
    if (currentSet < units) {
      setCurrentSet((s) => s + 1);
      setSubMode("rest");
      if (step.restSec > 0) armTimer(step.restSec); else disarmTimer(null);
    } else {
      doAdvance(true);
    }
  }

  function finishRest() {
    pushStep();
    setSubMode("work");
    disarmTimer(dur ?? null); // a timed next set waits for Start
  }

  function enterReady(idx: number) {
    setStepIndex(idx);
    setCurrentSet(1);
    setSubMode("ready");
    armTimer(READY_SECS);
  }

  function enterWork() {
    setSubMode("work");
    const d = steps[stepIndex].durationSec;
    if (d != null) armTimer(d); else disarmTimer(null);
  }

  function resetForItem(idx: number) {
    setCurrentSet(1);
    setSubMode("work");
    disarmTimer(steps[idx].durationSec ?? null);
  }

  function doAdvance(completed = false) {
    const nextIdx = stepIndex + 1;
    if (nextIdx >= steps.length) {
      onComplete(logs, Math.round(totalRef.current), roundedBuckets());
      return;
    }
    const pA = steps[stepIndex].phase;
    const pB = steps[nextIdx].phase;
    if (pB === "cooldown" && pA !== "cooldown") {
      setFinaleCheer((c) => c + 1);
    } else if (completed && ((pA === "warmup" && pB === "main") || (pA === "main" && pB === "main"))) {
      setCheer((c) => c + 1);
    }
    enterReady(nextIdx);
  }

  function skipExercise() {
    setLogs((prev) => {
      const next = prev.map((l) => ({ ...l, sets: l.sets.map((s) => ({ ...s })) }));
      if (!next[stepIndex].sets.some((s) => s.done)) next[stepIndex].skipped = true;
      return next;
    });
    pushStep();
    doAdvance();
  }

  function jumpTo(idx: number) {
    pushStep();
    setStepIndex(idx);
    resetForItem(idx);
  }

  function prev() {
    if (stepHistory.length === 0) return;
    const last = stepHistory[stepHistory.length - 1];
    setStepHistory(stepHistory.slice(0, -1));
    setStepIndex(last.stepIndex);
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
      title: "Exit session?",
      message: "Save your progress so far, or discard it. Either way you'll see your summary.",
      confirmLabel: "Save & see summary",
      altLabel: "Discard",
      cancelLabel: "Keep going",
    });
    if (r === "cancel") return;
    const finalLogs = logs.map((l) => (l.sets.some((s) => s.done) || l.skipped ? l : { ...l, skipped: true }));
    onExit(r === "confirm" ? "save" : "discard", finalLogs, Math.round(totalRef.current), roundedBuckets());
  }

  const overallPct = Math.round((stepIndex / steps.length) * 100);
  const canPrev = stepHistory.length > 0;

  return (
    <div className="t-wrap t-fadein" style={{ paddingTop: 56 }}>
      <SessionTimer seconds={elapsed} phase={step.phase} />
      <Celebration id={cheer} variant="exercise" />
      <Celebration id={finaleCheer} variant="finale" />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span className="t-eyebrow" style={{ color: "var(--t-amber)" }}>{PHASE_HEADING[step.phase]}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={toggleMute} aria-label={muted ? "Unmute sounds" : "Mute sounds"} title={muted ? "Unmute" : "Mute"}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, lineHeight: 1, color: "var(--t-muted)" }}>
            {muted ? "🔇" : "🔔"}
          </button>
          <span className="t-mono" style={{ fontSize: 11, color: "var(--t-faint)" }}>{stepIndex + 1} / {steps.length}</span>
        </div>
      </div>
      <div style={{ height: 3, background: "#262626", borderRadius: 2, marginBottom: 18 }}>
        <div style={{ height: "100%", width: `${overallPct}%`, background: "linear-gradient(90deg,var(--t-flame),var(--t-amber))", borderRadius: 2, transition: "width 0.4s" }} />
      </div>

      {subMode === "ready" ? (
        <div className="t-card t-fadein" style={{ textAlign: "center", borderRadius: 20, padding: 28 }}>
          <div className="t-eyebrow" style={{ marginBottom: 6 }}>Up next</div>
          <div style={{ fontSize: 44 }}>{ex.emoji}</div>
          <h2 style={{ fontSize: 23, margin: "6px 0 2px" }}>{displayName}</h2>
          <p className="t-mono" style={{ color: "var(--t-muted)", fontSize: 12, margin: "0 0 18px" }}>{step.display}</p>
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
            {isRounds ? `Round ${currentSet} of ${units} next` : `Set ${currentSet} of ${units} next`}
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
        <div className="t-card t-fadein" style={{ borderRadius: 20, padding: 24 }} key={`${stepIndex}-${currentSet}`}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              <div className="t-eyebrow" style={{ marginBottom: 4 }}>{step.cue}</div>
              <h2 style={{ fontSize: 22, margin: 0 }}>{ex.emoji} {displayName}</h2>
            </div>
            <button onClick={() => onOpenExercise(ex)} aria-label="How to do this exercise" className="t-mono"
              style={{ background: "#1d1d1d", border: "1px solid #333", color: "var(--t-amber)", borderRadius: 10, padding: "8px 11px", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
              ? How-to
            </button>
          </div>

          {units > 1 && (
            <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
              {Array.from({ length: units }, (_, i) => i + 1).map((s) => (
                <div key={s} style={{ width: 9, height: 9, borderRadius: "50%", background: s < currentSet ? "var(--t-flame)" : s === currentSet ? "var(--t-amber)" : "#3a3a3a" }} />
              ))}
            </div>
          )}

          <div style={{ background: "#0d0d0d", borderRadius: 12, padding: "12px 14px", marginBottom: 14, display: "flex", gap: 22 }}>
            <Stat label={isRounds ? "ROUND" : "SET"} value={`${currentSet}/${units}`} amber />
            <Stat label="TARGET" value={step.display} />
            {step.restSec > 0 && <Stat label="REST" value={`${step.restSec}s`} muted />}
          </div>

          {isTimed ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 16 }}>
              <Ring value={timer} active={timerActive && !paused} />
              {step.loaded && (
                <div style={{ marginTop: 14, width: "100%" }}>
                  <Stepper label="Weight (lb)" value={weightDraft} step={5} min={0} placeholder="—" onChange={setWeightDraft} />
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
          ) : isRounds ? (
            <div className="t-entry" style={{ marginBottom: 14 }}>
              <div className="t-entry-label">Round {currentSet} of {units}</div>
              <div className="p-rounds">
                {Array.from({ length: units }, (_, i) => i + 1).map((n) => (
                  <div key={n} className={`p-round-dot${n < currentSet ? " done" : ""}`}>{n < currentSet ? "✓" : n}</div>
                ))}
              </div>
              {step.loaded && (
                <Stepper label="Sled load (lb)" value={weightDraft} step={5} min={0} placeholder="—" onChange={setWeightDraft} />
              )}
            </div>
          ) : isFree ? (
            <p style={{ color: "var(--t-muted)", fontSize: 14, lineHeight: 1.6, margin: "0 0 14px" }}>
              Take your time here — no timer. Tap done when you&apos;re finished.
            </p>
          ) : isPerSide ? (
            <div className="t-entry" style={{ marginBottom: 14 }}>
              <div className="t-entry-label">Log each side <span style={{ textTransform: "none", color: "var(--t-faint)" }}>· optional</span></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: step.loaded ? 10 : 0 }}>
                <Stepper label="Left reps" value={lDraft} step={1} min={0} placeholder="—" onChange={setLDraft} />
                <Stepper label="Right reps" value={rDraft} step={1} min={0} placeholder="—" onChange={setRDraft} />
              </div>
              {step.loaded && (
                <Stepper label="Weight (lb)" value={weightDraft} step={5} min={0} placeholder="—" onChange={setWeightDraft} />
              )}
              {progressHint && (
                <div className="t-mono" style={{ marginTop: 10, fontSize: 11, color: "var(--t-amber)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span aria-hidden>📈</span> {progressHint}
                </div>
              )}
            </div>
          ) : (
            <div className="t-entry" style={{ marginBottom: 14 }}>
              <div className="t-entry-label">Log your set <span style={{ textTransform: "none", color: "var(--t-faint)" }}>· optional</span></div>
              <div style={{ display: "grid", gridTemplateColumns: step.loaded ? "1fr 1fr" : "1fr", gap: 10 }}>
                {step.loaded && <Stepper label="Weight (lb)" value={weightDraft} step={5} min={0} placeholder="—" onChange={setWeightDraft} />}
                <Stepper label="Reps done" value={repsDraft} step={1} min={0} placeholder="—" onChange={setRepsDraft} />
              </div>
              {progressHint && (
                <div className="t-mono" style={{ marginTop: 10, fontSize: 11, color: "var(--t-amber)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span aria-hidden>📈</span> {progressHint}
                </div>
              )}
            </div>
          )}

          {isTimed ? (
            <button className="t-btn t-btn-quiet" onClick={completeUnit}>Mark done →</button>
          ) : isRounds ? (
            <button className="t-btn t-btn-primary" onClick={completeUnit}>
              {currentSet < units ? `✓ Round ${currentSet} done → rest` : "✓ Final round done →"}
            </button>
          ) : isFree ? (
            <button className="t-btn t-btn-primary" onClick={completeUnit}>✓ Done →</button>
          ) : (
            <button className="t-btn t-btn-primary" onClick={completeUnit}>
              {currentSet < units ? `✓ Set ${currentSet} done → rest` : "✓ Final set done →"}
            </button>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button className="t-btn t-btn-quiet" onClick={prev} disabled={!canPrev}>◀ Previous</button>
        <button className="t-btn t-btn-quiet" onClick={skipExercise}>Skip ▶</button>
      </div>

      {stepIndex + 1 < steps.length && (
        <div style={{ marginTop: 14, background: "#0d0d0d", border: "1px solid #242424", borderRadius: 12, padding: "12px 14px" }}>
          <div className="t-eyebrow" style={{ marginBottom: 8 }}>Up Next · tap to skip ahead</div>
          {steps.slice(stepIndex + 1, stepIndex + 4).map((it, i) => {
            const e = getExercise(it.exerciseId);
            const globalIdx = stepIndex + 1 + i;
            return (
              <button key={globalIdx} onClick={() => {
                confirm({ title: "Skip ahead?", message: "This skips the exercises between here and there.", confirmLabel: "Skip ahead", cancelLabel: "Cancel" }).then((r) => { if (r === "confirm") jumpTo(globalIdx); });
              }}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", width: "100%", background: "none", border: "none", borderBottom: i < 2 ? "1px solid #1c1c1c" : "none", color: "var(--t-ink)", cursor: "pointer", textAlign: "left" }}>
                <span style={{ opacity: 0.7 }}>{e?.emoji}</span>
                <span style={{ fontSize: 13, color: "var(--t-muted)" }}>{it.subLabel ?? e?.name}</span>
                <span className="t-mono" style={{ fontSize: 11, color: "var(--t-faint)", marginLeft: "auto" }}>{it.display}</span>
              </button>
            );
          })}
        </div>
      )}

      <button className="t-btn t-btn-quiet" style={{ marginTop: 20 }} onClick={handleExit}>Exit session</button>
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
      <div style={{ fontSize: 18, fontWeight: 700, color: amber ? "var(--t-amber)" : muted ? "var(--t-muted)" : "var(--t-ink)" }}>{value}</div>
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

  function startHold(fn: () => void) {
    fn();
    let delay = 350;
    const run = () => { fn(); delay = Math.max(55, delay - 35); timeoutRef.current = setTimeout(run, delay); };
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
