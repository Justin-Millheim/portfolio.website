import type {
  LiftHistory, PlanItem, Phase, ProgramPrefs, ProgramProgress, Prescription,
  RunStep, RunnableSession, SessionLog, WeightPoint,
} from "./types";
import { PROGRAM, TOTAL_SESSIONS, getDay } from "./program";
import { getExercise } from "./exercises";

// The deterministic program engine — pure functions over the static PROGRAM
// plus the user's ProgramProgress. No RNG. Replaces /train's generator.

// ---- guided rotation -------------------------------------------------------

export function freshProgress(): ProgramProgress {
  return { blockNumber: 1, currentWeek: 1, completed: [], blockStartedAt: new Date().toISOString() };
}

export function isDayComplete(progress: ProgramProgress, week: number, day: number): boolean {
  return progress.completed.some((c) => c.week === week && c.day === day);
}

export function isWeekComplete(progress: ProgramProgress, week: number): boolean {
  return PROGRAM.days.every((d) => isDayComplete(progress, week, d.id));
}

export function isBlockComplete(progress: ProgramProgress): boolean {
  return [1, 2, 3, 4].every((w) => isWeekComplete(progress, w));
}

export function completedCount(progress: ProgramProgress): number {
  // Only count cells that belong to this block's 4×4 grid.
  return progress.completed.filter((c) => c.week >= 1 && c.week <= 4 && c.day >= 1 && c.day <= 4).length;
}

export const TOTAL = TOTAL_SESSIONS; // 16

// "What's next": the lowest-numbered incomplete Day in currentWeek; when the
// whole week is done, advance to Day 1 of the next week. Returns null only when
// the block is fully complete.
export function nextSession(progress: ProgramProgress): { week: 1 | 2 | 3 | 4; day: 1 | 2 | 3 | 4 } | null {
  if (isBlockComplete(progress)) return null;
  // Walk forward from currentWeek to find the first week with an open day.
  for (let w = progress.currentWeek; w <= 4; w++) {
    const open = PROGRAM.days.find((d) => !isDayComplete(progress, w, d.id));
    if (open) return { week: w as 1 | 2 | 3 | 4, day: open.id };
  }
  return null;
}

// Record a finished Day and advance the rotation pointer if its week is done.
export function markComplete(progress: ProgramProgress, week: number, day: number): ProgramProgress {
  const completed = isDayComplete(progress, week, day)
    ? progress.completed
    : [...progress.completed, { week, day }];
  const next = { ...progress, completed };
  // Advance currentWeek to the earliest week that still has an open day.
  let cw = next.currentWeek;
  while (cw < 4 && isWeekComplete(next, cw)) cw += 1;
  next.currentWeek = cw as 1 | 2 | 3 | 4;
  return next;
}

// Start a fresh block: new number, week 1, cleared completion. History (logged
// sessions) is preserved separately so the progression chart spans blocks.
export function restartBlock(progress: ProgramProgress): ProgramProgress {
  return {
    blockNumber: progress.blockNumber + 1,
    currentWeek: 1,
    completed: [],
    blockStartedAt: new Date().toISOString(),
  };
}

// ---- substitutions (equipment swaps only) ----------------------------------

export function applySubstitution(exerciseId: string, subId: string, prefs: ProgramPrefs): ProgramPrefs {
  return { ...prefs, subs: { ...prefs.subs, [exerciseId]: subId } };
}

export function clearSubstitution(exerciseId: string, prefs: ProgramPrefs): ProgramPrefs {
  const subs = { ...prefs.subs };
  delete subs[exerciseId];
  return { ...prefs, subs };
}

// ---- session assembly ------------------------------------------------------

function rxForWeek(item: PlanItem, week: number): Prescription {
  return item.prescriptions.find((p) => p.week === week) ?? item.prescriptions[0];
}

function stepFromItem(item: PlanItem, phase: Phase, week: number, prefs: ProgramPrefs): RunStep {
  const ex = getExercise(item.exerciseId);
  if (!ex) throw new Error(`program-engine: unknown exercise "${item.exerciseId}"`);
  const rx = rxForWeek(item, week);
  const subId = prefs.subs[item.exerciseId];
  const sub = subId ? ex.subs?.find((s) => s.id === subId) : undefined;
  return {
    exerciseId: item.exerciseId,
    phase,
    setType: ex.setType,
    loaded: ex.loaded,
    sets: rx.sets,
    restSec: item.restSec,
    cue: item.cue,
    reps: rx.reps,
    perSide: rx.perSide,
    durationSec: rx.durationSec,
    rounds: rx.rounds,
    display: rx.displayRaw,
    subId: sub?.id,
    subLabel: sub?.label,
    subNote: sub?.note,
  };
}

// Assemble the runnable session for a Day × Week. Day 4 requires an optionId;
// only the bodyweight circuit runs through the Runner (free/timed options use
// the one-screen Day-4 logger and never call this).
export function buildSession(
  week: 1 | 2 | 3 | 4,
  day: 1 | 2 | 3 | 4,
  prefs: ProgramPrefs,
  progress: ProgramProgress,
  optionId?: string,
): RunnableSession {
  const d = getDay(day);
  if (!d) throw new Error(`program-engine: unknown day ${day}`);

  if (d.kind === "conditioning-choice") {
    const opt = d.options?.find((o) => o.id === optionId);
    const steps: RunStep[] = opt?.kind === "circuit" && opt.circuit
      ? opt.circuit.map((it) => stepFromItem(it, "main", week, prefs))
      : [];
    return {
      block: progress.blockNumber, week, day, optionId,
      title: opt ? opt.label : d.title,
      steps,
    };
  }

  const steps: RunStep[] = [
    ...(d.warmup?.items ?? []).map((it) => stepFromItem(it, "warmup", week, prefs)),
    ...(d.main ?? []).map((it) => stepFromItem(it, "main", week, prefs)),
    ...(d.cooldown?.items ?? []).map((it) => stepFromItem(it, "cooldown", week, prefs)),
  ];
  return {
    block: progress.blockNumber, week, day,
    title: `${d.title}`,
    steps,
  };
}

// ---- progressive overload (extended for wave weeks) ------------------------

export interface ProgressionSuggestion {
  lastWeight: number | null;
  lastReps: number | null;
  suggested: number | null;
  hint: string | null;
}

const STEP = 5; // lb, matches the Runner's weight stepper

// Look at the most recent session where this loaded lift was actually done and
// decide what to suggest. Crucially, on a WAVE WEEK — where the prescription
// asks for more reps than you hit last time — hold the weight and chase reps
// rather than pushing load. Always a hint, never auto-applied.
export function suggestNextWeight(
  sessions: SessionLog[],
  exerciseId: string,
  targetReps: number | null,
): ProgressionSuggestion {
  // sessions are expected newest-first.
  for (const s of sessions) {
    const log = s.exercises.find((l) => l.exerciseId === exerciseId);
    if (!log) continue;
    const done = log.sets.filter((x) => x.done && x.weight != null);
    if (done.length === 0) continue;
    const lastWeight = done[done.length - 1].weight as number;
    const repsList = done.map((x) => x.reps).filter((r): r is number => r != null);
    const lastReps = repsList.length ? Math.min(...repsList) : null;

    if (targetReps == null || lastReps == null) {
      return { lastWeight, lastReps, suggested: lastWeight, hint: `Last time ${lastWeight} lb` };
    }
    if (targetReps > lastReps) {
      // Rep-chase week: the plan wants more reps than you managed — hold load.
      return {
        lastWeight, lastReps, suggested: lastWeight,
        hint: `Last time ${lastWeight} lb × ${lastReps} · reps go up — hold and chase clean reps`,
      };
    }
    const hitTarget = repsList.every((r) => r >= targetReps);
    if (hitTarget) {
      const suggested = lastWeight + STEP;
      return { lastWeight, lastReps, suggested, hint: `Last time ${lastWeight} lb · try ${suggested} ↑` };
    }
    return { lastWeight, lastReps, suggested: lastWeight, hint: `Last time ${lastWeight} lb · match or beat your reps` };
  }
  return { lastWeight: null, lastReps: null, suggested: null, hint: null };
}

// ---- derived progression history (the headline "progress" view) ------------

// Build a per-lift history across all logged sessions, newest data last so a
// chart reads left→right in time. PRs = each point that sets a new best
// working weight to date. Substituted sessions still count under the original
// exerciseId (they carry a `substitutedFor` marker, but the id is unchanged).
export function buildLiftHistories(sessions: SessionLog[]): LiftHistory[] {
  const byLift = new Map<string, LiftHistory>();
  // Oldest-first so PR detection and left→right ordering are chronological.
  const ordered = [...sessions].sort((a, b) => (a.date < b.date ? -1 : 1));

  for (const s of ordered) {
    for (const log of s.exercises) {
      const ex = getExercise(log.exerciseId);
      if (!ex || !ex.loaded) continue;
      const doneSets = log.sets.filter((x) => x.done && x.weight != null);
      if (doneSets.length === 0) continue;

      const workingWeight = Math.max(...doneSets.map((x) => x.weight as number));
      const topSet = doneSets.find((x) => x.weight === workingWeight);
      const reps = topSet?.reps ?? null;
      let volume = 0;
      for (const set of doneSets) {
        const w = set.weight as number;
        if (set.perSide && (set.perSide.l != null || set.perSide.r != null)) {
          volume += w * ((set.perSide.l ?? 0) + (set.perSide.r ?? 0));
        } else if (set.reps != null) {
          volume += w * set.reps;
        }
      }

      let hist = byLift.get(log.exerciseId);
      if (!hist) {
        hist = { exerciseId: log.exerciseId, name: ex.name, loaded: true, points: [], bestWeight: null };
        byLift.set(log.exerciseId, hist);
      }
      const isPR = hist.bestWeight == null || workingWeight > hist.bestWeight;
      if (isPR) hist.bestWeight = workingWeight;
      const point: WeightPoint = {
        block: s.block, week: s.week, day: s.day, date: s.date,
        workingWeight, reps, volume, isPR,
      };
      hist.points.push(point);
    }
  }

  return [...byLift.values()].filter((h) => h.points.length > 0);
}
