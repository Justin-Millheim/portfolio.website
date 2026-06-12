// Domain types for /program — "The Block": a fixed, coach-authored 4-week
// training block. Unlike /train (a generator over a move library), this is
// deterministic static data: the program engine serves the right Day × Week.
//
// Kept backend-agnostic so the same shapes serialize to localStorage (guest)
// today and to Supabase/Postgres (cloud) — see lib/program/storage.ts.

// ---- Set-type taxonomy (PRD §4.2) ------------------------------------------
// The Runner branches on the shape of a prescription:
//   reps          → log actual reps; if loaded, also log weight
//   reps-perside  → same, with a left/right affordance ("e" = each side)
//   timed         → countdown for durationSec, no weight prompt unless loaded
//   rounds        → "round done" tap repeated N times, no countdown (the sled)
//   free          → log duration + a note, no per-set flow (Day-4 swim/bike)
export type SetType = "reps" | "reps-perside" | "timed" | "rounds" | "free";

export type ExerciseType = "warmup" | "strength" | "cardio" | "mobility" | "cooldown";

export interface HowTo {
  setup: string;
  steps: string[];
  mistakes: string[];
  easier: string;
  harder: string;
}

// A curated equipment swap (PRD §5). It's a labeled alternative, not a separate
// library entry — when chosen, the session logs and charts the lift under its
// ORIGINAL exerciseId (with a `substitutedFor` marker), so a swap never
// fragments a lift's history.
export interface Substitution {
  id: string;            // unique within the exercise's subs
  label: string;         // display name of the alternative
  note: string;          // what to do / how it differs
  equipment: string[];
}

export interface Exercise {
  id: string;
  name: string;
  emoji: string;
  type: ExerciseType;
  setType: SetType;
  loaded: boolean;                 // tracks external weight?
  equipment: string[];
  cue: string;                     // the coach's note from the sheet
  videoUrl?: string;               // "See how it's done" — coach's demo link
  videoLinks?: { label: string; url: string }[]; // multi-link moves (foam roller)
  howTo: HowTo;
  subs?: Substitution[];
}

// ---- The program as static, typed data (PRD §4.1) --------------------------

// A single week's prescription for a main exercise. Exactly one of the
// reps/durationSec/rounds fields is set, matching the exercise's setType.
export interface Prescription {
  week: 1 | 2 | 3 | 4;
  sets: number;
  reps?: number;                   // straight reps, or per-side reps when perSide
  perSide?: boolean;               // "e" — reps are each side
  durationSec?: number;            // timed sets
  rounds?: number;                 // sled "×3"
  displayRaw: string;              // e.g. "3×45 sec" — source string, the fallback
}

export interface PlanItem {
  exerciseId: string;
  restSec: number;                 // fixed 60 for mains; 0 for warmup/cooldown
  cue: string;
  prescriptions: Prescription[];   // one per week (1..4); warmup/cooldown use [0]
}

export interface WarmupPhase {
  items: PlanItem[];
}
export interface CooldownPhase {
  items: PlanItem[];
}

// Day-4 conditioning menu option (PRD §4.1).
export interface ConditioningOption {
  id: string;
  label: string;
  emoji: string;
  kind: "free" | "timed" | "circuit";
  note?: string;
  durationSec?: number;
  circuit?: PlanItem[];
}

export type DayKind = "strength" | "conditioning-choice";

export interface Day {
  id: 1 | 2 | 3 | 4;
  title: string;
  kind: DayKind;
  warmup?: WarmupPhase;
  main?: PlanItem[];
  cooldown?: CooldownPhase;
  options?: ConditioningOption[];  // Day 4 only
}

export interface Program {
  id: string;
  name: string;
  weeks: 4;
  days: Day[];
  coachNotes?: string;
}

// ---- Progression & session state (per user, PRD §4.4) ----------------------

export type Phase = "warmup" | "main" | "cooldown";

// What the user actually did for one set.
export interface SetLog {
  setIndex: number;
  weight: number | null;
  reps: number | null;             // total reps, or (for per-side) the combined L+R
  perSide?: { l: number | null; r: number | null };
  durationSec: number | null;
  rpe?: number | null;
  done: boolean;
}

export interface ExerciseLog {
  exerciseId: string;
  phase: Phase;
  substitutedFor?: string;         // the curated sub actually performed, if any
  sets: SetLog[];
  skipped: boolean;
  note?: string;                   // free-day note (swim/bike/treadmill)
}

export interface CheckIn {
  energy: number;                  // 1-5
  mood: string;                    // emoji/label
  note?: string;
}

export interface PhaseTimes {
  warmup: number;
  main: number;
  cooldown: number;
}

export type SessionStatus = "in_progress" | "completed" | "abandoned";

// One logged session = one Day of one Week of one block.
export interface SessionLog {
  id: string;
  userId: string;
  block: number;                   // blockNumber this was logged against
  week: 1 | 2 | 3 | 4;
  day: 1 | 2 | 3 | 4;
  optionId?: string;               // Day-4 choice
  date: string;                    // ISO; the queryable session date
  startedAt: string;
  finishedAt?: string;
  status: SessionStatus;
  pre?: CheckIn;
  post?: CheckIn;
  exercises: ExerciseLog[];
  totalSeconds: number;
  phaseTimes: PhaseTimes;
  favorite?: boolean;
}

// Guided rotation pointer + completion ledger (PRD §5).
export interface ProgramProgress {
  blockNumber: number;
  currentWeek: 1 | 2 | 3 | 4;
  completed: { week: number; day: number }[];
  blockStartedAt: string;
}

// Substitution choices + prefer/avoid lists (sticky in prefs).
export interface ProgramPrefs {
  // exerciseId -> chosen substitution exerciseId (sticks across sessions)
  subs: Record<string, string>;
  preferred: string[];
  avoided: string[];
}

// ---- A runnable session, assembled by the engine ---------------------------
// Flattened to a single ordered list of steps so the Runner can walk it the way
// the /train Runner walks plan.items, while each step carries its set-type.
export interface RunStep {
  exerciseId: string;
  phase: Phase;
  setType: SetType;
  loaded: boolean;
  sets: number;
  restSec: number;
  cue: string;
  reps?: number;
  perSide?: boolean;
  durationSec?: number;
  rounds?: number;
  display: string;                 // the human prescription, e.g. "3 × 10 · 25 lb last"
  subId?: string;                  // chosen curated substitution, if any
  subLabel?: string;               // its display name (shown in place of the move)
  subNote?: string;                // how to perform the swap
}

export interface RunnableSession {
  block: number;
  week: 1 | 2 | 3 | 4;
  day: 1 | 2 | 3 | 4;
  optionId?: string;
  title: string;
  steps: RunStep[];
}

// ---- Runner resume snapshot (mirrors /train's RunnerSnapshot) --------------
export interface StepSnapshot {
  stepIndex: number;
  currentSet: number;
  currentRound: number;            // for rounds set-type
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

// Cached in-progress session for resume-where-you-left-off.
export interface ActiveSession {
  session: RunnableSession;
  pre?: CheckIn;
  snapshot: RunnerSnapshot;
  savedAt: string;
}

// ---- Derived progression view (PRD §4.4, §6 progress screen) ---------------
export interface WeightPoint {
  block: number;
  week: 1 | 2 | 3 | 4;
  day: number;
  date: string;
  workingWeight: number | null;    // top set weight that session
  reps: number | null;
  volume: number;                  // sum(weight × reps) for the lift that session
  isPR: boolean;                   // best working weight to date at this point
}
export interface LiftHistory {
  exerciseId: string;
  name: string;
  loaded: boolean;
  points: WeightPoint[];
  bestWeight: number | null;
}
