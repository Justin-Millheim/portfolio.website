// The deduction engine. solve() is solution-agnostic: it only ever applies
// forced moves from clues whose speaker is already known, exactly like a player
// who refuses to guess. If it reaches a full board, that board is the unique
// answer (every step was entailed). Powers both generator verification and the
// in-game hint system.

import type { Clue, Status } from "./types";
import { SIZE } from "./grid";
import { propagate } from "./clues";

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
      case "parity": {
        if (unk(c.region) === 0 && crim(c.region) % 2 !== (c.even ? 0 : 1)) return false;
        break;
      }
      case "compare": {
        const maxA = crim(c.regionA) + unk(c.regionA); const minB = crim(c.regionB);
        if (maxA <= minB) return false;
        break;
      }
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
