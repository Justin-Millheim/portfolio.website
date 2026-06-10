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
