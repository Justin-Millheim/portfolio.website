// Shared formatting + id helpers for Sally.

import type { Draft, DraftSection, Outline, Song } from "./types";

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

// Render the strict clean lyric sheet (PRD §9.2): title, "draft vN · words &
// music" subtitle, bracketed section labels with delivery cues, one line per
// bar, no line numbers. This exact text feeds the copy button and Supabase's
// lyric_sheet column.
export function renderLyricSheet(draft: Draft): string {
  const out: string[] = [];
  out.push(draft.title.toUpperCase());
  out.push(`draft v${draft.version} · words & music`);
  out.push("");
  for (const s of draft.sections) {
    out.push(`[${sectionHeading(s)}]`);
    for (const line of s.lines) out.push(line);
    out.push("");
  }
  return out.join("\n").trimEnd() + "\n";
}

export function sectionHeading(s: DraftSection): string {
  return s.deliveryCue ? `${s.label} — ${s.deliveryCue}` : s.label;
}

export function outlineSummaryText(o: Outline): string {
  const lines = [
    `Working title: ${o.workingTitle}`,
    `Emotional core: ${o.emotionalCore}`,
    `Arc: ${o.emotionalArc}`,
    `Central metaphor: ${o.centralMetaphor}`,
    o.lateTurn ? `Late turn: ${o.lateTurn}` : null,
    `Chorus concept: ${o.chorusConcept}`,
    "Structure:",
    ...o.structure.map((s) => `  ${s.label} — ${s.summary}`),
  ].filter(Boolean) as string[];
  return lines.join("\n");
}

export function phaseLabel(phase: number): string {
  switch (phase) {
    case 1: return "Intake & outline";
    case 2: return "First draft";
    case 3: return "Refine";
    case 4: return "Suno prompt";
    default: return "—";
  }
}

export function emptySong(id: string): Song {
  const t = nowIso();
  return {
    id,
    title: "Untitled song",
    mode: null,
    styleReference: null,
    styleBlind: false,
    styleLocked: false,
    emotionalCore: null,
    centralMetaphor: null,
    currentPhase: 1,
    status: "in_progress",
    createdAt: t,
    updatedAt: t,
  };
}
