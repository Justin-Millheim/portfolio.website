// POST /api/sally/draft — the Phase 2 silent generation pipeline (PRD §9.1):
//   draft → pre-draft self-audit → post-draft critical audit → deliver.
// Three chained calls on the draft-tier model. The intermediate steps are
// NEVER surfaced — the client gets NDJSON: coarse stage pings (so the
// "Sally is writing…" state can breathe) and then only the finished draft.
// Audit findings go to the server log for tuning Sally's Brain (PRD §13.3).

import { composeSystem, type SongContextInput } from "@/lib/sally/brain";
import { draftTask, preAuditTask, postAuditTask } from "@/lib/sally/brain/phases";
import { SALLY_MODELS } from "@/lib/sally/models";
import {
  DRAFT_SCHEMA, PRE_AUDIT_SCHEMA, POST_AUDIT_SCHEMA,
  callStructured, getAnthropic, requireUser, studioOffline,
} from "@/lib/sally/server";
import type { SectionKind } from "@/lib/sally/types";

export const maxDuration = 300;

interface DraftBody {
  context: SongContextInput; // must include the approved outline
}

interface RawSection {
  label: string;
  kind: SectionKind;
  delivery_cue: string | null;
  lines: string[];
}
interface DraftResult { title: string; sections: RawSection[] }
interface PreAuditResult extends DraftResult { findings: string[] }
interface PostAuditResult extends DraftResult {
  creative_notes: string[];
  weak_lines: { section: string; line: string; note: string }[];
  findings: string[];
  sally_message: string;
}

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.res;
  if (!getAnthropic()) return studioOffline();

  const body = (await req.json()) as DraftBody;
  if (!body.context?.outline) {
    return Response.json({ error: "Drafting is gated on an approved outline." }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const send = (controller: ReadableStreamDefaultController<Uint8Array>, obj: unknown) =>
    controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        send(controller, { t: "status", stage: 1 });
        const drafted = await callStructured<DraftResult>({
          model: SALLY_MODELS.draft,
          system: composeSystem("draft", 2, body.context),
          user: draftTask(),
          schema: DRAFT_SCHEMA,
          thinking: true,
        });

        send(controller, { t: "status", stage: 2 });
        const preAudited = await callStructured<PreAuditResult>({
          model: SALLY_MODELS.audit,
          system: composeSystem("pre_audit", 2, body.context),
          user: preAuditTask(JSON.stringify(drafted, null, 1)),
          schema: PRE_AUDIT_SCHEMA,
          thinking: true,
        });
        if (preAudited.findings?.length) console.log("[sally][pre-audit]", preAudited.findings);

        send(controller, { t: "status", stage: 3 });
        const final = await callStructured<PostAuditResult>({
          model: SALLY_MODELS.audit,
          system: composeSystem("post_audit", 2, body.context),
          user: postAuditTask(JSON.stringify({ title: preAudited.title, sections: preAudited.sections }, null, 1)),
          schema: POST_AUDIT_SCHEMA,
          thinking: true,
        });
        if (final.findings?.length) console.log("[sally][post-audit]", final.findings);

        send(controller, {
          t: "result",
          title: final.title,
          sections: final.sections,
          creativeNotes: final.creative_notes,
          weakLines: final.weak_lines,
          sallyMessage: final.sally_message,
        });
        send(controller, { t: "done" });
        controller.close();
      } catch (e) {
        console.error("[sally] draft pipeline", e);
        try {
          send(controller, { t: "error", message: "Sally hit a snag mid-draft — give it another go." });
          controller.close();
        } catch {
          controller.error(e);
        }
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
