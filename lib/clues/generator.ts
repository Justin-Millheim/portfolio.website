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
import { solve, solutionCount, solveAtDepth, solveProfile } from "./solver";
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
  out.push({ region: rowMembers(speaker), label: "my row" });
  out.push({ region: colMembers(speaker), label: "my column" });
  out.push({ region: neighbors(speaker), label: "my neighbours" });

  if (difficulty !== "easy") {
    out.push({ region: CORNERS.slice(), label: "the corners" });
    out.push({ region: EDGE.slice(), label: "the edge" });
    // a couple of absolute rows / columns elsewhere on the board
    for (const r of shuffle([0, 1, 2, 3, 4], rand).slice(0, 2)) {
      if (r !== rowOf(speaker)) out.push({ region: rowMembersByR(r), label: `row ${r + 1}` });
    }
    for (const c of shuffle([0, 1, 2, 3], rand).slice(0, 2)) {
      if (c !== colOf(speaker)) out.push({ region: colMembersByC(c), label: `column ${colLetter(c)}` });
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
      if (btw.length >= 1) out.push({ region: btw, label: `between me and ${suspects[a].name}` });
      const cn = commonNeighbors(speaker, a);
      if (cn.length >= 2) out.push({ region: cn, label: `${suspects[a].name}'s & my shared neighbours` });
    }
  }
  return out;
}

const criminalNeighbours = (p: number, solution: Status[]) =>
  neighbors(p).filter((i) => solution[i] === "criminal").length;

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

  // MORE-NEIGHBOURS — pairwise: x has strictly more criminal neighbours than y
  const cand = shuffle(Array.from({ length: SIZE }, (_, i) => i), rand);
  let added = 0;
  for (const x of cand) {
    for (const y of cand) {
      if (x !== y && criminalNeighbours(x, solution) > criminalNeighbours(y, solution)) {
        out.push({ kind: "nbmore", speaker, x, y }); added++; break;
      }
    }
    if (added >= 3) break;
  }

  return shuffle(out, rand);
}

// A true pairwise "more criminal neighbours" clue, or null if none differs.
function nbmoreClue(speaker: number, solution: Status[], rand: () => number): Clue | null {
  const cand = shuffle(Array.from({ length: SIZE }, (_, i) => i), rand);
  for (const x of cand) for (const y of cand) {
    if (x !== y && criminalNeighbours(x, solution) > criminalNeighbours(y, solution)) {
      return { kind: "nbmore", speaker, x, y };
    }
  }
  return null;
}

// A non-trivial conditional between two OTHER suspects (never the speaker), so it
// only pays off once one side is deduced via another clue — exactly the
// "in conjunction with another clue" case. True under the solution.
function conditionalClue(speaker: number, solution: Status[], rand: () => number): Clue | null {
  const others = shuffle(Array.from({ length: SIZE }, (_, i) => i).filter((i) => i !== speaker), rand);
  for (const a of others) for (const b of others) {
    if (a !== b) return { kind: "cond", speaker, a, aStatus: solution[a], b, bStatus: solution[b] };
  }
  return null;
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

  // exact counts; "all"/"none" of a region are giveaways, kept separate as a
  // last-resort bootstrap opener (capped to one per board downstream).
  const countExact: Clue[] = regions
    .filter((rg) => { const k = crim(rg.region); return k > 0 && k < rg.region.length; })
    .map((rg) => ({
      kind: "count" as const, speaker, region: rg.region, label: rg.label, op: "exactly" as const, k: crim(rg.region),
    }));
  const countSat: Clue[] = regions
    .filter((rg) => { const k = crim(rg.region); return rg.region.length >= 2 && (k === 0 || k === rg.region.length); })
    .map((rg) => ({
      kind: "count" as const, speaker, region: rg.region, label: rg.label, op: "exactly" as const, k: crim(rg.region),
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
  // same/opposite verdict and direct reveal: easy/medium only, and capped to one
  // each per board downstream. Never offered on hard/tricky.
  const softTells = difficulty === "easy" || difficulty === "medium";
  const relation: Clue[] = softTells ? unknown.map((t) => ({
    kind: "relation" as const, speaker, a: speaker, b: t, same: solution[speaker] === solution[t],
  })) : [];
  const direct: Clue[] = softTells ? unknown.map((t) => ({
    kind: "direct" as const, speaker, target: t, status: solution[t],
  })) : [];

  const special = difficulty === "hard" || difficulty === "tricky"
    ? specialCandidates(speaker, solution, known, rand) : [];

  // Indirect clues (counts, parity, specials) carry the spine; conditionals are
  // never spine clues (they're injected as flavour). relation/direct/saturated
  // counts are bootstrap-only last resorts the minimiser then strips back out.
  switch (difficulty) {
    case "easy":   return [...countExact, ...parity, ...countBounds, ...relation, ...direct, ...countSat];
    case "medium": return [...countExact, ...parity, ...countBounds, ...relation, ...direct, ...countSat];
    case "hard":   return [...special, ...parity, ...countBounds, ...countExact, ...countSat];
    case "tricky": return [...special, ...parity, ...countBounds, ...countExact, ...countSat];
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

  // hard/tricky: sometimes show off a connected / more-neighbours / share clue
  if ((difficulty === "hard" || difficulty === "tricky") && rand() < 0.6) {
    const specials: Clue[] = [];
    const nb = nbmoreClue(speaker, solution, rand);
    if (nb) specials.push(nb);
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
  // a true count, but never saturated (all/none) — pick the row/column whose
  // criminal count is interior, else fall back to a loose "at least" bound.
  for (const [region, label] of shuffle([
    [rowMembers(speaker), "my row"], [colMembers(speaker), "my column"],
  ] as [number[], string][], rand)) {
    const k = crim(region);
    if (k > 0 && k < region.length) return { kind: "count", speaker, region, label, op: "exactly", k };
  }
  const region = rowMembers(speaker);
  const n = region.length;
  const k = crim(region);
  return k === 0
    ? { kind: "count", speaker, region, label: "my row", op: "atmost", k: 1 }
    : { kind: "count", speaker, region, label: "my row", op: "atleast", k: Math.min(k, n - 1) };
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

    // keep the base within the approved clue policy as it grows, so the
    // minimiser and the final gate rarely have to reject it.
    const tellCap = difficulty === "easy" || difficulty === "medium" ? 1 : 0;
    const has = (pred: (c: Clue) => boolean) => clues.filter((c) => c !== undefined && pred(c)).length;
    const withinBudget = (c: Clue) => {
      if (c.kind === "direct") return has((x) => x.kind === "direct") < tellCap;
      if (c.kind === "relation") return has((x) => x.kind === "relation") < tellCap;
      if (c.kind === "count" && (c.k === 0 || c.k === c.region.length)) {
        return has((x) => x.kind === "count" && (x.k === 0 || x.k === x.region.length)) < 1;
      }
      return true;
    };

    let assigned = false;
    for (const s of speakers) {
      const pick = candidateClues(s, solution, known, suspects, groups, difficulty, rand)
        .find((c) => withinBudget(c) && forcesProgress(c, known));
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

// A spread of true, low-information clues used to strip a board's spoon-feeding.
// Returns several flavours (comparison, parity, a loose bound) so a minimised
// board doesn't end up wall-to-wall "more criminals in A than B".
function looseFlavours(speaker: number, solution: Status[], rand: () => number): Clue[] {
  const crim = (r: number[]) => r.filter((i) => solution[i] === "criminal").length;
  const regs: { region: number[]; label: string }[] = [];
  for (let r = 0; r < 5; r++) regs.push({ region: rowMembersByR(r), label: `row ${r + 1}` });
  for (let c = 0; c < 4; c++) regs.push({ region: colMembersByC(c), label: `column ${colLetter(c)}` });
  regs.push({ region: EDGE.slice(), label: "the edge" });
  regs.push({ region: CORNERS.slice(), label: "the corners" });
  const shuffled = shuffle(regs, rand);
  const out: Clue[] = [];

  for (const A of shuffled) for (const B of shuffled) {
    if (A !== B && crim(A.region) > crim(B.region)) {
      out.push({ kind: "compare", speaker, regionA: A.region, labelA: A.label, regionB: B.region, labelB: B.label });
      break;
    }
  }
  const r1 = shuffled[0];
  out.push({ kind: "parity", speaker, region: r1.region, label: r1.label, even: crim(r1.region) % 2 === 0 });
  const r2 = shuffled[1];
  const k2 = crim(r2.region);
  if (k2 >= 1) out.push({ kind: "count", speaker, region: r2.region, label: r2.label, op: "atleast", k: k2 });
  const nb = nbmoreClue(speaker, solution, rand);
  if (nb) out.push(nb);
  const cnd = conditionalClue(speaker, solution, rand);
  if (cnd) out.push(cnd);
  return shuffle(out, rand);
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
    default:
      // relation / direct / cond are one-step tells: don't weaken them into
      // other tells. The minimiser replaces them via looseFlavour instead.
      break;
  }
  return out;
}

// How hard each tier may get for a no-guess player (the minimiser keeps boards
// solvable within this depth) and how much genuine reasoning it must demand.
// `need1` = min suspects whose verdict needs >=1 hypothetical; `need2` = min that
// need nested (depth-2) reasoning. These thresholds make even "easy" stop
// spoon-feeding, and separate the tiers.
interface Spec { cap: number; need1: number; need2: number; maxTells: number; }
const SPEC: Record<Difficulty, Spec> = {
  easy:   { cap: 1, need1: 6,  need2: 0, maxTells: 4 },
  medium: { cap: 2, need1: 10, need2: 2, maxTells: 3 },
  hard:   { cap: 2, need1: 13, need2: 5, maxTells: 2 },
  tricky: { cap: 2, need1: 15, need2: 8, maxTells: 2 },
};
const ATTEMPTS: Record<Difficulty, number> = { easy: 30, medium: 36, hard: 44, tricky: 56 };

// A "tell" is a one-step giveaway: a direct reveal or a clue anchored on the
// (already-known) speaker. We allow only a handful, mostly to bootstrap.
function tellCount(clues: Clue[]): number {
  return clues.filter((c) =>
    c.kind === "direct" ||
    (c.kind === "relation" && c.a === c.speaker) ||
    (c.kind === "cond" && c.a === c.speaker),
  ).length;
}

const profOK = (perDepth: number[], spec: Spec) =>
  perDepth[1] + perDepth[2] >= spec.need1 && perDepth[2] >= spec.need2;

// The approved clue policy: direct reveals and same/opposite relations are
// easy/medium-only and capped at one each; conditionals at most two; saturated
// "all/none" counts at most one (a bootstrap opener); "the most" never appears.
function policyOK(clues: Clue[], difficulty: Difficulty): boolean {
  let direct = 0, relation = 0, cond = 0, sat = 0;
  for (const c of clues) {
    if (c === undefined) continue;
    if (c.kind === "direct") direct++;
    else if (c.kind === "relation") relation++;
    else if (c.kind === "cond") cond++;
    else if (c.kind === "most") return false;
    else if (c.kind === "count" && (c.k === 0 || c.k === c.region.length)) sat++;
  }
  const tellCap = difficulty === "easy" || difficulty === "medium" ? 1 : 0;
  return direct <= tellCap && relation <= tellCap && cond <= 2 && sat <= 1;
}

// Greedily replace each clue with the loosest variant that keeps the board
// globally unique and solvable within the tier's depth — stopping as soon as the
// tier's reasoning bar is met. The accept-check uses a single-depth solve (cheap);
// the full profile is only recomputed after an accepted weakening (for early
// stop). Honours `deadline` so generation latency stays bounded.
function minimize(
  clues: Clue[], solution: Status[], start: number, spec: Spec, difficulty: Difficulty,
  rand: () => number, deadline: number,
): { clues: Clue[]; perDepth: number[] } {
  const cur = clues.slice();
  const ss = solution[start];
  let prof = solveProfile(cur, start, ss, 2).perDepth;

  for (const s of shuffle(Array.from({ length: SIZE }, (_, i) => i), rand)) {
    if (Date.now() > deadline) break;
    if (profOK(prof, spec) && tellCount(cur) <= spec.maxTells) break;
    const opts = [...looseFlavours(s, solution, rand), ...weakenings(cur[s], solution)];
    for (const w of opts) {
      const trial = cur.slice(); trial[s] = w;
      if (!policyOK(trial, difficulty)) continue;            // keep within the approved clue mix
      if (solutionCount(trial, 2) !== 1) continue;
      if (!solveAtDepth(trial, start, ss, spec.cap).solved) continue; // stays within tier depth
      cur[s] = w;
      prof = solveProfile(cur, start, ss, 2).perDepth;
      break;
    }
  }
  return { clues: cur, perDepth: prof };
}

// Build a uniquely-solvable board, strip it of giveaways, and accept it only if
// it's globally unique and demands the tier's amount of real deduction. A wall-
// clock budget bounds latency: if no attempt fully clears the bar in time, the
// most-demanding near-miss is returned.
const BUDGET_MS = 1100;
export function generatePuzzle(seed: number, difficulty: Difficulty = "medium"): Puzzle {
  const spec = SPEC[difficulty];
  const deadline = Date.now() + BUDGET_MS;
  let fallback: Puzzle | null = null;
  let fallbackScore = -1;

  for (let i = 0; i < ATTEMPTS[difficulty] && Date.now() < deadline; i++) {
    const s32 = (seed + i * 0x1000193) >>> 0;
    const rand = rng(s32);
    const base = build(s32, difficulty);
    const res = solve(base.clues, withStart(base.start, base.solution[base.start]));
    if (!res.solvedAll || res.contradiction || solutionCount(base.clues, 2) !== 1) continue;

    const { clues, perDepth } = minimize(base.clues, base.solution, base.start, spec, difficulty, rand, deadline);
    if (solutionCount(clues, 2) !== 1 || !policyOK(clues, difficulty)) continue;

    const tells = tellCount(clues);
    if (profOK(perDepth, spec) && tells <= spec.maxTells) return { ...base, clues, seed };

    const score = perDepth[1] + perDepth[2] * 2 - Math.max(0, tells - spec.maxTells) * 3;
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
