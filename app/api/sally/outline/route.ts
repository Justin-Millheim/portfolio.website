// POST /api/sally/outline — Sally pitches (or re-pitches) the song outline
// from the intake conversation. Structured output on the outline-tier model.

import { composeSystem, type SongContextInput } from "@/lib/sally/brain";
import { outlineTask } from "@/lib/sally/brain/phases";
import { SALLY_MODELS } from "@/lib/sally/models";
import { OUTLINE_SCHEMA, callStructured, getAnthropic, requireUser, studioOffline } from "@/lib/sally/server";

export const maxDuration = 120;

interface OutlineBody {
  context: SongContextInput;
  transcript: string;       // the writing-room conversation, rendered as text
  feedback?: string | null; // writer's reaction when re-pitching
}

interface OutlineResult {
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

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.res;
  if (!getAnthropic()) return studioOffline();

  const body = (await req.json()) as OutlineBody;
  try {
    const result = await callStructured<OutlineResult>({
      model: SALLY_MODELS.outline,
      system: composeSystem("outline", 1, body.context),
      user: `## The writing-room conversation so far\n\n${body.transcript}\n\n${outlineTask(body.feedback ?? null)}`,
      schema: OUTLINE_SCHEMA,
      maxTokens: 8000,
    });
    if (!result.structure?.length) throw new Error("Outline came back without a structure");
    return Response.json(result);
  } catch (e) {
    console.error("[sally] outline", e);
    return Response.json(
      { error: "Sally lost the thread mid-pitch — try that again." },
      { status: 502 },
    );
  }
}
