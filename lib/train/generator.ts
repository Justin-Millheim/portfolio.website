import type {
  Constraint, Difficulty, Equipment, Exercise, Focus, PlanItem, WorkoutPlan,
} from "./types";
import { EXERCISES } from "./exercises";

// ---- Seeded RNG (mulberry32) so reroll/repeat is reproducible from a seed ----
function rng(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// What a user's chosen equipment unlocks. Bodyweight is always available.
function allowedTiers(equipment: Equipment): Equipment[] {
  switch (equipment) {
    case "bodyweight": return ["bodyweight"];
    case "dumbbell": return ["bodyweight", "dumbbell"];
    case "bands": return ["bodyweight", "bands"];
    case "full": return ["bodyweight", "dumbbell", "bands", "full"];
  }
}

function isValid(ex: Exercise, focus: Focus, allowed: Equipment[], constraints: Constraint[]): boolean {
  if (!ex.focus.includes(focus)) return false;
  if (!ex.equipment.some((t) => allowed.includes(t))) return false;
  if (ex.excludedBy && ex.excludedBy.some((c) => constraints.includes(c))) return false;
  return true;
}

// Rough seconds one working set takes, for time budgeting.
function setWorkSecondsFromReps(ex: Exercise): number {
  if (ex.defaultDuration) return ex.defaultDuration;
  const m = ex.defaultReps.match(/\d+/);
  const n = m ? parseInt(m[0], 10) : 12;
  return Math.min(60, Math.max(20, Math.round(n * 2.6))); // ~2.6s per rep, clamped
}

function itemSeconds(ex: Exercise, sets: number): number {
  const work = ex.defaultDuration ?? setWorkSecondsFromReps(ex);
  return sets * work + (sets - 1) * ex.defaultRest + 12; // +12s transition/setup
}

function toItem(ex: Exercise, phase: PlanItem["phase"], sets: number): PlanItem {
  return {
    exerciseId: ex.id,
    phase,
    sets,
    reps: ex.defaultReps,
    rest: ex.defaultRest,
    duration: ex.defaultDuration,
  };
}

export interface GenerateInput {
  focus: Focus;
  minutes: number;
  equipment: Equipment;
  constraints?: Constraint[];
  difficulty?: Difficulty;
  seed?: number;
}

// Builds a warmup -> circuit -> cooldown plan that targets the requested minutes.
export function generatePlan(input: GenerateInput): WorkoutPlan {
  const constraints = input.constraints ?? [];
  const difficulty: Difficulty = input.difficulty ?? "beginner";
  const seed = input.seed ?? Math.floor(Math.random() * 1e9);
  const rnd = rng(seed);
  const allowed = allowedTiers(input.equipment);

  const totalSec = input.minutes * 60;
  const warmBudget = Math.round(totalSec * 0.13);
  const coolBudget = Math.round(totalSec * 0.13);
  const circuitBudget = totalSec - warmBudget - coolBudget;

  const pool = EXERCISES.filter((e) => isValid(e, input.focus, allowed, constraints));

  // -------- Warmup --------
  const warmPool = shuffle(pool.filter((e) => e.type === "warmup"), rnd);
  const warm: PlanItem[] = [];
  let warmUsed = 0;
  for (const ex of warmPool) {
    if (warmUsed >= warmBudget && warm.length >= 2) break;
    warm.push(toItem(ex, "warmup", 1));
    warmUsed += (ex.defaultDuration ?? 40) + 6;
    if (warm.length >= 4) break;
  }

  // -------- Cooldown --------
  const coolPool = shuffle(pool.filter((e) => e.type === "cooldown"), rnd);
  const cool: PlanItem[] = [];
  let coolUsed = 0;
  for (const ex of coolPool) {
    if (coolUsed >= coolBudget && cool.length >= 2) break;
    cool.push(toItem(ex, "cooldown", 1));
    coolUsed += (ex.defaultDuration ?? 30) + 6;
    if (cool.length >= 4) break;
  }

  // -------- Circuit --------
  // Strength + cardio movements that match the focus. For "cardio" we lean on
  // cardio-type moves; otherwise strength-led with optional cardio finisher.
  const isCardio = input.focus === "cardio";
  const circuitPool = shuffle(
    pool.filter((e) =>
      isCardio ? (e.type === "cardio" || e.type === "strength")
               : (e.type === "strength" || e.type === "cardio")
    ),
    rnd
  );

  // Prefer the focus's primary movements first, then variety by muscle group.
  const sets = difficulty === "beginner" ? 3 : 4;
  const circuit: PlanItem[] = [];
  const usedMuscles = new Set<string>();
  let circUsed = 0;

  // Pass 1: prioritise unique primary muscle coverage (great for full body).
  const ordered = [
    ...circuitPool.filter((e) => (isCardio ? e.type === "cardio" : e.type === "strength")),
    ...circuitPool.filter((e) => (isCardio ? e.type === "strength" : e.type === "cardio")),
  ];

  for (const ex of ordered) {
    if (circUsed >= circuitBudget) break;
    const primary = ex.muscles[0];
    // For full body, skip if we've already hit this muscle and still have fresh options.
    if (input.focus === "full" && usedMuscles.has(primary) && usedMuscles.size < 6) continue;
    const exSets = ex.type === "cardio" && !ex.defaultDuration ? sets : (ex.defaultDuration ? Math.min(sets, ex.defaultSets) : sets);
    const cost = itemSeconds(ex, exSets);
    if (circUsed + cost > circuitBudget + 45) continue; // allow slight overflow tolerance
    circuit.push(toItem(ex, "circuit", exSets));
    usedMuscles.add(primary);
    circUsed += cost;
    if (circuit.length >= 8) break;
  }

  // Pass 2: if we under-filled (short workout / small pool), top up allowing repeats of muscle.
  if (circuit.length < 3) {
    for (const ex of ordered) {
      if (circuit.find((c) => c.exerciseId === ex.id)) continue;
      circuit.push(toItem(ex, "circuit", sets));
      if (circuit.length >= 4) break;
    }
  }

  const items = [...warm, ...circuit, ...cool];

  return {
    id: `plan_${seed.toString(36)}`,
    focus: input.focus,
    durationTarget: input.minutes,
    equipment: input.equipment,
    constraints,
    difficulty,
    seed,
    items,
    createdAt: new Date().toISOString(),
  };
}

// Swap a single circuit item for another valid alternative not already in the plan.
export function swapItem(plan: WorkoutPlan, index: number): WorkoutPlan {
  const target = plan.items[index];
  if (!target || target.phase === "warmup") return plan;
  const allowed = allowedTiers(plan.equipment);
  const used = new Set(plan.items.map((i) => i.exerciseId));
  const rnd = rng(plan.seed + index + Date.now());

  const candidates = shuffle(
    EXERCISES.filter((e) => {
      if (used.has(e.id)) return false;
      if (!isValid(e, plan.focus, allowed, plan.constraints)) return false;
      if (target.phase === "cooldown") return e.type === "cooldown";
      return e.type === "strength" || e.type === "cardio";
    }),
    rnd
  );
  if (candidates.length === 0) return plan;

  const next = candidates[0];
  const items = plan.items.slice();
  items[index] = toItem(next, target.phase, target.sets);
  return { ...plan, items };
}
