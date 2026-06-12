import type { ExerciseLog, SessionLog } from "./types";

export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

// Total volume = sum of weight × reps across completed loaded sets. Per-side
// sets count both sides (reps stores the per-side count, perSide the true L/R).
export function sessionVolume(session: SessionLog): number {
  let vol = 0;
  for (const log of session.exercises) {
    for (const set of log.sets) {
      if (!set.done || set.weight == null) continue;
      if (set.perSide && (set.perSide.l != null || set.perSide.r != null)) {
        vol += set.weight * ((set.perSide.l ?? 0) + (set.perSide.r ?? 0));
      } else if (set.reps != null) {
        vol += set.weight * set.reps;
      }
    }
  }
  return vol;
}

export function completedSetCount(logs: ExerciseLog[]): number {
  return logs.reduce((n, l) => n + l.sets.filter((s) => s.done).length, 0);
}

export const PHASE_LABEL: Record<string, string> = {
  warmup: "Warm-Up",
  main: "Main",
  cooldown: "Cool-Down",
};

export const DAY_SHORT: Record<number, string> = {
  1: "D1", 2: "D2", 3: "D3", 4: "D4",
};

export const MOODS = ["😣", "😕", "😐", "🙂", "😄"];
export const MOOD_LABEL = ["Rough", "Meh", "Okay", "Good", "Great"];
