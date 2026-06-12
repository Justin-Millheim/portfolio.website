// Client helpers for Sally's API routes: auth header wiring, the song-context
// builder shared by every call, and stream readers for chat (token stream) and
// the draft pipeline (NDJSON status + result).

import type { SongContextInput } from "./brain";
import { getSupabase } from "./supabase";
import type {
  ChatMessage, Draft, DraftSection, MissType, Outline, Phase, SectionAction,
  SectionKind, Song, StyleAnchor, WeakLine,
} from "./types";

export interface RawSection {
  label: string;
  kind: SectionKind;
  delivery_cue: string | null;
  lines: string[];
}

export function toDraftSection(raw: RawSection, locked = false): DraftSection {
  return {
    label: raw.label,
    kind: raw.kind,
    deliveryCue: raw.delivery_cue,
    lines: raw.lines,
    locked,
  };
}

export function toRawSection(s: DraftSection): RawSection {
  return { label: s.label, kind: s.kind, delivery_cue: s.deliveryCue, lines: s.lines };
}

export function buildContext(opts: {
  song: Song;
  outline?: Outline | null;
  draft?: Draft | null;
  anchors?: StyleAnchor[];
}): SongContextInput {
  const { song, outline, draft, anchors } = opts;
  return {
    title: song.title,
    mode: song.mode,
    styleReference: song.styleReference,
    styleBlind: song.styleBlind,
    emotionalCore: song.emotionalCore,
    outline: outline ?? null,
    sectionLabels: draft?.sections.map((s) => s.label),
    lockedSections: draft?.sections.filter((s) => s.locked).map((s) => s.label),
    anchors,
  };
}

export function renderTranscript(messages: ChatMessage[]): string {
  return messages
    .map((m) => `${m.role === "sally" ? "Sally" : "Writer"}: ${m.content}`)
    .join("\n\n");
}

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function readError(res: Response): Promise<never> {
  let message = `Request failed (${res.status})`;
  try {
    const body = (await res.json()) as { error?: string };
    if (body.error) message = body.error;
  } catch { /* keep default */ }
  throw new Error(message);
}

// ---------------------------------------------------------------------------
// Chat — streamed plain text
// ---------------------------------------------------------------------------

export async function sallyChat(
  body: {
    phase: Phase;
    context: SongContextInput;
    messages: { role: "sally" | "writer"; content: string }[];
    event?: string;
  },
  onDelta: (full: string) => void,
): Promise<string> {
  const res = await fetch("/api/sally/chat", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) await readError(res);
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    onDelta(full);
  }
  full += decoder.decode();
  return full.trim();
}

// ---------------------------------------------------------------------------
// Outline
// ---------------------------------------------------------------------------

export interface OutlinePayload {
  working_title: string;
  emotional_core: string;
  emotional_arc: string;
  central_metaphor: string;
  late_turn: string | null;
  structure: { label: string; summary: string }[];
  chorus_concept: string;
  reasoning: string;
  sally_message: string;
}

export async function sallyOutline(body: {
  context: SongContextInput;
  transcript: string;
  feedback?: string | null;
}): Promise<OutlinePayload> {
  const res = await fetch("/api/sally/outline", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) await readError(res);
  return (await res.json()) as OutlinePayload;
}

// ---------------------------------------------------------------------------
// Draft pipeline — NDJSON (status stages + final result)
// ---------------------------------------------------------------------------

export interface DraftPayload {
  title: string;
  sections: RawSection[];
  creativeNotes: string[];
  weakLines: WeakLine[];
  sallyMessage: string;
}

export async function sallyDraft(
  body: { context: SongContextInput },
  onStage: (stage: number) => void,
): Promise<DraftPayload> {
  const res = await fetch("/api/sally/draft", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) await readError(res);
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: DraftPayload | null = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      const msg = JSON.parse(line) as
        | { t: "status"; stage: number }
        | ({ t: "result" } & DraftPayload)
        | { t: "done" }
        | { t: "error"; message: string };
      if (msg.t === "status") onStage(msg.stage);
      else if (msg.t === "result") result = msg;
      else if (msg.t === "error") throw new Error(msg.message);
    }
  }
  if (!result) throw new Error("Sally hit a snag mid-draft — give it another go.");
  return result;
}

// ---------------------------------------------------------------------------
// Revise (Phase 3 inline actions)
// ---------------------------------------------------------------------------

export interface RevisePayload {
  section: RawSection | null;
  alternatives: { approach: string; section: RawSection }[] | null;
  sally_message: string;
}

export async function sallyRevise(body: {
  context: SongContextInput;
  section: RawSection;
  action: SectionAction;
  missType?: MissType | null;
  note?: string | null;
}): Promise<RevisePayload> {
  const res = await fetch("/api/sally/revise", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) await readError(res);
  return (await res.json()) as RevisePayload;
}

// ---------------------------------------------------------------------------
// Suno prompt
// ---------------------------------------------------------------------------

export interface SunoPayload {
  prompt: string;
  charCount: number;
  variations: string[];
  sallyMessage: string;
}

export async function sallySuno(body: {
  context: SongContextInput;
  lyricSheet: string;
  note?: string | null;
}): Promise<SunoPayload> {
  const res = await fetch("/api/sally/suno", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) await readError(res);
  return (await res.json()) as SunoPayload;
}
