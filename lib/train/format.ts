import type { ExerciseLog, WorkoutSession } from "./types";

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

// Total volume = sum of weight x reps across completed loaded sets.
export function sessionVolume(session: WorkoutSession): number {
  let vol = 0;
  for (const log of session.logs) {
    for (const set of log.sets) {
      if (set.completed && set.weight != null && set.reps != null) {
        vol += set.weight * set.reps;
      }
    }
  }
  return vol;
}

export function completedSetCount(logs: ExerciseLog[]): number {
  return logs.reduce(
    (n, l) => n + l.sets.filter((s) => s.completed).length,
    0
  );
}

export const FOCUS_LABEL: Record<string, string> = {
  full: "Full Body",
  legs: "Legs",
  arms: "Arms",
  core: "Core",
  cardio: "Cardio",
};

export const EQUIPMENT_LABEL: Record<string, string> = {
  bodyweight: "Bodyweight",
  dumbbell: "Dumbbells",
  bands: "Resistance Bands",
  full: "Full Gym",
};

export const MOODS = ["😣", "😕", "😐", "🙂", "😄"];
export const MOOD_LABEL = ["Rough", "Meh", "Okay", "Good", "Great"];
