// The deduction engine. solve() is solution-agnostic: it only ever applies
// forced moves from clues whose speaker is already known, exactly like a player
// who refuses to guess. If it reaches a full board, that board is the unique
// answer (every step was entailed). Powers both generator verification and the
// in-game hint system.

import type { Clue, Status } from "./types";
import { SIZE, neighbors } from "./grid";
import { propagate, clueCells } from "./clues";

export interface SolveResult {
  known: (Status | null)[];
  solvedAll: boolean;
  contradiction: boolean;
  // order in which cells were deduced, with the clue that forced each
  steps: { index: number; status: Status; by: number }[];
}

export function solve(clues: Clue[], initial: (Status | null)[]): SolveResult {
  const known = initial.slice();
  const steps: SolveResult["steps"] = [];
  let progressed = true;
  let contradiction = false;

  while (progressed) {
    progressed = false;
    for (let i = 0; i < clues.length; i++) {
      const clue = clues[i];
      if (clue === undefined) continue;
      if (known[clue.speaker] === null) continue; // clue not yet unlocked
      for (const f of propagate(clue, known)) {
        if (known[f.index] === null) {
          known[f.index] = f.status;
          steps.push({ index: f.index, status: f.status, by: i });
          progressed = true;
        } else if (known[f.index] !== f.status) {
          contradiction = true;
        }
      }
    }
  }

  return {
    known,
    solvedAll: known.every((v) => v !== null),
    contradiction,
    steps,
  };
}

// The single next forced move available right now, or null if the player is
// stuck without it (which a valid puzzle never is). Drives the hint button.
export function nextDeduction(
  clues: Clue[],
  known: (Status | null)[],
): { index: number; status: Status; by: number } | null {
  for (let i = 0; i < clues.length; i++) {
    const clue = clues[i];
    if (clue === undefined || known[clue.speaker] === null) continue;
    for (const f of propagate(clue, known)) {
      if (known[f.index] === null) return { index: f.index, status: f.status, by: i };
    }
  }
  return null;
}

export const emptyKnown = (): (Status | null)[] => new Array(SIZE).fill(null);

// --- global uniqueness ------------------------------------------------------
// A backtracking search over all 20 verdicts that counts how many full boards
// satisfy EVERY clue at once (capped at `limit`). The generator uses this to
// accept only puzzles whose clue set pins the board on its own — the stronger,
// "Clues by Sam"-grade guarantee, beyond merely being forced-solvable in order.

function stillSatisfiable(clues: Clue[], assign: (Status | null)[]): boolean {
  const crim = (r: number[]) => r.reduce((a, i) => a + (assign[i] === "criminal" ? 1 : 0), 0);
  const unk = (r: number[]) => r.reduce((a, i) => a + (assign[i] === null ? 1 : 0), 0);
  for (const c of clues) {
    if (c === undefined) continue;
    switch (c.kind) {
      case "direct":
        if (assign[c.target] && assign[c.target] !== c.status) return false;
        break;
      case "relation": {
        const a = assign[c.a]; const b = assign[c.b];
        if (a && b && (c.same ? a !== b : a === b)) return false;
        break;
      }
      case "cond":
        if (assign[c.a] === c.aStatus && assign[c.b] && assign[c.b] !== c.bStatus) return false;
        break;
      case "count": {
        const cc = crim(c.region); const u = unk(c.region);
        if (c.op === "exactly" && (cc > c.k || cc + u < c.k)) return false;
        if (c.op === "atleast" && cc + u < c.k) return false;
        if (c.op === "atmost" && cc > c.k) return false;
        break;
      }
      case "parity":
      case "share": {
        if (unk(c.region) === 0 && crim(c.region) % 2 !== (c.even ? 0 : 1)) return false;
        break;
      }
      case "connected": {
        // a known-innocent flanked by known-criminals on both sides is impossible
        const r = c.region;
        let first = -1; let last = -1;
        for (let p = 0; p < r.length; p++) if (assign[r[p]] === "criminal") { if (first < 0) first = p; last = p; }
        if (first >= 0) {
          for (let p = first + 1; p < last; p++) if (assign[r[p]] === "innocent") return false;
        }
        break;
      }
      case "most": {
        const bounds = (p: number) => {
          let lo = 0; let u = 0;
          for (const n of neighbors(p)) { if (assign[n] === "criminal") lo++; else if (assign[n] === null) u++; }
          return { lo, hi: lo + u };
        };
        const whoHi = bounds(c.who).hi;
        for (let q = 0; q < SIZE; q++) { if (q !== c.who && bounds(q).lo >= whoHi) return false; }
        break;
      }
      case "nbmore": {
        const xb = (p: number) => { let lo = 0, u = 0; for (const n of neighbors(p)) { if (assign[n] === "criminal") lo++; else if (assign[n] === null) u++; } return { lo, hi: lo + u }; };
        if (xb(c.y).lo >= xb(c.x).hi) return false; // y already ties/beats x's max
        break;
      }
      case "compare": {
        const maxA = crim(c.regionA) + unk(c.regionA); const minB = crim(c.regionB);
        if (maxA <= minB) return false;
        break;
      }
      case "blurb":
        break; // no constraint
    }
  }
  return true;
}

export function solutionCount(clues: Clue[], limit = 2): number {
  const assign: (Status | null)[] = new Array(SIZE).fill(null);
  let found = 0;
  const rec = (i: number) => {
    if (found >= limit) return;
    if (!stillSatisfiable(clues, assign)) return;
    if (i === SIZE) { found++; return; }
    assign[i] = "criminal"; rec(i + 1);
    assign[i] = "innocent"; rec(i + 1);
    assign[i] = null;
  };
  rec(0);
  return found;
}

// --- human-style reasoning: unit propagation + contradiction probing ---------
// Models how a real player cracks a hard board: take the revealed clues, deduce
// everything that's directly forced, and when stuck, hypothesise a verdict and
// chase it until it either sticks or self-destructs. `depth` is how many nested
// hypotheticals are allowed — the lever that separates a 5/100 board from a
// 70/100 one. Sound: every cell it fixes is entailed by the (true) clues.

interface CloseResult { known: (Status | null)[]; contra: boolean; }

// Closure under single-clue propagation using ONLY the given (revealed) clues.
function unitClosure(active: Clue[], start: (Status | null)[]): CloseResult {
  const known = start.slice();
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const clue of active) {
      for (const f of propagate(clue, known)) {
        if (known[f.index] === null) { known[f.index] = f.status; progressed = true; }
        else if (known[f.index] !== f.status) return { known, contra: true };
      }
    }
  }
  return { known, contra: !stillSatisfiable(active, known) };
}

// Unit closure, then up to `depth` levels of "assume X, derive contradiction".
function deepClose(active: Clue[], start: (Status | null)[], depth: number): CloseResult {
  let { known, contra } = unitClosure(active, start);
  if (contra) return { known, contra: true };
  if (depth <= 0) return { known, contra: false };

  // only cells some active clue constrains can ever be forced — probe just those
  const relevant = new Set<number>();
  for (const c of active) for (const i of clueCells(c)) relevant.add(i);

  let changed = true;
  while (changed) {
    changed = false;
    for (const c of relevant) {
      if (known[c] !== null) continue;
      const tryCrim = known.slice(); tryCrim[c] = "criminal";
      const tryInn = known.slice(); tryInn[c] = "innocent";
      const crimBad = deepClose(active, tryCrim, depth - 1).contra;
      const innBad = deepClose(active, tryInn, depth - 1).contra;
      if (crimBad && innBad) return { known, contra: true };
      if (crimBad || innBad) {
        known[c] = crimBad ? "innocent" : "criminal";
        const uc = unitClosure(active, known);
        if (uc.contra) return { known, contra: true };
        known = uc.known;
        changed = true;
      }
    }
  }
  return { known, contra: false };
}

// Play the board the way the game does: reveal clues as suspects are pinned,
// reasoning at the given depth, until no more progress. Returns whether the
// whole board falls out at that depth.
export function solveAtDepth(
  clues: Clue[], start: number, startStatus: Status, depth: number,
): { solved: boolean; known: (Status | null)[] } {
  const known: (Status | null)[] = new Array(SIZE).fill(null);
  known[start] = startStatus;
  for (let guard = 0; guard < SIZE + 2; guard++) {
    const active = clues.filter((c) => c !== undefined && known[c.speaker] !== null);
    const r = deepClose(active, known, depth);
    if (r.contra) return { solved: false, known };
    if (r.known.every((v, i) => v === known[i])) break; // stuck
    for (let i = 0; i < SIZE; i++) known[i] = r.known[i];
  }
  return { solved: known.every((v) => v !== null), known };
}

// The shallowest reasoning depth (0..maxDepth) that fully cracks the board, or
// maxDepth+1 if even that isn't enough. This IS the difficulty score.
export function requiredDepth(
  clues: Clue[], start: number, startStatus: Status, maxDepth = 2,
): number {
  for (let d = 0; d <= maxDepth; d++) {
    if (solveAtDepth(clues, start, startStatus, d).solved) return d;
  }
  return maxDepth + 1;
}

// How the whole board breaks down by reasoning effort: perDepth[d] = how many
// suspects' verdicts first become forced only at reasoning depth d (0 = a single
// clue, 1 = one hypothetical, 2 = nested). Lets the generator demand that real
// deduction — not one-step tells — carries most of the board.
export function solveProfile(
  clues: Clue[], start: number, startStatus: Status, maxDepth = 2,
): { solved: boolean; perDepth: number[] } {
  const known: (Status | null)[] = new Array(SIZE).fill(null);
  known[start] = startStatus;
  const perDepth = new Array(maxDepth + 1).fill(0);

  for (let guard = 0; guard < SIZE + 2; guard++) {
    const active = clues.filter((c) => c !== undefined && known[c.speaker] !== null);
    let advanced = false;
    for (let d = 0; d <= maxDepth; d++) {
      const r = deepClose(active, known, d);
      if (r.contra) return { solved: false, perDepth };
      const fresh: number[] = [];
      for (let i = 0; i < SIZE; i++) if (known[i] === null && r.known[i] !== null) fresh.push(i);
      if (fresh.length > 0) {
        for (const i of fresh) known[i] = r.known[i];
        perDepth[d] += fresh.length;
        advanced = true;
        break; // re-reveal clues and prefer the cheapest deductions again
      }
    }
    if (!advanced) break;
  }
  return { solved: known.every((v) => v !== null), perDepth };
}

// What a player can deduce RIGHT NOW: closes `known` under only the clues that
// are already revealed (spoken by an already-known suspect), with up to
// `maxDepth` reasoning — and crucially WITHOUT unlocking clues of cells deduced
// in this step (you only reveal a clue by committing to that suspect). The game
// uses this to enforce no-guessing: a suspect may only be judged once their
// verdict appears in this closure.
export function deduceClosure(
  clues: Clue[], known: (Status | null)[], maxDepth = 2,
): (Status | null)[] {
  const active = clues.filter((c) => c !== undefined && known[c.speaker] !== null);
  const r = deepClose(active, known, maxDepth);
  return r.contra ? known.slice() : r.known;
}

// The easiest next deduction for a player holding `known` (their correct marks):
// the lowest reasoning depth that pins a new cell, using only revealed clues.
// Drives the hint button now that single-clue propagation no longer suffices.
export function nextHint(
  clues: Clue[], known: (Status | null)[], maxDepth = 2,
): { index: number; status: Status; depth: number } | null {
  const active = clues.filter((c) => c !== undefined && known[c.speaker] !== null);
  for (let d = 0; d <= maxDepth; d++) {
    const r = deepClose(active, known, d);
    if (r.contra) continue;
    for (let i = 0; i < SIZE; i++) {
      if (known[i] === null && r.known[i] !== null) return { index: i, status: r.known[i] as Status, depth: d };
    }
  }
  return null;
}
