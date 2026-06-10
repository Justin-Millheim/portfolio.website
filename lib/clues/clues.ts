// Clue semantics: rendering to English, truth-checking against a solution, and
// sound forced-propagation for the solver. Every propagate() result is a cell
// that MUST hold given the current partial knowledge — never a guess. That
// soundness is what guarantees generated puzzles have a unique, gettable answer.

import type { Clue, Status, CountOp } from "./types";
import type { Suspect } from "./types";

export const opp = (s: Status): Status => (s === "criminal" ? "innocent" : "criminal");

// "is a criminal" / "is innocent"
export function statusPhrase(s: Status): string {
  return s === "criminal" ? "a criminal" : "innocent";
}

function name(suspects: Suspect[], i: number): string {
  return suspects[i]?.name ?? `#${i}`;
}

function countCriminals(region: number[], values: (Status | null)[]): {
  criminals: number;
  innocents: number;
  unknown: number[];
} {
  let criminals = 0;
  let innocents = 0;
  const unknown: number[] = [];
  for (const idx of region) {
    const v = values[idx];
    if (v === "criminal") criminals++;
    else if (v === "innocent") innocents++;
    else unknown.push(idx);
  }
  return { criminals, innocents, unknown };
}

function countPhrase(op: CountOp, k: number, label: string): string {
  if (op === "exactly" && k === 0) return `None of ${label} are criminals.`;
  const noun = k === 1 ? "is a criminal" : "are criminals";
  const num = k === 1 ? "one" : String(k);
  if (op === "exactly") return `Exactly ${num} of ${label} ${noun}.`;
  if (op === "atleast") return `At least ${num} of ${label} ${noun}.`;
  return `At most ${num} of ${label} ${noun}.`; // atmost
}

export function renderClue(clue: Clue, suspects: Suspect[]): string {
  switch (clue.kind) {
    case "direct":
      return `${name(suspects, clue.target)} is ${statusPhrase(clue.status)}.`;
    case "relation": {
      const a = name(suspects, clue.a);
      const b = name(suspects, clue.b);
      // Speak in the first person when the clue references its own speaker.
      if (clue.a === clue.speaker) {
        return clue.same
          ? `${b} has the same verdict as me.`
          : `${b} is the opposite of me.`;
      }
      return clue.same
        ? `${a} and ${b} share the same verdict.`
        : `${a} and ${b} land on opposite sides.`;
    }
    case "cond": {
      const a = clue.a === clue.speaker ? "I am" : `${name(suspects, clue.a)} is`;
      return `If ${a} ${statusPhrase(clue.aStatus)}, then ${name(suspects, clue.b)} is ${statusPhrase(clue.bStatus)}.`;
    }
    case "count":
      return countPhrase(clue.op, clue.k, clue.label);
  }
}

// Is the clue true under the full solution? Used only at generation time.
export function evalClue(clue: Clue, solution: Status[]): boolean {
  switch (clue.kind) {
    case "direct":
      return solution[clue.target] === clue.status;
    case "relation":
      return clue.same
        ? solution[clue.a] === solution[clue.b]
        : solution[clue.a] !== solution[clue.b];
    case "cond":
      return solution[clue.a] !== clue.aStatus || solution[clue.b] === clue.bStatus;
    case "count": {
      const c = clue.region.filter((i) => solution[i] === "criminal").length;
      if (clue.op === "exactly") return c === clue.k;
      if (clue.op === "atleast") return c >= clue.k;
      return c <= clue.k; // atmost
    }
  }
}

// All cells forced by this clue given current knowledge. Sound: each entry is
// logically entailed. Returns [] when the clue can't currently pin anything.
export function propagate(clue: Clue, known: (Status | null)[]): { index: number; status: Status }[] {
  const out: { index: number; status: Status }[] = [];
  switch (clue.kind) {
    case "direct":
      if (known[clue.target] === null) out.push({ index: clue.target, status: clue.status });
      break;
    case "relation": {
      const va = known[clue.a];
      const vb = known[clue.b];
      if (va && !vb) out.push({ index: clue.b, status: clue.same ? va : opp(va) });
      else if (vb && !va) out.push({ index: clue.a, status: clue.same ? vb : opp(vb) });
      break;
    }
    case "cond": {
      // modus ponens
      if (known[clue.a] === clue.aStatus && known[clue.b] === null)
        out.push({ index: clue.b, status: clue.bStatus });
      // modus tollens (the "if not B then not A" lesson)
      if (known[clue.b] === opp(clue.bStatus) && known[clue.a] === null)
        out.push({ index: clue.a, status: opp(clue.aStatus) });
      break;
    }
    case "count": {
      const { criminals, unknown } = countCriminals(clue.region, known);
      const u = unknown.length;
      if (u === 0) break;
      const setAll = (status: Status) => unknown.forEach((i) => out.push({ index: i, status }));
      if (clue.op === "exactly") {
        if (criminals === clue.k) setAll("innocent");
        else if (criminals + u === clue.k) setAll("criminal");
      } else if (clue.op === "atleast") {
        if (criminals + u === clue.k) setAll("criminal"); // every remaining must be criminal
      } else {
        // atmost
        if (criminals === clue.k) setAll("innocent");
      }
      break;
    }
  }
  return out;
}
