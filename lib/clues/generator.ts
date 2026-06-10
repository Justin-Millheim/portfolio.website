// Deterministic puzzle generator. Strategy: pick a random ground-truth board,
// then GROW the clue set outward from one free reveal. At every step we hand the
// most-useful speaker a clue that is (a) true under the solution and (b) forces
// at least one new deduction given what's already known. Because every clue is
// added only when it makes forced progress, the finished puzzle is always
// solvable end-to-end by pure deduction — verified by the independent solver
// before it ships.

import type { Clue, Puzzle, Status, Suspect } from "./types";
import { SIZE, rowMembers, colMembers, neighbors, CORNERS } from "./grid";
import { propagate } from "./clues";
import { solve } from "./solver";
import { SUSPECT_POOL } from "./suspects";

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
  // Reroll until the criminal count sits in a balanced, interesting band.
  for (let attempt = 0; attempt < 50; attempt++) {
    const sol = Array.from({ length: SIZE }, () => (rand() < 0.5 ? "criminal" : "innocent") as Status);
    const crooks = sol.filter((s) => s === "criminal").length;
    if (crooks >= 7 && crooks <= 13) return sol;
  }
  return Array.from({ length: SIZE }, (_, i) => (i % 2 ? "criminal" : "innocent") as Status);
}

function regionLabel(speaker: number, region: "row" | "col" | "neighbors"): { label: string; members: number[] } {
  if (region === "row") return { label: "the people in my row", members: rowMembers(speaker) };
  if (region === "col") return { label: "the people in my column", members: colMembers(speaker) };
  return { label: "my neighbours", members: neighbors(speaker) };
}

// Build the candidate clues a known `speaker` could truthfully say, ordered so
// that varied, region-flavoured clues are tried before blunt direct ones.
function candidateClues(
  speaker: number,
  solution: Status[],
  known: (Status | null)[],
  rand: () => number,
): Clue[] {
  const out: Clue[] = [];
  const unknown = known.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0);

  // 1. Region counts (exact truth about my row / column / neighbours).
  for (const region of shuffle(["row", "col", "neighbors"] as const, rand)) {
    const { label, members } = regionLabel(speaker, region);
    if (members.length === 0) continue;
    const k = members.filter((i) => solution[i] === "criminal").length;
    out.push({ kind: "count", speaker, region: members, label, op: "exactly", k });
  }
  // A "corners" clue, occasionally, for board-wide flavour.
  {
    const k = CORNERS.filter((i) => solution[i] === "criminal").length;
    out.push({ kind: "count", speaker, region: CORNERS.slice(), label: "the four corner suspects", op: "exactly", k });
  }

  // 2. Relational + conditional clues anchored on the (known) speaker or another
  //    known cell, each true by construction, pointed at a still-unknown target.
  for (const t of shuffle(unknown, rand)) {
    const same = solution[speaker] === solution[t];
    out.push({ kind: "relation", speaker, a: speaker, b: t, same });
    // "If <known cell> is <its verdict>, then <t> is <t's verdict>" — fires now.
    out.push({
      kind: "cond",
      speaker,
      a: speaker,
      aStatus: solution[speaker],
      b: t,
      bStatus: solution[t],
    });
  }

  // 3. Direct reveal — the always-works fallback.
  for (const t of shuffle(unknown, rand)) {
    out.push({ kind: "direct", speaker, target: t, status: solution[t] });
  }

  return out;
}

function forcesProgress(clue: Clue, known: (Status | null)[]): boolean {
  return propagate(clue, known).some((f) => known[f.index] === null);
}

// A truthful clue for a suspect whose verdict is already settled, used to fill
// any speaker the growth phase never needed. Pure flavour, never load-bearing.
function flavourClue(speaker: number, solution: Status[], rand: () => number): Clue {
  const choice = shuffle(["row", "col", "neighbors"] as const, rand)[0];
  const { label, members } = regionLabel(speaker, choice);
  if (members.length >= 2) {
    const k = members.filter((i) => solution[i] === "criminal").length;
    return { kind: "count", speaker, region: members, label, op: "exactly", k };
  }
  // tiny region (corner neighbour): fall back to a relation about a random other
  const other = shuffle(
    Array.from({ length: SIZE }, (_, i) => i).filter((i) => i !== speaker),
    rand,
  )[0];
  return { kind: "relation", speaker, a: speaker, b: other, same: solution[speaker] === solution[other] };
}

function build(seed: number): Puzzle {
  const rand = rng(seed);
  const solution = randomSolution(rand);
  const pool = shuffle(SUSPECT_POOL, rand).slice(0, SIZE);
  const suspects: Suspect[] = pool.map((s, i) => ({ id: i, name: s.name, avatar: s.avatar }));

  const start = Math.floor(rand() * SIZE);
  const clues: Clue[] = new Array(SIZE);
  const known: (Status | null)[] = new Array(SIZE).fill(null);
  known[start] = solution[start];

  // Growth loop: assign one forcing clue per pass to a known, clue-less speaker,
  // then re-propagate everything so cascades count. Terminates because each pass
  // either reveals a new cell or we fall through to a direct clue that does.
  for (let guard = 0; guard < SIZE * 4 && known.some((v) => v === null); guard++) {
    const speakers = shuffle(
      Array.from({ length: SIZE }, (_, i) => i).filter((i) => known[i] !== null && clues[i] === undefined),
      rand,
    );
    if (speakers.length === 0) break; // safety; shouldn't happen

    let assigned = false;
    for (const s of speakers) {
      const pick = candidateClues(s, solution, known, rand).find((c) => forcesProgress(c, known));
      if (!pick) continue;
      clues[s] = pick;
      // re-solve from the start using every clue assigned so far
      const res = solve(clues, withStart(start, solution[start]));
      for (let i = 0; i < SIZE; i++) known[i] = res.known[i];
      assigned = true;
      break;
    }
    if (!assigned) break; // every known speaker is exhausted; bail to fallback
  }

  // Fill any speaker we never needed with a truthful flavour clue.
  for (let i = 0; i < SIZE; i++) {
    if (clues[i] === undefined) clues[i] = flavourClue(i, solution, rand);
  }

  return { suspects, solution, clues, start, seed };
}

function withStart(start: number, status: Status): (Status | null)[] {
  const k: (Status | null)[] = new Array(SIZE).fill(null);
  k[start] = status;
  return k;
}

// Guaranteed-solvable fallback: a pure chain of direct reveals along a random
// permutation. Dull, but it always verifies — only used if growth ever fails.
function buildFallback(seed: number): Puzzle {
  const rand = rng(seed ^ 0x9e3779b9);
  const solution = randomSolution(rand);
  const pool = shuffle(SUSPECT_POOL, rand).slice(0, SIZE);
  const suspects: Suspect[] = pool.map((s, i) => ({ id: i, name: s.name, avatar: s.avatar }));
  const order = shuffle(Array.from({ length: SIZE }, (_, i) => i), rand);
  const start = order[0];
  const clues: Clue[] = new Array(SIZE);
  for (let i = 0; i < SIZE - 1; i++) {
    const t = order[i + 1];
    clues[order[i]] = { kind: "direct", speaker: order[i], target: t, status: solution[t] };
  }
  clues[order[SIZE - 1]] = flavourClue(order[SIZE - 1], solution, rand);
  return { suspects, solution, clues, start, seed };
}

// Build a puzzle for `seed`, verifying full no-guess solvability. Nudges the seed
// a few times if a board comes out under-constrained, then drops to the fallback.
export function generatePuzzle(seed: number): Puzzle {
  for (let i = 0; i < 12; i++) {
    const puzzle = build((seed + i * 0x1000193) >>> 0);
    const res = solve(puzzle.clues, withStart(puzzle.start, puzzle.solution[puzzle.start]));
    if (res.solvedAll && !res.contradiction) return { ...puzzle, seed };
  }
  return { ...buildFallback(seed), seed };
}

// YYYYMMDD as a seed gives everyone the same "daily" board.
export function dailySeed(d = new Date()): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}
