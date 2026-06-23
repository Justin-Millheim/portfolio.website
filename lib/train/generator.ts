import type {
  Constraint, Difficulty, Equipment, Exercise, Focus, MuscleGroup, Phase, PlanItem, WorkoutPlan,
} from "./types";
import { EXERCISES, getExercise } from "./exercises";

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
// "full" (a real gym) is the only tier that unlocks barbell / machine / cable /
// pull-up / kettlebell movements (the exercises tagged with the "full" tier).
function allowedTiers(equipment: Equipment): Equipment[] {
  switch (equipment) {
    case "bodyweight": return ["bodyweight"];
    case "dumbbell": return ["bodyweight", "dumbbell"];
    case "bands": return ["bodyweight", "bands"];
    case "full": return ["bodyweight", "dumbbell", "bands", "full"];
  }
}

// Full validity for a circuit (work) movement: it must serve the focus, be
// doable with the available equipment, and clear any active constraints.
function isValid(ex: Exercise, focus: Focus, allowed: Equipment[], constraints: Constraint[]): boolean {
  if (!ex.focus.includes(focus)) return false;
  if (!ex.equipment.some((t) => allowed.includes(t))) return false;
  if (ex.excludedBy && ex.excludedBy.some((c) => constraints.includes(c))) return false;
  return true;
}

// Warmups/cooldowns are matched to the muscles actually trained (below), not to
// the focus tag, so they only need to clear equipment + constraints here.
function equipConstraintOk(ex: Exercise, allowed: Equipment[], constraints: Constraint[]): boolean {
  if (!ex.equipment.some((t) => allowed.includes(t))) return false;
  if (ex.excludedBy && ex.excludedBy.some((c) => constraints.includes(c))) return false;
  return true;
}

// The muscle groups a focus is "about". Combined with the circuit's own muscles,
// this lets us pick warmups/cooldowns that prep/relax what you just worked
// (e.g. an arms day cools down with triceps/shoulder stretches, not hamstrings).
const FOCUS_MUSCLES: Record<Focus, MuscleGroup[]> = {
  full: ["quads", "glutes", "hamstrings", "chest", "back", "shoulders", "core"],
  legs: ["quads", "glutes", "hamstrings", "calves"],
  arms: ["biceps", "triceps", "shoulders", "chest", "back"],
  core: ["core"],
  cardio: ["cardio", "fullbody"],
};

function isEachSide(ex: Exercise): boolean {
  return /each side|per side|each leg|each arm/i.test(ex.defaultReps);
}

// Rough seconds one working set takes, for time budgeting.
function setWorkSecondsFromReps(ex: Exercise): number {
  if (ex.defaultDuration) return ex.defaultDuration;
  const m = ex.defaultReps.match(/\d+/);
  let n = m ? parseInt(m[0], 10) : 12;
  if (isEachSide(ex)) n *= 2; // "10 each side" is ~20 reps of work
  return Math.min(80, Math.max(20, Math.round(n * 2.6))); // ~2.6s per rep, clamped
}

function itemSeconds(ex: Exercise, sets: number): number {
  let work = ex.defaultDuration ?? setWorkSecondsFromReps(ex);
  // A timed "each side" hold runs for both sides (the runner doubles it too).
  if (ex.defaultDuration && isEachSide(ex)) work *= 2;
  return sets * work + (sets - 1) * ex.defaultRest + 12; // +12s transition/setup
}

// Retuned rest periods (user feedback): shorter overall. ~20s for most moves,
// ~30s kept for the heavier compound lifts. Warmup/cooldown stay at 0.
function normalizeRest(rest: number): number {
  if (rest <= 0) return 0;
  return rest >= 40 ? 30 : 20;
}

function toItem(ex: Exercise, phase: PlanItem["phase"], sets: number): PlanItem {
  return {
    exerciseId: ex.id,
    phase,
    sets,
    reps: ex.defaultReps,
    rest: normalizeRest(ex.defaultRest),
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
  preferred?: string[]; // exercise ids weighted to appear more often
  blocked?: string[];   // exercise ids never suggested
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

  const blocked = new Set(input.blocked ?? []);
  const preferredIds = new Set(input.preferred ?? []);
  const pool = EXERCISES.filter(
    (e) => isValid(e, input.focus, allowed, constraints) && !blocked.has(e.id)
  );

  // -------- Circuit (built first so warmups/cooldowns can target it) --------
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

  const sets = difficulty === "beginner" ? 3 : 4;
  const circuit: PlanItem[] = [];
  const usedMuscles = new Set<string>();
  const used = new Set<string>();
  let circUsed = 0;
  let generalCount = 0;

  const ordered = [
    ...circuitPool.filter((e) => (isCardio ? e.type === "cardio" : e.type === "strength")),
    ...circuitPool.filter((e) => (isCardio ? e.type === "strength" : e.type === "cardio")),
  ];

  // Two banks: preferred (user-favored) vs the general/primary library.
  const preferredBank = ordered.filter((e) => preferredIds.has(e.id));
  const generalBank = ordered.filter((e) => !preferredIds.has(e.id));

  function exSetsFor(ex: Exercise): number {
    if (ex.type === "cardio" && !ex.defaultDuration) return sets;
    return ex.defaultDuration ? Math.min(sets, ex.defaultSets) : sets;
  }

  // Pull the next bank candidate that fits muscle-variety + time-budget rules.
  function nextFrom(bank: Exercise[]): { ex: Exercise; exSets: number; cost: number } | null {
    for (const ex of bank) {
      if (used.has(ex.id)) continue;
      const primary = ex.muscles[0];
      if (input.focus === "full" && usedMuscles.has(primary) && usedMuscles.size < 6) continue;
      const exSets = exSetsFor(ex);
      const cost = itemSeconds(ex, exSets);
      if (circUsed + cost > circuitBudget + 45) continue;
      return { ex, exSets, cost };
    }
    return null;
  }

  // Scale the move cap with the session length so longer workouts actually fill
  // the time (the old fixed cap of 8 capped every plan at ~29 min).
  const maxCircuit = Math.min(16, Math.max(4, Math.round(input.minutes / 4)));

  // Fill the circuit. When the user has preferred moves, keep ~30-40% of the
  // circuit from the general/primary bank (a soft 60/40 split), the rest preferred.
  while (circUsed < circuitBudget && circuit.length < maxCircuit) {
    // Aim for ~40% general / ~60% preferred BY COUNT. Take preferred first, then
    // top up general whenever it's running below its target share of the circuit
    // so far. (The old ratio test forced the first pick to be general and skewed
    // the whole circuit toward general — the user's favorites were under-served.)
    const wantGeneral =
      preferredBank.length === 0 ||
      (generalBank.length > 0 && generalCount < Math.round((circuit.length + 1) * 0.4));
    let pick = nextFrom(wantGeneral ? generalBank : preferredBank);
    let pickedGeneral = wantGeneral;
    if (!pick) { pick = nextFrom(wantGeneral ? preferredBank : generalBank); pickedGeneral = !wantGeneral; }
    if (!pick) break;
    used.add(pick.ex.id);
    usedMuscles.add(pick.ex.muscles[0]);
    if (pickedGeneral) generalCount += 1;
    circuit.push(toItem(pick.ex, "circuit", pick.exSets));
    circUsed += pick.cost;
  }

  // Top up toward a 3-move minimum if we under-filled (short workout / small
  // pool), allowing muscle repeats — but still respect the time budget so a small
  // pool can't blow the target duration.
  if (circuit.length < 3) {
    for (const ex of ordered) {
      if (used.has(ex.id)) continue;
      const exSets = exSetsFor(ex);
      const cost = itemSeconds(ex, exSets);
      if (circuit.length >= 1 && circUsed + cost > circuitBudget + 45) continue;
      circuit.push(toItem(ex, "circuit", exSets));
      used.add(ex.id);
      circUsed += cost;
      if (circuit.length >= 4) break;
    }
  }

  // Long sessions can exhaust the unique-move pool before the time budget — cycle
  // back through the moves (never the same one twice in a row) to fill the rest.
  if (ordered.length > 0) {
    let guard = 0;
    let i = 0;
    while (circUsed < circuitBudget && circuit.length < maxCircuit && guard < ordered.length * 4) {
      guard += 1;
      const ex = ordered[i % ordered.length];
      i += 1;
      if (ex.id === circuit[circuit.length - 1]?.exerciseId) continue;
      const exSets = exSetsFor(ex);
      const cost = itemSeconds(ex, exSets);
      if (circUsed + cost > circuitBudget + 45) continue;
      circuit.push(toItem(ex, "circuit", exSets));
      circUsed += cost;
    }
  }

  // -------- Warmup & cooldown: matched to what the circuit trains --------
  const trained = new Set<MuscleGroup>(FOCUS_MUSCLES[input.focus]);
  for (const it of circuit) {
    const ex = getExercise(it.exerciseId);
    if (ex) ex.muscles.forEach((m) => trained.add(m));
  }
  // Higher score = more relevant. General movers (mobility/cardio/full-body)
  // get a small floor so there's always something to round out the phase.
  function relevance(ex: Exercise): number {
    let score = ex.muscles.reduce((n, m) => n + (trained.has(m) ? 1 : 0), 0);
    if (ex.muscles.some((m) => m === "mobility" || m === "cardio" || m === "fullbody")) score += 0.5;
    return score;
  }
  function pickPhase(phase: "warmup" | "cooldown", budget: number, fallbackDur: number, maxCount: number): PlanItem[] {
    const ranked = shuffle(
      EXERCISES.filter((e) => e.type === phase && equipConstraintOk(e, allowed, constraints) && !blocked.has(e.id)),
      rnd
    ).sort((a, b) => relevance(b) - relevance(a));
    const out: PlanItem[] = [];
    let spent = 0;
    for (const ex of ranked) {
      const cost = (ex.defaultDuration ?? fallbackDur) + 6;
      // Always take at least 1; otherwise stop before exceeding the phase budget
      // (the old "min 2" floor guaranteed an overshoot on short workouts).
      if (out.length >= 1 && spent + cost > budget) break;
      out.push(toItem(ex, phase, 1));
      spent += cost;
      if (out.length >= maxCount) break;
    }
    return out;
  }
  const warm = pickPhase("warmup", warmBudget, 40, 4);
  const cool = pickPhase("cooldown", coolBudget, 30, 4);

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

// Swap a single plan item (warmup, circuit, or cooldown) for another valid,
// not-already-used, non-blocked alternative of the same phase type. Warmups and
// cooldowns swap within the muscle-agnostic mobility pool (focus is ignored for
// them, mirroring how they're generated).
export function swapItem(plan: WorkoutPlan, index: number, blocked: string[] = []): WorkoutPlan {
  const target = plan.items[index];
  if (!target) return plan;
  const targetEx = getExercise(target.exerciseId);
  const allowed = allowedTiers(plan.equipment);
  const used = new Set(plan.items.map((i) => i.exerciseId));
  const blockedSet = new Set(blocked);
  const rnd = rng(plan.seed + index + Date.now());

  const candidates = shuffle(
    EXERCISES.filter((e) => {
      if (used.has(e.id) || blockedSet.has(e.id)) return false;
      if (target.phase === "warmup") return e.type === "warmup" && equipConstraintOk(e, allowed, plan.constraints);
      if (target.phase === "cooldown") return e.type === "cooldown" && equipConstraintOk(e, allowed, plan.constraints);
      if (!isValid(e, plan.focus, allowed, plan.constraints)) return false;
      // "Swap for a similar move" — keep the same kind (strength↔strength,
      // cardio↔cardio) so a leg lift isn't replaced by shadow-boxing.
      if (targetEx) return e.type === targetEx.type;
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

// Build a normalized plan item for a single library exercise (used when a user
// adds their own move to a plan via search).
export function planItemFor(exerciseId: string, phase: Phase): PlanItem | null {
  const ex = getExercise(exerciseId);
  if (!ex) return null;
  return toItem(ex, phase, ex.defaultSets);
}
