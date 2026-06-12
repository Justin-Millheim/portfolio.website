// Sally the Songbird — shared types for the five-phase songwriting engine.
// A song moves 1 → 4 with hard gates between phases (PRD §6); everything is
// versioned and persisted so nothing is ever lost.

export type Mode = "gift" | "anthemic" | "confessional_rap" | "double_entendre";
export type Phase = 1 | 2 | 3 | 4;
export type SongStatus = "in_progress" | "complete" | "archived";
export type SectionKind = "verse" | "prechorus" | "chorus" | "bridge" | "hook" | "intro" | "outro" | "other";
export type MissType = "content" | "structure" | "register" | "craft" | "unclear";

export type SectionAction =
  | "revise"
  | "tighten"
  | "register"
  | "more_specific"
  | "alternatives"
  | "punch_ending";

export interface Song {
  id: string;
  title: string;
  mode: Mode | null;
  styleReference: string | null;
  styleBlind: boolean;
  styleLocked: boolean;
  emotionalCore: string | null;
  centralMetaphor: string | null;
  currentPhase: Phase;
  status: SongStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OutlineSection {
  label: string;
  summary: string;
}

export interface Outline {
  id: string;
  songId: string;
  version: number;
  workingTitle: string;
  emotionalCore: string;
  emotionalArc: string;
  centralMetaphor: string;
  lateTurn: string | null;
  structure: OutlineSection[];
  chorusConcept: string;
  reasoning: string;
  approved: boolean;
  createdAt: string;
}

export interface DraftSection {
  label: string;           // "Verse 1", "Chorus", "Bridge"
  kind: SectionKind;       // drives the syllable budget
  deliveryCue: string | null; // "rapped, low and tight" — mandatory for mixed songs
  lines: string[];         // one line per bar
  locked: boolean;         // Phase 3 → 4 gate: every section must be locked
}

export interface WeakLine {
  section: string;
  line: string;
  note: string;
}

export interface Draft {
  id: string;
  songId: string;
  version: number;
  title: string;
  sections: DraftSection[];
  creativeNotes: string[];
  weakLines: WeakLine[];
  createdAt: string;
}

export interface SunoPrompt {
  id: string;
  songId: string;
  prompt: string;
  charCount: number;
  variations: string[];
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  songId: string;
  phase: Phase;
  role: "sally" | "writer";
  content: string;
  createdAt: string;
}

export interface SongBundle {
  song: Song;
  outlines: Outline[];   // ascending by version
  drafts: Draft[];       // ascending by version
  suno: SunoPrompt | null;
  messages: ChatMessage[];
}

// A compact index entry from a completed song, injected into generation calls
// as a style anchor — the living reference corpus (PRD §7).
export interface StyleAnchor {
  title: string;
  mode: Mode | null;
  centralMetaphor: string | null;
  sampleLines: string[];
}

export const MODE_LABELS: Record<Mode, { name: string; blurb: string }> = {
  gift: {
    name: "Intimate gift song",
    blurb: "Narrative and vulnerable, written for one specific person.",
  },
  anthemic: {
    name: "Anthemic / identity",
    blurb: "Bigger and character-forward — a song to stand inside.",
  },
  confessional_rap: {
    name: "Confessional / rap-leaning",
    blurb: "Raw and direct. Bar discipline does the heavy lifting.",
  },
  double_entendre: {
    name: "Double-entendre",
    blurb: "Two registers at once — every line works twice.",
  },
};

export const MODE_NAME = (mode: Mode | null): string =>
  mode ? MODE_LABELS[mode].name : "No mode yet";
