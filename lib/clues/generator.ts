// Deterministic puzzle generator. Strategy: pick a random ground-truth board,
// then GROW the clue set outward from one free reveal. At every step we hand the
// most-useful speaker a clue that is (a) true under the solution and (b) forces
// at least one new deduction given what's already known. Because every clue is
// added only when it makes forced progress, the finished puzzle is always
// solvable end-to-end by pure deduction — verified by the independent solver
// before it ships. Difficulty controls which clue kinds and regions are in play.

import type { Clue, Difficulty, Puzzle, Status, Suspect } from "./types";
import {
  SIZE, rowMembers, colMembers, neighbors, rowMembersByR, colMembersByC,
  colLetter, CORNERS, EDGE, between, commonNeighbors, rowOf, colOf,
} from "./grid";
import { propagate } from "./clues";
import { solve, solutionCount } from "./solver";
import { NAME_POOL, PROFESSIONS } from "./suspects";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "tricky"];

// --- seeded RNG (mulberry32) so a seed always yields the same puzzle ---
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function randomSolution(rand: () => number): Status[] {
  for (let attempt = 0; attempt < 60; attempt++) {
    const sol = Array.from({ length: SIZE }, () => (rand() < 0.5 ? "criminal" : "innocent") as Status);
    const crooks = sol.filter((s) => s === "criminal").length;
    if (crooks >= 7 && crooks <= 13) return sol;
  }
  return Array.from({ length: SIZE }, (_, i) => (i % 2 ? "criminal" : "innocent") as Status);
}

// 20 alphabetical names, each given a profession so professions cluster into
// groups of ~2–4 (which makes profession clues meaningful).
function castSuspects(rand: () => number): { suspects: Suspect[]; groups: Map<string, number[]> } {
  const names = shuffle(NAME_POOL, rand).slice(0, SIZE).sort((a, b) => a.localeCompare(b));
  const profs = shuffle(PROFESSIONS, rand).slice(0, 7); // 7 professions across 20 people
  const slots: number[] = [];
  for (let i = 0; i < SIZE; i++) slots.push(i % profs.length);
  const assigned = shuffle(slots, rand);
  const suspects: Suspect[] = names.map((name, i) => ({
    id: i,
    name,
    profession: profs[assigned[i]].title,
    avatar: profs[assigned[i]].emoji,
  }));
  const groups = new Map<string, number[]>();
  suspects.forEach((s) => {
    if (!groups.has(s.profession)) groups.set(s.profession, []);
    groups.get(s.profession)!.push(s.id);
  });
  return { suspects, groups };
}

interface Region { region: number[]; label: string; }

// Candidate regions a known `speaker` can truthfully describe, gated by tier.
function regionsFor(
  speaker: number, known: (Status | null)[], suspects: Suspect[],
  groups: Map<string, number[]>, difficulty: Difficulty, rand: () => number,
): Region[] {
  const out: Region[] = [];
  out.push({ region: rowMembers(speaker), label: "the people in my row" });
  out.push({ region: colMembers(speaker), label: "the people in my column" });
  out.push({ region: neighbors(speaker), label: "my neighbours" });

  if (difficulty !== "easy") {
    out.push({ region: CORNERS.slice(), label: "the four corners" });
    out.push({ region: EDGE.slice(), label: "the people on the edge" });
    // a couple of absolute rows / columns elsewhere on the board
    for (const r of shuffle([0, 1, 2, 3, 4], rand).slice(0, 2)) {
      if (r !== rowOf(speaker)) out.push({ region: rowMembersByR(r), label: `the people in row ${r + 1}` });
    }
    for (const c of shuffle([0, 1, 2, 3], rand).slice(0, 2)) {
      if (c !== colOf(speaker)) out.push({ region: colMembersByC(c), label: `the people in column ${colLetter(c)}` });
    }
    const mine = groups.get(suspects[speaker].profession);
    if (mine && mine.length >= 2) out.push({ region: mine.slice(), label: `the ${suspects[speaker].profession}s` });
  }

  if (difficulty === "hard" || difficulty === "tricky") {
    // any other profession group
    for (const [title, ids] of shuffle(Array.from(groups.entries()), rand)) {
      if (ids.length >= 2) { out.push({ region: ids.slice(), label: `the ${title}s` }); break; }
    }
    // between / common-neighbours anchored on another already-known suspect
    const knownOthers = shuffle(
      known.map((v, i) => (v !== null && i !== speaker ? i : -1)).filter((i) => i >= 0), rand,
    ).slice(0, 4);
    for (const a of knownOthers) {
      const btw = between(speaker, a);
      if (btw.length >= 1) out.push({ region: btw, label: `the people between me and ${suspects[a].name}` });
      const cn = commonNeighbors(speaker, a);
      if (cn.length >= 2) out.push({ region: cn, label: `the people ${suspects[a].name} and I both neighbour` });
    }
  }
  return out;
}

// Ordered candidate clues for a known speaker. Earlier = preferred for this
// tier; the caller takes the first one that forces new progress.
function candidateClues(
  speaker: number, solution: Status[], known: (Status | null)[], suspects: Suspect[],
  groups: Map<string, number[]>, difficulty: Difficulty, rand: () => number,
): Clue[] {
  const regions = regionsFor(speaker, known, suspects, groups, difficulty, rand);
  const unknown = shuffle(known.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0), rand);
  const crim = (r: number[]) => r.filter((i) => solution[i] === "criminal").length;

  const countExact: Clue[] = regions.map((rg) => ({
    kind: "count", speaker, region: rg.region, label: rg.label, op: "exactly", k: crim(rg.region),
  }));
  const countBounds: Clue[] = regions.flatMap((rg) => {
    const k = crim(rg.region);
    const cl: Clue[] = [];
    if (k >= 1) cl.push({ kind: "count", speaker, region: rg.region, label: rg.label, op: "atleast", k });
    if (k <= rg.region.length - 1) cl.push({ kind: "count", speaker, region: rg.region, label: rg.label, op: "atmost", k });
    return cl;
  });
  const parity: Clue[] = regions
    .filter((rg) => rg.region.length >= 2)
    .map((rg) => ({ kind: "parity", speaker, region: rg.region, label: rg.label, even: crim(rg.region) % 2 === 0 }));
  const relation: Clue[] = unknown.map((t) => ({
    kind: "relation", speaker, a: speaker, b: t, same: solution[speaker] === solution[t],
  }));
  const cond: Clue[] = unknown.flatMap((t) => {
    const anchors = [speaker, ...known.map((v, i) => (v !== null ? i : -1)).filter((i) => i >= 0 && i !== t)].slice(0, 3);
    return anchors.map((a) => ({
      kind: "cond" as const, speaker, a, aStatus: solution[a], b: t, bStatus: solution[t],
    }));
  });
  const direct: Clue[] = unknown.map((t) => ({ kind: "direct", speaker, target: t, status: solution[t] }));

  switch (difficulty) {
    case "easy":   return [...countExact, ...relation, ...direct];
    case "medium": return [...countExact, ...cond, ...relation, ...direct];
    case "hard":   return [...parity, ...countBounds, ...cond, ...countExact, ...relation, ...direct];
    case "tricky": return [...parity, ...cond, ...countBounds, ...countExact, ...relation, ...direct];
  }
}

const forcesProgress = (clue: Clue, known: (Status | null)[]) =>
  propagate(clue, known).some((f) => known[f.index] === null);

const withStart = (start: number, status: Status): (Status | null)[] => {
  const k: (Status | null)[] = new Array(SIZE).fill(null);
  k[start] = status;
  return k;
};

// A truthful, non-load-bearing clue for any speaker the growth phase never
// needed. Leans on the showier kinds (compare, parity) so boards feel varied.
function flavourClue(
  speaker: number, solution: Status[], suspects: Suspect[],
  groups: Map<string, number[]>, difficulty: Difficulty, rand: () => number,
): Clue {
  const crim = (r: number[]) => r.filter((i) => solution[i] === "criminal").length;
  if (difficulty !== "easy" && rand() < 0.5) {
    // a "more criminals in A than B" comparison, if we can find a true one
    const regs = regionsFor(speaker, new Array(SIZE).fill("innocent"), suspects, groups, difficulty, rand);
    const pairs = shuffle(regs, rand);
    for (let i = 0; i < pairs.length; i++) {
      for (let j = 0; j < pairs.length; j++) {
        if (i === j) continue;
        if (crim(pairs[i].region) > crim(pairs[j].region)) {
          return {
            kind: "compare", speaker,
            regionA: pairs[i].region, labelA: pairs[i].label,
            regionB: pairs[j].region, labelB: pairs[j].label,
          };
        }
      }
    }
  }
  const region = rand() < 0.5 ? rowMembers(speaker) : colMembers(speaker);
  return { kind: "count", speaker, region, label: rand() < 0.5 ? "the people in my row" : "the people in my column", op: "exactly", k: crim(region) };
}

function build(seed: number, difficulty: Difficulty): Puzzle {
  const rand = rng(seed);
  const solution = randomSolution(rand);
  const { suspects, groups } = castSuspects(rand);

  const start = Math.floor(rand() * SIZE);
  const clues: Clue[] = new Array(SIZE);
  const known: (Status | null)[] = new Array(SIZE).fill(null);
  known[start] = solution[start];

  for (let guard = 0; guard < SIZE * 4 && known.some((v) => v === null); guard++) {
    const speakers = shuffle(
      Array.from({ length: SIZE }, (_, i) => i).filter((i) => known[i] !== null && clues[i] === undefined),
      rand,
    );
    if (speakers.length === 0) break;

    let assigned = false;
    for (const s of speakers) {
      const pick = candidateClues(s, solution, known, suspects, groups, difficulty, rand)
        .find((c) => forcesProgress(c, known));
      if (!pick) continue;
      clues[s] = pick;
      const res = solve(clues, withStart(start, solution[start]));
      for (let i = 0; i < SIZE; i++) known[i] = res.known[i];
      assigned = true;
      break;
    }
    if (!assigned) break;
  }

  for (let i = 0; i < SIZE; i++) {
    if (clues[i] === undefined) clues[i] = flavourClue(i, solution, suspects, groups, difficulty, rand);
  }

  return { suspects, solution, clues, start, seed, difficulty };
}

// Guaranteed-solvable fallback: a pure chain of direct reveals.
function buildFallback(seed: number, difficulty: Difficulty): Puzzle {
  const rand = rng(seed ^ 0x9e3779b9);
  const solution = randomSolution(rand);
  const { suspects, groups } = castSuspects(rand);
  const order = shuffle(Array.from({ length: SIZE }, (_, i) => i), rand);
  const clues: Clue[] = new Array(SIZE);
  for (let i = 0; i < SIZE - 1; i++) {
    const t = order[i + 1];
    clues[order[i]] = { kind: "direct", speaker: order[i], target: t, status: solution[t] };
  }
  clues[order[SIZE - 1]] = flavourClue(order[SIZE - 1], solution, suspects, groups, difficulty, rand);
  return { suspects, solution, clues, start: order[0], seed, difficulty };
}

// Weak one-directional clues (parity, conditionals) make trickier boards rarely
// globally unique on the first try, so give those tiers more attempts. Each
// build is ~1ms, so even 90 attempts is cheap for an on-demand single puzzle.
const ATTEMPTS: Record<Difficulty, number> = { easy: 24, medium: 28, hard: 40, tricky: 90 };

// Build a puzzle for `seed`+`difficulty`, accepting only boards that are both
// forced-solvable (no guessing, in reveal order) AND globally unique (the clue
// set pins exactly one board on its own). Falls back to an always-unique direct
// chain if no candidate qualifies.
export function generatePuzzle(seed: number, difficulty: Difficulty = "medium"): Puzzle {
  for (let i = 0; i < ATTEMPTS[difficulty]; i++) {
    const puzzle = build((seed + i * 0x1000193) >>> 0, difficulty);
    const res = solve(puzzle.clues, withStart(puzzle.start, puzzle.solution[puzzle.start]));
    if (res.solvedAll && !res.contradiction && solutionCount(puzzle.clues, 2) === 1) {
      return { ...puzzle, seed };
    }
  }
  return { ...buildFallback(seed, difficulty), seed };
}

// --- seeds -------------------------------------------------------------------

// YYYYMMDD as a seed gives everyone the same "daily" board.
export function dailySeed(d = new Date()): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

// Puzzles ramp through the week (Mon easy ... Sun tricky), like the source game.
export function dailyDifficulty(d = new Date()): Difficulty {
  // getDay: 0=Sun..6=Sat -> map to a Mon-anchored ramp
  const ramp: Difficulty[] = ["tricky", "easy", "easy", "medium", "medium", "hard", "hard"];
  return ramp[d.getDay()];
}

// A stable seed for practice puzzle #n at a given difficulty.
export function practiceSeed(difficulty: Difficulty, n: number): number {
  const di = DIFFICULTIES.indexOf(difficulty) + 1;
  return ((di * 0x9e3779b1) ^ Math.imul(n, 0x85ebca77)) >>> 0;
}

export { DIFFICULTIES };
