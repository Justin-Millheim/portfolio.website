// Sally's Brain — composition (PRD §13.2).
// Every Anthropic call is assembled from these modules, in this order:
//   1. persona  2. active-phase instructions  3. craft modules (generation
//   steps only; trimmed for conversation)  4. song context  5. the task
// (task text rides in the user turn; builders live in ./phases).

import type { Mode, Outline, Phase, StyleAnchor } from "../types";
import { MODE_LABELS } from "../types";
import { PERSONA } from "./persona";
import { CRAFT_MODULES, MODE_SYSTEM, VOICE_AND_PREFERENCES } from "./craft";
import { POST_DRAFT_AUDIT, PRE_DRAFT_AUDIT } from "./audits";
import { PHASE_MODULES } from "./phases";

export interface SongContextInput {
  title: string;
  mode: Mode | null;
  styleReference: string | null;
  styleBlind: boolean;
  emotionalCore?: string | null;
  outline?: Outline | null;          // the approved (or latest) outline
  lockedSections?: string[];         // labels of locked sections (phase 3)
  sectionLabels?: string[];          // all section labels in the current draft
  anchors?: StyleAnchor[];           // living reference corpus (2–4 max)
}

export function buildSongContext(c: SongContextInput): string {
  const parts: string[] = ["## Song context"];
  parts.push(`Working title: ${c.title}`);
  parts.push(
    c.mode
      ? `Mode: ${MODE_LABELS[c.mode].name} (${c.mode})`
      : "Mode: not chosen yet — the writer picks via the mode cards.",
  );
  if (c.styleBlind) {
    parts.push(
      "Style reference: the writer said \"you choose blind\" — they trust your instincts. Commit to a specific sonic direction yourself and stay consistent with it.",
    );
  } else if (c.styleReference) {
    parts.push(`Locked style reference: ${c.styleReference}`);
  } else {
    parts.push("Style reference: NOT LOCKED YET (required before the outline).");
  }
  if (c.emotionalCore) parts.push(`Emotional core: ${c.emotionalCore}`);

  if (c.outline) {
    const o = c.outline;
    parts.push(
      [
        `### Approved outline (v${o.version})`,
        `Working title: ${o.workingTitle}`,
        `Emotional core: ${o.emotionalCore}`,
        `Emotional arc: ${o.emotionalArc}`,
        `Central metaphor (the ONE): ${o.centralMetaphor}`,
        o.lateTurn ? `Late turn: ${o.lateTurn}` : "Late turn: none planned",
        `Chorus concept: ${o.chorusConcept}`,
        `Structure:`,
        ...o.structure.map((s) => `- ${s.label}: ${s.summary}`),
      ].join("\n"),
    );
  }

  if (c.sectionLabels?.length) {
    const locked = new Set(c.lockedSections ?? []);
    parts.push(
      "### Current draft sections\n" +
        c.sectionLabels
          .map((l) => `- ${l}${locked.has(l) ? " [LOCKED — approved by the writer, do not touch]" : ""}`)
          .join("\n"),
    );
  }

  if (c.anchors?.length) {
    parts.push(
      "### Style anchors from the writer's finished songs (voice calibration ONLY — never reuse their phrases or images)\n" +
        c.anchors
          .map(
            (a) =>
              `- "${a.title}"${a.mode ? ` (${a.mode})` : ""}${a.centralMetaphor ? ` — metaphor: ${a.centralMetaphor}` : ""}${
                a.sampleLines.length ? `\n  e.g. ${a.sampleLines.map((l) => `"${l}"`).join(" / ")}` : ""
              }`,
          )
          .join("\n"),
    );
  }

  return parts.join("\n\n");
}

export type SystemKind = "chat" | "outline" | "draft" | "pre_audit" | "post_audit" | "revise" | "suno";

export function composeSystem(kind: SystemKind, phase: Phase, context: SongContextInput): string {
  const blocks: string[] = [PERSONA];

  blocks.push(PHASE_MODULES[phase]);

  switch (kind) {
    case "chat":
      // Conversational calls keep prompts lean (PRD §17 "Sally's Brain drift"):
      // voice + modes only, no full craft stack.
      blocks.push(VOICE_AND_PREFERENCES, MODE_SYSTEM);
      break;
    case "outline":
    case "draft":
    case "revise":
      blocks.push(CRAFT_MODULES);
      break;
    case "pre_audit":
      blocks.push(CRAFT_MODULES, PRE_DRAFT_AUDIT);
      break;
    case "post_audit":
      blocks.push(CRAFT_MODULES, POST_DRAFT_AUDIT);
      break;
    case "suno":
      blocks.push(MODE_SYSTEM);
      break;
  }

  if (kind === "revise") {
    // Inline regenerations re-run both audits on the rewritten section (F3.5).
    blocks.push(PRE_DRAFT_AUDIT, POST_DRAFT_AUDIT);
  }

  blocks.push(buildSongContext(context));

  return blocks.join("\n\n---\n\n");
}
