// The Syllable Meter — bar discipline made visible (PRD §9.4).
// Heuristic English syllable estimation runs in app code (never the model)
// for speed and consistency. It's a guide, not gospel: the UI labels it as an
// aid and it never blocks locking a section.

import type { DraftSection, SectionKind } from "./types";

// Syllable budgets by delivery, straight from the methodology (Appendix B).
// `tail` is the chorus-tail budget applied to the last line of a chorus.
export interface BarBudget {
  min: number;
  max: number;
  tail?: { min: number; max: number };
}

export const BUDGETS: Record<"rapped" | SectionKind, BarBudget | null> = {
  rapped: { min: 8, max: 14 },
  verse: { min: 6, max: 12 },
  prechorus: { min: 5, max: 10 },
  chorus: { min: 5, max: 10, tail: { min: 3, max: 6 } },
  hook: { min: 5, max: 10, tail: { min: 3, max: 6 } },
  bridge: { min: 5, max: 12 },
  intro: null, // free
  outro: null, // free (often spoken)
  other: { min: 5, max: 12 },
};

// Vowel-group counting with silent-e and silent-ed adjustments lands within
// one syllable on the vast majority of lyric vocabulary.
function countWordSyllables(raw: string): number {
  let word = raw.toLowerCase().replace(/[^a-z]/g, "");
  if (!word) return 0;
  if (word.length <= 2) return 1;
  // vowel-pair + d (agreed, freed, died): only the d is silent
  if (/[aeiou]{2}d$/.test(word)) word = word.slice(0, -1);
  // silent -ed (walked, named) — but not -ted/-ded (wanted, landed)
  else if (/ed$/.test(word) && !/[td]ed$/.test(word)) word = word.slice(0, -2);
  // silent trailing -e (name, time) — but keep syllabic -le (table, little)
  if (/[^aeiouyl]e$/.test(word)) word = word.slice(0, -1);
  const groups = word.match(/[aeiouy]+/g);
  return Math.max(1, groups ? groups.length : 1);
}

export function countSyllables(line: string): number {
  return line
    .split(/[\s—–-]+/)
    .filter(Boolean)
    .reduce((sum, w) => sum + countWordSyllables(w), 0);
}

// A line "sings" badly when it ends in a dense consonant cluster ("asks",
// "twelfths") — flagged everywhere, loudest on chorus tails.
const CLUSTER_TAIL = /[bcdfghjklmnpqrstvwxz]{3,}$/i;
// Open-vowel tail = ends on a vowel sound the voice can hold.
const OPEN_TAIL = /([aeiou]|ay|ey|ee|igh|ow|oo|ah|oh|aw|y)$/i;

export type LineFlag = "over" | "near" | "under" | "cluster" | "closed-tail";

export interface LineMeter {
  syllables: number;
  budget: BarBudget | null;
  flags: LineFlag[];
}

export function isRapped(section: DraftSection): boolean {
  const cue = (section.deliveryCue ?? "").toLowerCase();
  return /\brap|spit|spoken[- ]bar/.test(cue);
}

export function budgetFor(section: DraftSection, lineIndex: number): BarBudget | null {
  if (isRapped(section)) return BUDGETS.rapped;
  const base = BUDGETS[section.kind] ?? BUDGETS.other;
  if (!base) return null;
  const isTail = lineIndex === section.lines.length - 1;
  if (isTail && base.tail) return { min: base.tail.min, max: base.tail.max };
  return base;
}

export function meterLine(section: DraftSection, lineIndex: number): LineMeter {
  const line = section.lines[lineIndex] ?? "";
  const syllables = countSyllables(line);
  const budget = budgetFor(section, lineIndex);
  const flags: LineFlag[] = [];
  if (budget) {
    if (syllables > budget.max) flags.push("over");
    else if (syllables === budget.max) flags.push("near");
    else if (syllables < budget.min) flags.push("under");
  }
  const lastWord = line.trim().split(/\s+/).pop() ?? "";
  const cleaned = lastWord.replace(/[^a-z]/gi, "");
  if (CLUSTER_TAIL.test(cleaned)) flags.push("cluster");
  const isChorus = section.kind === "chorus" || section.kind === "hook";
  const isTail = lineIndex === section.lines.length - 1;
  if (isChorus && isTail && cleaned && !OPEN_TAIL.test(cleaned) && !flags.includes("cluster")) {
    flags.push("closed-tail");
  }
  return { syllables, budget, flags };
}

// Whole-song singability sweep — powers the "Check singability" action.
export interface SingabilityFlag {
  section: string;
  lineIndex: number;
  line: string;
  meter: LineMeter;
}

export function checkSingability(sections: DraftSection[]): SingabilityFlag[] {
  const out: SingabilityFlag[] = [];
  for (const s of sections) {
    s.lines.forEach((line, i) => {
      const m = meterLine(s, i);
      if (m.flags.some((f) => f === "over" || f === "cluster" || f === "closed-tail")) {
        out.push({ section: s.label, lineIndex: i, line, meter: m });
      }
    });
  }
  return out;
}
