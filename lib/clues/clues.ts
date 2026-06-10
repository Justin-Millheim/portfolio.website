// Clue semantics: rendering to English, truth-checking against a solution, and
// sound forced-propagation for the solver. Every propagate() result is a cell
// that MUST hold given current partial knowledge — never a guess. That
// soundness is what guarantees generated puzzles have a unique, gettable answer.
// (`compare` is the one flavour-only clue: always true, never load-bearing, so
// it propagates nothing.)

import type { Clue, Status, CountOp, Suspect } from "./types";

export const opp = (s: Status): Status => (s === "criminal" ? "innocent" : "criminal");

export function statusPhrase(s: Status): string {
  return s === "criminal" ? "a criminal" : "innocent";
}

function crimCount(region: number[], values: (Status | null)[]) {
  let criminals = 0;
  const unknown: number[] = [];
  for (const idx of region) {
    const v = values[idx];
    if (v === "criminal") criminals++;
    else if (v === null) unknown.push(idx);
  }
  return { criminals, unknown };
}

function countPhrase(op: CountOp, k: number, label: string, size: number): string {
  if (op === "exactly" && k === 0) return `None of ${label} are criminals.`;
  if (op === "exactly" && k === size && size > 1) return `All of ${label} are criminals.`;
  const verb = k === 1 ? "is a criminal" : "are criminals";
  const num = k === 1 ? "one" : String(k);
  if (op === "exactly") return `Exactly ${num} of ${label} ${verb}.`;
  if (op === "atleast") return `At least ${num} of ${label} ${verb}.`;
  return `At most ${num} of ${label} ${verb}.`;
}

export function renderClue(clue: Clue, suspects: Suspect[]): string {
  const name = (i: number) => suspects[i]?.name ?? `#${i}`;
  switch (clue.kind) {
    case "direct":
      return `${name(clue.target)} is ${statusPhrase(clue.status)}.`;
    case "relation": {
      if (clue.a === clue.speaker) {
        return clue.same
          ? `${name(clue.b)} has the same verdict as me.`
          : `${name(clue.b)} is the opposite of me.`;
      }
      return clue.same
        ? `${name(clue.a)} and ${name(clue.b)} share the same verdict.`
        : `${name(clue.a)} and ${name(clue.b)} land on opposite sides.`;
    }
    case "cond": {
      const a = clue.a === clue.speaker ? "I am" : `${name(clue.a)} is`;
      return `If ${a} ${statusPhrase(clue.aStatus)}, then ${name(clue.b)} is ${statusPhrase(clue.bStatus)}.`;
    }
    case "count":
      return countPhrase(clue.op, clue.k, clue.label, clue.region.length);
    case "parity":
      return `An ${clue.even ? "even" : "odd"} number of ${clue.label} are criminals.`;
    case "compare":
      return `There are more criminals among ${clue.labelA} than ${clue.labelB}.`;
  }
}

// Is the clue true under the full solution? Used only at generation time.
export function evalClue(clue: Clue, solution: Status[]): boolean {
  const crim = (region: number[]) => region.filter((i) => solution[i] === "criminal").length;
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
      const c = crim(clue.region);
      if (clue.op === "exactly") return c === clue.k;
      if (clue.op === "atleast") return c >= clue.k;
      return c <= clue.k;
    }
    case "parity":
      return crim(clue.region) % 2 === (clue.even ? 0 : 1);
    case "compare":
      return crim(clue.regionA) > crim(clue.regionB);
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
      if (known[clue.a] === clue.aStatus && known[clue.b] === null)
        out.push({ index: clue.b, status: clue.bStatus });            // modus ponens
      if (known[clue.b] === opp(clue.bStatus) && known[clue.a] === null)
        out.push({ index: clue.a, status: opp(clue.aStatus) });        // modus tollens
      break;
    }
    case "count": {
      const { criminals, unknown } = crimCount(clue.region, known);
      const u = unknown.length;
      if (u === 0) break;
      const all = (status: Status) => unknown.forEach((i) => out.push({ index: i, status }));
      if (clue.op === "exactly") {
        if (criminals === clue.k) all("innocent");
        else if (criminals + u === clue.k) all("criminal");
      } else if (clue.op === "atleast") {
        if (criminals + u === clue.k) all("criminal");
      } else {
        if (criminals === clue.k) all("innocent");
      }
      break;
    }
    case "parity": {
      const { criminals, unknown } = crimCount(clue.region, known);
      if (unknown.length !== 1) break; // parity only pins the very last unknown
      const targetParity = clue.even ? 0 : 1;
      out.push({ index: unknown[0], status: criminals % 2 === targetParity ? "innocent" : "criminal" });
      break;
    }
    case "compare":
      break; // flavour only
  }
  return out;
}
