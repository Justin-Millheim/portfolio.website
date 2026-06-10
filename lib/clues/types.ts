// Domain types for the /clues deduction puzzle. Backend-free: a Puzzle is a
// plain object that serializes to localStorage and is fully reconstructable
// from its `seed` (the generator is deterministic per seed).

export type Status = "innocent" | "criminal";

export interface Suspect {
  id: number;     // also the suspect's grid index (0..19)
  name: string;
  avatar: string; // single emoji used as the mugshot
}

export type CountOp = "exactly" | "atleast" | "atmost";

// A clue is spoken by `speaker` and only becomes usable once that suspect has
// been identified (matching the source game's chained-clue reveal). Every clue
// variant is both renderable to English and propagatable by the solver.
export type Clue =
  | { kind: "direct"; speaker: number; target: number; status: Status }
  // a and b share a verdict (same=true) or are opposites (same=false)
  | { kind: "relation"; speaker: number; a: number; b: number; same: boolean }
  // "If a is aStatus, then b is bStatus" — drives the contrapositive lesson
  | { kind: "cond"; speaker: number; a: number; aStatus: Status; b: number; bStatus: Status }
  // a count of *criminals* within a labelled region of the board
  | { kind: "count"; speaker: number; region: number[]; label: string; op: CountOp; k: number };

export interface Puzzle {
  suspects: Suspect[];
  solution: Status[];   // ground truth, index === suspect id
  clues: Clue[];        // clues[i] is spoken by suspect i
  start: number;        // the one suspect revealed for free at the outset
  seed: number;
}
