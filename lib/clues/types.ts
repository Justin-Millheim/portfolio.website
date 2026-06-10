// Domain types for the /clues deduction puzzle. Backend-free: a Puzzle is a
// plain object that serializes to localStorage and is fully reconstructable
// from its `seed` + `difficulty` (the generator is deterministic).

export type Status = "innocent" | "criminal";

export type Difficulty = "easy" | "medium" | "hard" | "tricky";

export interface Suspect {
  id: number;       // also the suspect's grid index (0..19)
  name: string;
  profession: string;
  avatar: string;   // single emoji mugshot (driven by profession)
}

export type CountOp = "exactly" | "atleast" | "atmost";

// A clue is spoken by `speaker` and only becomes usable once that suspect has
// been identified. Every variant is renderable to English, truth-checkable
// against a solution, and (except `compare`, which is flavour) soundly
// propagatable by the solver.
export type Clue =
  | { kind: "direct"; speaker: number; target: number; status: Status }
  // a and b share a verdict (same=true) or are opposites (same=false)
  | { kind: "relation"; speaker: number; a: number; b: number; same: boolean }
  // "If a is aStatus, then b is bStatus" — drives the contrapositive lesson
  | { kind: "cond"; speaker: number; a: number; aStatus: Status; b: number; bStatus: Status }
  // a count of *criminals* within a labelled region of the board
  | { kind: "count"; speaker: number; region: number[]; label: string; op: CountOp; k: number }
  // the number of criminals in a region is even / odd
  | { kind: "parity"; speaker: number; region: number[]; label: string; even: boolean }
  // a and b share an even / odd number of criminal common-neighbours
  | { kind: "share"; speaker: number; a: number; b: number; region: number[]; even: boolean }
  // the criminals within a row/column region are orthogonally contiguous
  | { kind: "connected"; speaker: number; region: number[]; label: string }
  // `who` uniquely has the most criminal neighbours on the board
  | { kind: "most"; speaker: number; who: number }
  // strictly more criminals in regionA than regionB (flavour: never load-bearing)
  | { kind: "compare"; speaker: number; regionA: number[]; labelA: string; regionB: number[]; labelB: string };

export interface Puzzle {
  suspects: Suspect[];
  solution: Status[];   // ground truth, index === suspect id
  clues: Clue[];        // clues[i] is spoken by suspect i
  start: number;        // the one suspect revealed for free at the outset
  seed: number;
  difficulty: Difficulty;
}
