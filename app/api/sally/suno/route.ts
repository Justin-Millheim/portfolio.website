// POST /api/sally/suno — Phase 4 production prompt (PRD §11).
// The ≤1,000-character cap and the no-artist-names rule are enforced in app
// code after generation (PRD §13.5): an over-cap or leaky prompt gets one
// compress pass on the utility model, then a programmatic comma-boundary trim
// as the last resort.

import { composeSystem, type SongContextInput } from "@/lib/sally/brain";
import { sunoTask } from "@/lib/sally/brain/phases";
import { SALLY_MODELS } from "@/lib/sally/models";
import { SUNO_SCHEMA, callStructured, enforceSunoRules, getAnthropic, requireUser, studioOffline } from "@/lib/sally/server";

export const maxDuration = 120;

interface SunoBody {
  context: SongContextInput;
  lyricSheet: string;   // final sheet — delivery cues inform the prompt
  note?: string | null; // writer's direction on a re-cut
}

interface SunoResult {
  prompt: string;
  variations: string[];
  sally_message: string;
}

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.res;
  if (!getAnthropic()) return studioOffline();

  const body = (await req.json()) as SunoBody;
  try {
    const result = await callStructured<SunoResult>({
      model: SALLY_MODELS.suno,
      system: composeSystem("suno", 4, body.context),
      user: `## Final lyric sheet\n\n${body.lyricSheet}\n\n${sunoTask()}${
        body.note ? `\n\nThe writer wants this direction on the cut: "${body.note}"` : ""
      }`,
      schema: SUNO_SCHEMA,
      maxTokens: 3000,
    });
    const prompt = await enforceSunoRules(result.prompt, body.context.styleReference ?? null);
    return Response.json({
      prompt,
      charCount: prompt.length,
      variations: (result.variations ?? []).slice(0, 2),
      sallyMessage: result.sally_message,
    });
  } catch (e) {
    console.error("[sally] suno", e);
    return Response.json(
      { error: "The booth glitched — run the prompt again." },
      { status: 502 },
    );
  }
}
