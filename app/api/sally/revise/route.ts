// POST /api/sally/revise — Phase 3 inline actions: scoped regeneration that
// touches ONLY the target section (PRD §10). Miss diagnosis + the
// anti-overcorrection guard live in the task; both audits re-run silently on
// the rewritten section (F3.5).

import { composeSystem, type SongContextInput } from "@/lib/sally/brain";
import { reviseTask } from "@/lib/sally/brain/phases";
import { SALLY_MODELS } from "@/lib/sally/models";
import { REVISE_SCHEMA, callStructured, getAnthropic, requireUser, studioOffline } from "@/lib/sally/server";
import type { MissType, SectionAction, SectionKind } from "@/lib/sally/types";

export const maxDuration = 300;

interface RawSection {
  label: string;
  kind: SectionKind;
  delivery_cue: string | null;
  lines: string[];
}

interface ReviseBody {
  context: SongContextInput;
  section: RawSection;
  action: SectionAction;
  missType?: MissType | null;
  note?: string | null;
}

interface ReviseResult {
  section: RawSection | null;
  alternatives: { approach: string; section: RawSection }[] | null;
  sally_message: string;
}

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.res;
  if (!getAnthropic()) return studioOffline();

  const body = (await req.json()) as ReviseBody;
  try {
    const result = await callStructured<ReviseResult>({
      model: SALLY_MODELS.revise,
      system: composeSystem("revise", 3, body.context),
      user: reviseTask({
        action: body.action,
        sectionLabel: body.section.label,
        note: body.note ?? null,
        missType: body.missType ?? null,
        sectionJson: JSON.stringify(body.section, null, 1),
      }),
      schema: REVISE_SCHEMA,
      thinking: true,
    });
    if (body.action === "alternatives" && !result.alternatives?.length) {
      throw new Error("No alternatives returned");
    }
    if (body.action !== "alternatives" && !result.section) {
      throw new Error("No revised section returned");
    }
    return Response.json(result);
  } catch (e) {
    console.error("[sally] revise", e);
    return Response.json(
      { error: "Sally dropped that one mid-flight — try the action again." },
      { status: 502 },
    );
  }
}
