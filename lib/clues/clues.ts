// Clue semantics: rendering to English, truth-checking against a solution, and
// sound forced-propagation for the solver. Every propagate() result is a cell
// that MUST hold given current partial knowledge — never a guess. That
// soundness is what guarantees generated puzzles have a unique, gettable answer.
// (`compare` is the one flavour-only clue: always true, never load-bearing, so
// it propagates nothing.)

import type { Clue, Status, CountOp, Suspect } from "./types";
import { neighbors } from "./grid";

export const opp = (s: Status): Status => (s === "criminal" ? "innocent" : "criminal");

// #criminal neighbours of p under a (possibly partial) assignment, plus how many
// of p's neighbours are still unknown — the bounds the "most" rules reason over.
function neighbourCrimBounds(p: number, values: (Status | null)[]) {
  let lo = 0; let unknown = 0;
  for (const n of neighbors(p)) {
    if (values[n] === "criminal") lo++;
    else if (values[n] === null) unknown++;
  }
  return { lo, hi: lo + unknown };
}

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
    case "share": {
      const n = clue.even ? "even" : "odd";
      return clue.a === clue.speaker
        ? `${name(clue.b)} and I share an ${n} number of criminal neighbours.`
        : `${name(clue.a)} and ${name(clue.b)} share an ${n} number of criminal neighbours.`;
    }
    case "connected":
      return `The criminals in ${clue.label} are connected.`;
    case "most":
      return clue.who === clue.speaker
        ? `I have the most criminal neighbours.`
        : `${name(clue.who)} has the most criminal neighbours.`;
    case "compare":
      return `There are more criminals among ${clue.labelA} than ${clue.labelB}.`;
  }
}

// Every suspect this clue constrains. A cell no active clue references can never
// be deduced, so the solver only probes this set — a big, sound speed-up.
export function clueCells(clue: Clue): number[] {
  switch (clue.kind) {
    case "direct": return [clue.target];
    case "relation": return [clue.a, clue.b];
    case "cond": return [clue.a, clue.b];
    case "count":
    case "parity":
    case "connected": return clue.region;
    case "share": return [clue.a, clue.b, ...clue.region];
    case "most": return [clue.who, ...neighbors(clue.who)];
    case "compare": return [...clue.regionA, ...clue.regionB];
  }
}

// Does this clue talk about suspect `index`? Used by the hint button to point a
// stuck player at the clues that, together, pin a given suspect.
export function clueMentions(clue: Clue, index: number): boolean {
  switch (clue.kind) {
    case "direct": return clue.target === index;
    case "relation": return clue.a === index || clue.b === index;
    case "cond": return clue.a === index || clue.b === index;
    case "count":
    case "parity":
    case "connected": return clue.region.includes(index);
    case "share": return clue.a === index || clue.b === index || clue.region.includes(index);
    case "most": return clue.who === index || neighbors(clue.who).includes(index);
    case "compare": return clue.regionA.includes(index) || clue.regionB.includes(index);
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
    case "share":
      return crim(clue.region) % 2 === (clue.even ? 0 : 1);
    case "connected": {
      // criminals must occupy a contiguous run within the ordered region
      const pos = clue.region.map((i) => solution[i] === "criminal");
      const first = pos.indexOf(true);
      if (first === -1) return true; // no criminals -> connected
      const last = pos.lastIndexOf(true);
      for (let p = first; p <= last; p++) if (!pos[p]) return false;
      return true;
    }
    case "most": {
      const f = (p: number) => solution[p] === undefined ? 0 : neighbourCrimBounds(p, solution).lo;
      const mine = f(clue.who);
      for (let q = 0; q < solution.length; q++) if (q !== clue.who && f(q) >= mine) return false;
      return true;
    }
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
    case "parity":
    case "share": {
      const { criminals, unknown } = crimCount(clue.region, known);
      if (unknown.length !== 1) break; // parity only pins the very last unknown
      const targetParity = clue.even ? 0 : 1;
      out.push({ index: unknown[0], status: criminals % 2 === targetParity ? "innocent" : "criminal" });
      break;
    }
    case "connected": {
      // any unknown cell strictly between two known criminals must be criminal
      const r = clue.region;
      let first = -1; let last = -1;
      for (let p = 0; p < r.length; p++) if (known[r[p]] === "criminal") { if (first < 0) first = p; last = p; }
      if (first >= 0) {
        for (let p = first + 1; p < last; p++) if (known[r[p]] === null) out.push({ index: r[p], status: "criminal" });
      }
      break;
    }
    case "most": {
      // f(who) > f(q) for all q. Bounds: f(p) in [lo(p), hi(p)].
      const who = clue.who;
      const whoB = neighbourCrimBounds(who, known);
      for (let q = 0; q < known.length; q++) {
        if (q === who) continue;
        const qB = neighbourCrimBounds(q, known);
        // Rule 1: a rival's floor ties who's ceiling -> who must max out (all
        // unknown neighbours criminal) to stay strictly ahead.
        if (qB.lo + 1 === whoB.hi) {
          for (const n of neighbors(who)) if (known[n] === null) out.push({ index: n, status: "criminal" });
        }
        // Rule 2: a rival pinned at who's ceiling-minus-one can rise no further
        // (its unknown neighbours must all be innocent).
        if (qB.lo === whoB.hi - 1) {
          for (const n of neighbors(q)) if (known[n] === null) out.push({ index: n, status: "innocent" });
        }
      }
      break;
    }
    case "compare":
      break; // flavour only
  }
  return out;
}
