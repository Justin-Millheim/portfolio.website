// Domain types for the /train workout companion.
// Kept backend-agnostic so the same shapes serialize to localStorage today
// and to Supabase/Postgres later (see lib/train/storage.ts).

export type Focus = "full" | "legs" | "arms" | "core" | "cardio";

export type Equipment = "bodyweight" | "dumbbell" | "bands" | "full";

export type Difficulty = "beginner" | "intermediate";

export type Phase = "warmup" | "circuit" | "cooldown";

export type MuscleGroup =
  | "quads" | "glutes" | "hamstrings" | "calves"
  | "chest" | "back" | "shoulders" | "biceps" | "triceps"
  | "core" | "fullbody" | "cardio" | "mobility";

// A constraint a user can toggle at intent time (e.g. a bad knee, no jumping).
export type Constraint =
  | "no-jumping"
  | "no-floor"
  | "knee-friendly"
  | "shoulder-friendly"
  | "quiet"; // apartment-friendly, no loud impact

export interface HowTo {
  setup: string;
  steps: string[];
  mistakes: string[];
  easier: string;
  harder: string;
}

export interface Exercise {
  id: string;
  name: string;
  emoji: string;
  type: "warmup" | "strength" | "cardio" | "mobility" | "cooldown";
  focus: Focus[];               // which intents this exercise serves
  muscles: MuscleGroup[];
  muscleLabel: string;          // human-readable, e.g. "Quads · Glutes · Core"
  equipment: Equipment[];       // equipment tiers this is valid for
  loaded: boolean;              // does it use external weight (track weight)?
  // Defaults the generator uses; runner can still adapt.
  defaultSets: number;
  defaultReps: string;          // e.g. "12 reps" or "30 seconds"
  defaultRest: number;          // seconds between sets
  defaultDuration?: number;     // seconds, for timed warmup/cooldown/cardio
  tip: string;                  // short cue shown on the card
  howTo: HowTo;
  excludedBy?: Constraint[];    // drop this exercise if any of these are active
}

// A single planned exercise within a generated/approved plan.
export interface PlanItem {
  exerciseId: string;
  phase: Phase;
  sets: number;
  reps: string;
  rest: number;
  duration?: number;
}

export interface WorkoutPlan {
  id: string;
  focus: Focus;
  durationTarget: number;       // minutes requested
  equipment: Equipment;
  constraints: Constraint[];
  difficulty: Difficulty;
  seed: number;                 // lets us reproduce / reroll deterministically
  items: PlanItem[];
  createdAt: string;            // ISO
}

// What the user actually did for one set.
export interface SetLog {
  setNumber: number;
  weight: number | null;        // null = bodyweight / not tracked
  reps: number | null;
  rpe: number | null;           // 1-10 perceived exertion
  completed: boolean;
}

export interface ExerciseLog {
  exerciseId: string;
  phase: Phase;
  sets: SetLog[];
  skipped: boolean;
}

export interface CheckIn {
  energy: number;               // 1-5
  mood: string;                 // emoji/label
  note?: string;
}

// Time spent (seconds) split by phase, for the summary breakdown.
export interface PhaseTimes {
  warmup: number;
  circuit: number;
  cooldown: number;
}

export type WorkoutStatus = "in_progress" | "completed" | "abandoned";

export interface WorkoutSession {
  id: string;
  userId: string;               // "local" until cloud auth is wired
  date: string;                 // ISO date the session started
  focus: Focus;
  durationTarget: number;
  equipment: Equipment;
  constraints: Constraint[];
  status: WorkoutStatus;
  plan: WorkoutPlan;
  pre?: CheckIn;
  post?: CheckIn;
  logs: ExerciseLog[];
  totalSeconds: number;
  phaseTimes: PhaseTimes;
  completedAt?: string;
  favorite?: boolean;           // user-saved favorite workout
}

// Serializable runner position so an interrupted workout can resume exactly.
export interface StepSnapshot {
  itemIndex: number;
  currentSet: number;
  subMode: "work" | "rest" | "ready";
  timer: number | null;
  timerActive: boolean;
}

export interface RunnerSnapshot extends StepSnapshot {
  logs: ExerciseLog[];
  stepHistory: StepSnapshot[];
  totalSeconds: number;
  phaseTimes: PhaseTimes;
}

// Cached in-progress workout (plan + pre check-in + runner position).
export interface ActiveSession {
  plan: WorkoutPlan;
  pre?: CheckIn;
  snapshot: RunnerSnapshot;
  savedAt: string;
}
