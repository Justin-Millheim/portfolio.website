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
import { propagate, evalClue } from "./clues";
import { solve, solutionCount, solveAtDepth, requiredDepth } from "./solver";
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

const criminalNeighbours = (p: number, solution: Status[]) =>
  neighbors(p).filter((i) => solution[i] === "criminal").length;

// The suspect who *uniquely* has the most criminal neighbours, or -1 on a tie.
function topNeighbourCrook(solution: Status[]): number {
  let best = -1; let who = -1; let tie = false;
  for (let p = 0; p < SIZE; p++) {
    const f = criminalNeighbours(p, solution);
    if (f > best) { best = f; who = p; tie = false; }
    else if (f === best) tie = true;
  }
  return tie || best < 1 ? -1 : who;
}

// Showpiece clues (share / connected / the-most), built only when true under the
// solution. Placed first in the hard/tricky order so they become load-bearing
// whenever the board state lets them force a deduction.
function specialCandidates(
  speaker: number, solution: Status[], known: (Status | null)[], rand: () => number,
): Clue[] {
  const out: Clue[] = [];
  const crim = (r: number[]) => r.filter((i) => solution[i] === "criminal").length;

  // SHARE — parity of criminal common-neighbours with an already-known suspect
  const others = shuffle(
    known.map((v, i) => (v !== null && i !== speaker ? i : -1)).filter((i) => i >= 0), rand,
  ).slice(0, 4);
  for (const b of others) {
    const region = commonNeighbors(speaker, b);
    if (region.length >= 2) out.push({ kind: "share", speaker, a: speaker, b, region, even: crim(region) % 2 === 0 });
  }

  // CONNECTED — a row/column whose criminals are contiguous (>= 2 of them)
  const lines: { region: number[]; label: string }[] = [
    { region: rowMembers(speaker), label: "my row" },
    { region: colMembers(speaker), label: "my column" },
  ];
  for (const r of shuffle([0, 1, 2, 3, 4], rand).slice(0, 2)) lines.push({ region: rowMembersByR(r), label: `row ${r + 1}` });
  for (const c of shuffle([0, 1, 2, 3], rand).slice(0, 2)) lines.push({ region: colMembersByC(c), label: `column ${colLetter(c)}` });
  for (const ln of lines) {
    const cl: Clue = { kind: "connected", speaker, region: ln.region, label: ln.label };
    if (crim(ln.region) >= 2 && evalClue(cl, solution)) out.push(cl);
  }

  // THE MOST — whoever uniquely tops the board on criminal neighbours
  const who = topNeighbourCrook(solution);
  if (who >= 0) out.push({ kind: "most", speaker, who });

  return shuffle(out, rand);
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

  const special = difficulty === "hard" || difficulty === "tricky"
    ? specialCandidates(speaker, solution, known, rand) : [];

  switch (difficulty) {
    case "easy":   return [...countExact, ...relation, ...direct];
    case "medium": return [...countExact, ...cond, ...relation, ...direct];
    case "hard":   return [...special, ...parity, ...countBounds, ...cond, ...countExact, ...relation, ...direct];
    case "tricky": return [...special, ...parity, ...cond, ...countBounds, ...countExact, ...relation, ...direct];
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

  // hard/tricky: sometimes show off a connected / most / share clue
  if ((difficulty === "hard" || difficulty === "tricky") && rand() < 0.55) {
    const specials: Clue[] = [];
    const who = topNeighbourCrook(solution);
    if (who >= 0) specials.push({ kind: "most", speaker, who });
    for (const ln of [
      { region: rowMembers(speaker), label: "my row" },
      { region: colMembers(speaker), label: "my column" },
    ]) {
      const cl: Clue = { kind: "connected", speaker, region: ln.region, label: ln.label };
      if (crim(ln.region) >= 2 && evalClue(cl, solution)) specials.push(cl);
    }
    const partner = shuffle(Array.from({ length: SIZE }, (_, i) => i).filter((i) => i !== speaker), rand)
      .find((i) => commonNeighbors(speaker, i).length >= 2);
    if (partner !== undefined) {
      const region = commonNeighbors(speaker, partner);
      specials.push({ kind: "share", speaker, a: speaker, b: partner, region, even: crim(region) % 2 === 0 });
    }
    if (specials.length) return shuffle(specials, rand)[0];
  }

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

// A true, low-information clue used to strip a board's spoon-feeding: a "more
// criminals in A than B" comparison (rarely pins a cell by itself, but bites
// under contradiction reasoning), falling back to a parity over a big region.
function looseFlavour(speaker: number, solution: Status[], rand: () => number): Clue {
  const crim = (r: number[]) => r.filter((i) => solution[i] === "criminal").length;
  const regs: { region: number[]; label: string }[] = [];
  for (let r = 0; r < 5; r++) regs.push({ region: rowMembersByR(r), label: `the people in row ${r + 1}` });
  for (let c = 0; c < 4; c++) regs.push({ region: colMembersByC(c), label: `the people in column ${colLetter(c)}` });
  regs.push({ region: EDGE.slice(), label: "the people on the edge" });
  const shuffled = shuffle(regs, rand);
  for (const A of shuffled) for (const B of shuffled) {
    if (A === B) continue;
    if (crim(A.region) > crim(B.region)) {
      return { kind: "compare", speaker, regionA: A.region, labelA: A.label, regionB: B.region, labelB: B.label };
    }
  }
  const big = shuffled[0];
  return { kind: "parity", speaker, region: big.region, label: big.label, even: crim(big.region) % 2 === 0 };
}

// Strictly weaker, still-true variants of a clue (looser bounds, one-directional
// conditionals, parity in place of an exact count). Feeding these to the
// minimiser is how a spoon-feeding board becomes one you must reason through.
function weakenings(clue: Clue, solution: Status[]): Clue[] {
  const crim = (r: number[]) => r.filter((i) => solution[i] === "criminal").length;
  const out: Clue[] = [];
  const sp = clue.speaker;
  switch (clue.kind) {
    case "count": {
      const n = clue.region.length;
      const k = crim(clue.region);
      if (clue.op !== "atleast" && k >= 1) out.push({ kind: "count", speaker: sp, region: clue.region, label: clue.label, op: "atleast", k });
      if (clue.op !== "atmost" && k <= n - 1) out.push({ kind: "count", speaker: sp, region: clue.region, label: clue.label, op: "atmost", k });
      if (clue.op === "atleast" && clue.k > 1) out.push({ ...clue, k: clue.k - 1 });
      if (clue.op === "atmost" && clue.k < n - 1) out.push({ ...clue, k: clue.k + 1 });
      out.push({ kind: "parity", speaker: sp, region: clue.region, label: clue.label, even: k % 2 === 0 });
      break;
    }
    case "relation": {
      const aS = solution[clue.a]; const bS = solution[clue.b];
      out.push({ kind: "cond", speaker: sp, a: clue.a, aStatus: aS, b: clue.b, bStatus: bS });
      out.push({ kind: "cond", speaker: sp, a: clue.b, aStatus: bS, b: clue.a, bStatus: aS });
      break;
    }
    case "direct":
      out.push({ kind: "cond", speaker: sp, a: clue.target, aStatus: clue.status, b: clue.target, bStatus: clue.status });
      break;
    default:
      break; // parity / share / connected / most / compare are already weak
  }
  return out;
}

// Greedily replace each clue with the loosest variant that keeps the board both
// globally unique AND solvable within `capDepth` (so a capDepth-deep player
// never has to guess). Stripping this redundancy is what forces real deduction.
function minimize(
  clues: Clue[], solution: Status[], start: number, capDepth: number, rand: () => number,
): Clue[] {
  const cur = clues.slice();
  const ss = solution[start];
  for (let pass = 0; pass < 2; pass++) {
    let improved = false;
    for (const s of shuffle(Array.from({ length: SIZE }, (_, i) => i), rand)) {
      const opts = [looseFlavour(s, solution, rand), ...weakenings(cur[s], solution)];
      for (const w of opts) {
        const trial = cur.slice(); trial[s] = w;
        if (solutionCount(trial, 2) !== 1) continue;
        if (requiredDepth(trial, start, ss, capDepth) > capDepth) continue;
        cur[s] = w; improved = true; break;
      }
    }
    if (!improved) break;
  }
  return cur;
}

// Required reasoning depth per tier. easy still solves on plain propagation, but
// stripped of giveaways; medium needs one hypothetical, hard/tricky need nested
// contradiction reasoning (tricky pervasively so).
const TARGET: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2, tricky: 2 };
const ATTEMPTS: Record<Difficulty, number> = { easy: 16, medium: 20, hard: 26, tricky: 34 };

// Build a uniquely-solvable board, then strip it down to its target difficulty.
// Accepts only boards that are globally unique, solvable at the tier's depth,
// and NOT solvable below it (so the difficulty is genuinely required). Keeps the
// hardest near-miss as a fallback.
export function generatePuzzle(seed: number, difficulty: Difficulty = "medium"): Puzzle {
  const target = TARGET[difficulty];
  let fallback: Puzzle | null = null;
  let fallbackScore = -1;

  for (let i = 0; i < ATTEMPTS[difficulty]; i++) {
    const rand = rng((seed + i * 0x1000193) >>> 0);
    const base = build((seed + i * 0x1000193) >>> 0, difficulty);
    const res = solve(base.clues, withStart(base.start, base.solution[base.start]));
    if (!res.solvedAll || res.contradiction || solutionCount(base.clues, 2) !== 1) continue;

    const ss = base.solution[base.start];
    const clues = minimize(base.clues, base.solution, base.start, target, rand);
    if (solutionCount(clues, 2) !== 1) continue;

    const solvesAtTarget = solveAtDepth(clues, base.start, ss, target).solved;
    if (!solvesAtTarget) continue;
    const tooEasy = target > 0 && solveAtDepth(clues, base.start, ss, target - 1).solved;

    // tricky must need depth-2 across much of the board, not in just one spot
    let pervasiveEnough = true;
    if (difficulty === "tricky") {
      pervasiveEnough = solveAtDepth(clues, base.start, ss, 1).known.filter((v) => v === null).length >= 6;
    }

    if (!tooEasy && pervasiveEnough) {
      return { ...base, clues, seed };
    }
    // score near-misses by how much reasoning they still demand
    const score = solveAtDepth(clues, base.start, ss, Math.max(0, target - 1)).known.filter((v) => v === null).length;
    if (score > fallbackScore) { fallbackScore = score; fallback = { ...base, clues, seed }; }
  }

  return fallback ?? { ...buildFallback(seed, difficulty), seed };
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
