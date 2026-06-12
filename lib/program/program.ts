import type { ConditioningOption, Day, PlanItem, Prescription, Program } from "./types";
import { getExercise } from "./exercises";

// "The Block" — the fixed 4-week program, transcribed from the coach's
// spreadsheet (Justin_Millheim_Workout_Plan.xlsx). Days 1–3 share a warm-up and
// cool-down; Day 4 is a conditioning menu. Every main lift carries a per-week
// prescription and a fixed 60-sec rest.
//
// Wave progression is INTENTIONAL (e.g. Chest Fly 10/12/10/12, Oblique Crunch
// 8/10/8/10) — the engine reads the prescribed value per week and never assumes
// a monotonic increase.

const REST = 60; // fixed 60-sec rest on every main lift

// ---- prescription builders (one spec per week) -----------------------------
type Spec = {
  sets: number;
  reps?: number;
  perSide?: boolean;
  durationSec?: number;
  rounds?: number;
  display: string;
};

function secLabel(sec: number): string {
  if (sec >= 120 && sec % 60 === 0) return `${sec / 60} min`;
  return `${sec} sec`;
}

// reps: R(sets, reps)
const R = (sets: number, reps: number): Spec => ({ sets, reps, display: `${sets}×${reps}` });
// per-side reps ("e"): Re(sets, repsPerSide)
const Re = (sets: number, reps: number): Spec => ({ sets, reps, perSide: true, display: `${sets}×${reps}e` });
// timed: T(sets, durationSec)
const T = (sets: number, sec: number): Spec => ({ sets, durationSec: sec, display: `${sets}×${secLabel(sec)}` });
// rounds (the sled): Rd(rounds)
const Rd = (rounds: number): Spec => ({ sets: 1, rounds, display: `×${rounds}` });

// Build a main PlanItem from an exercise id and its 4-week specs.
function main(exerciseId: string, specs: [Spec, Spec, Spec, Spec]): PlanItem {
  const ex = getExercise(exerciseId);
  if (!ex) throw new Error(`program.ts: unknown exercise "${exerciseId}"`);
  return {
    exerciseId,
    restSec: REST,
    cue: ex.cue,
    prescriptions: specs.map((s, i) => specToRx(s, (i + 1) as 1 | 2 | 3 | 4)),
  };
}

// Build a single-prescription PlanItem (warm-up, cool-down, Day-4 circuit) —
// the same value every week.
function fixed(exerciseId: string, spec: Spec, restSec = 0): PlanItem {
  const ex = getExercise(exerciseId);
  if (!ex) throw new Error(`program.ts: unknown exercise "${exerciseId}"`);
  return { exerciseId, restSec, cue: ex.cue, prescriptions: [specToRx(spec, 1)] };
}

function specToRx(s: Spec, week: 1 | 2 | 3 | 4): Prescription {
  return {
    week,
    sets: s.sets,
    reps: s.reps,
    perSide: s.perSide,
    durationSec: s.durationSec,
    rounds: s.rounds,
    displayRaw: s.display,
  };
}

// ---- shared warm-up (Days 1–3) ---------------------------------------------
const WARMUP: PlanItem[] = [
  fixed("yogi-squat-fold", R(1, 5)),
  fixed("downward-dog-plank", R(1, 5)),
  fixed("band-pull-aparts", R(1, 6)),
  fixed("worlds-greatest", Re(1, 4)),
  // 90/90 reps unspecified in source — quality/feel default of 5 each side.
  fixed("ninety-ninety-hip-lift", Re(1, 5)),
  fixed("foam-roller-flow", T(4, 30)),
];

// ---- shared cool-down (all days) -------------------------------------------
const COOLDOWN: PlanItem[] = [
  // Soft timer, default 5 min, skippable.
  fixed("cooldown-walk", T(1, 300)),
  fixed("stretch", { sets: 1, display: "Free" }),
];

// ---- Day 4 conditioning menu ------------------------------------------------
const DAY4_OPTIONS: ConditioningOption[] = [
  { id: "swim", label: "Swim", emoji: "🏊", kind: "free", note: "Intervals between sprints and easy laps." },
  { id: "mtb", label: "Mountain Biking", emoji: "🚵", kind: "free", note: "Get out and ride — mix the terrain." },
  { id: "treadmill", label: "Incline Walk + Vest", emoji: "🥾", kind: "timed", durationSec: 1800, note: "30 min steady incline with a weighted vest." },
  {
    id: "bodyweight",
    label: "Bodyweight Circuit",
    emoji: "🤸",
    kind: "circuit",
    note: "Burpees · Mountain Climbers · Push-ups · Plank.",
    circuit: [
      fixed("burpees", R(3, 8), REST),
      fixed("mountain-climbers", T(3, 30), REST),
      fixed("push-ups", R(3, 10), REST),
      // Plank duration was garbled in source ("ustin") — defaulted to 30 sec.
      fixed("plank-hold", T(3, 30), REST),
    ],
  },
];

// ---- the days --------------------------------------------------------------
const DAYS: Day[] = [
  {
    id: 1,
    title: "Upper Push / Lower Pull",
    kind: "strength",
    warmup: { items: WARMUP },
    main: [
      main("quick-ropes", [T(3, 45), T(3, 45), T(3, 60), T(3, 60)]),
      main("row-machine-sprints", [T(3, 30), T(3, 40), T(3, 50), T(3, 60)]),
      main("incline-db-bench", [R(3, 8), R(3, 10), R(3, 10), R(3, 12)]),
      main("leg-curl-machine", [R(3, 8), R(3, 8), R(3, 10), R(3, 12)]),
      main("chest-fly-machine", [R(3, 10), R(3, 12), R(3, 10), R(3, 12)]),
      main("barbell-hip-thrusts", [R(3, 8), R(3, 10), R(3, 10), R(3, 12)]),
      main("kb-around-worlds", [Re(3, 6), Re(3, 8), Re(3, 8), Re(3, 10)]),
    ],
    cooldown: { items: COOLDOWN },
  },
  {
    id: 2,
    title: "Upper Pull / Lower Push",
    kind: "strength",
    warmup: { items: WARMUP },
    main: [
      main("sled-push-pull", [Rd(3), Rd(3), Rd(4), Rd(4)]),
      main("slider-mountain-climbers", [T(3, 30), T(3, 40), T(3, 50), T(3, 60)]),
      main("trx-inverted-row", [R(3, 10), R(3, 12), R(3, 10), R(3, 12)]),
      main("sandbag-walking-lunges", [Re(3, 6), Re(3, 8), Re(3, 10), Re(3, 10)]),
      main("straight-arm-lat-pulldown", [R(3, 8), R(3, 8), R(3, 9), R(3, 10)]),
      main("heel-elevated-goblet-squats", [R(3, 10), R(3, 12), R(3, 10), R(3, 12)]),
      main("pallof-press-step-out", [Re(2, 8), Re(2, 10), Re(3, 8), Re(3, 10)]),
    ],
    cooldown: { items: COOLDOWN },
  },
  {
    id: 3,
    title: "Full Body",
    kind: "strength",
    warmup: { items: WARMUP },
    main: [
      main("assault-bike-sprints", [T(3, 30), T(3, 40), T(3, 50), T(3, 60)]),
      main("wall-sit", [T(3, 45), T(3, 60), T(3, 60), T(3, 90)]),
      main("alt-shoulder-raises", [Re(3, 6), Re(3, 8), Re(3, 10), Re(3, 12)]),
      main("slider-hamstring-curls", [R(3, 10), R(3, 12), R(3, 12), R(3, 15)]),
      main("kb-gorilla-rows", [Re(3, 6), Re(3, 8), Re(3, 10), Re(3, 10)]),
      main("oblique-crunches", [Re(3, 8), Re(3, 10), Re(3, 8), Re(3, 10)]),
    ],
    cooldown: { items: COOLDOWN },
  },
  {
    id: 4,
    title: "Conditioning / Choice",
    kind: "conditioning-choice",
    options: DAY4_OPTIONS,
  },
];

export const PROGRAM: Program = {
  id: "the-block-v1",
  name: "The Block",
  weeks: 4,
  days: DAYS,
  coachNotes: "A 4-day split run as a 4-week progressive block. Same lifts each week, a little more each time.",
};

export function getDay(day: number): Day | undefined {
  return PROGRAM.days.find((d) => d.id === day);
}

export const TOTAL_SESSIONS = PROGRAM.weeks * PROGRAM.days.length; // 16
